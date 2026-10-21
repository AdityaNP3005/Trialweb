#!/usr/bin/env python3
"""Builds the bundled German topic decks (A1–C2) from open data.

Sources (CC BY-SA 4.0, see NOTICE.md):
- Wikdict sqlite dictionaries DE→ID and DE→EN (derived from Wiktionary),
- FrequencyWords `de_50k.txt` for ordering by real-world frequency.

One file per level (`src/content/de/a1.json` … `c2.json`) contains the topic
list and every card with its `topic`. Deck ids look like `de-a1-greetings`.

Run: python3 scripts/content/build-decks.py
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path
from review_decks import review_decks

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".content-cache"
CONTENT = ROOT / "src" / "content" / "de"
CURATED = CONTENT / "source" / "curated-a1.json"
TOPICS = Path(__file__).resolve().parent / "topics.json"
PROPER_NAMES = Path(__file__).resolve().parent / "proper-names.json"

LEVEL_SIZES = [
    ("A1", 600),
    ("A2", 1200),
    ("B1", 1800),
    ("B2", 2000),
    ("C1", 2400),
    ("C2", 2200),
]

MAX_TOPIC_SIZE = 80
MIN_TOPIC_SIZE = 8

# Minimum Wikdict score for the Indonesian gloss; below this the translation
# tends to be a noisy machine suggestion (see "Ruf" -> "bayang-bayang").
MIN_SCORE = 0.5
MAX_RANK = 50_000

POS_MAP = {
    "Substantiv": "noun",
    "Verb": "verb",
    "Adjektiv": "adjective",
    "Adverb": "adverb",
    "Lokaladverb": "adverb",
    "Temporaladverb": "adverb",
    "Pronominaladverb": "adverb",
    "Konjunktionaladverb": "adverb",
    "Modaladverb": "adverb",
    "Interrogativadverb": "adverb",
    "Numerale": "number",
    "Interjektion": "other",
    "Grußformel": "phrase",
    "Redewendung": "phrase",
    "Wortverbindung": "phrase",
    "Präposition": "other",
    "Konjunktion": "other",
    "Subjunktion": "other",
    "Pronomen": "other",
    "Artikel": "other",
}

SKIP_POS = {
    "Eigenname",
    "Toponym",
    "Abkürzung",
    "Präfix",
    "Suffix",
    "Gebundenes_Lexem",
    "Ortsnamengrundwort",
    "Suffixoid",
    "Präfixoid",
}

TAG_BY_POS = {
    "noun": "benda",
    "verb": "kata-kerja",
    "adjective": "kata-sifat",
    "adverb": "kata-keterangan",
    "number": "angka",
    "phrase": "frasa",
    "other": "dasar",
}

LEXENTRY = re.compile(
    r"^[a-z]{2,3}/(?P<word>.+?)__(?P<pos>[A-Za-zÄÖÜäöüß_]+)__(?P<sense>\d+)$"
)


def clean_glosses(raw: str, limit: int = 3) -> list[str]:
    out: list[str] = []
    for part in raw.split("|"):
        value = part.strip()
        if not value or len(value) > 60:
            continue
        if value.lower() in {entry.lower() for entry in out}:
            continue
        out.append(value)
        if len(out) >= limit:
            break
    return out


def load_translations(path: Path) -> dict[tuple[str, str], tuple[float, list[str]]]:
    conn = sqlite3.connect(path)
    rows = conn.execute(
        "select lexentry, trans_list, score from translation where lexentry is not null"
    ).fetchall()
    conn.close()

    best: dict[tuple[str, str], tuple[float, list[str]]] = {}
    for lexentry, trans_list, score in rows:
        match = LEXENTRY.match(lexentry or "")
        if not match or not trans_list:
            continue
        pos = match.group("pos")
        if pos in SKIP_POS:
            continue
        key = (match.group("word"), pos)
        glosses = clean_glosses(trans_list)
        if not glosses:
            continue
        score = float(score or 0)
        previous = best.get(key)
        if previous is None or score > previous[0]:
            best[key] = (score, glosses)

    return best


def load_frequency(path: Path) -> dict[str, int]:
    ranks: dict[str, int] = {}
    with path.open(encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            word = line.split(" ", 1)[0].strip().lower()
            if word and word not in ranks:
                ranks[word] = index + 1
    return ranks


def normalize(front: str) -> str:
    return re.sub(r"^(der|die|das)\s+", "", front.strip().lower())


def curated_cards() -> list[dict]:
    data = json.loads(CURATED.read_text(encoding="utf-8"))
    return data["cards"]


class TopicIndex:
    def __init__(self, config: dict):
        self.catalog: dict = config["catalog"]
        self.bands: dict[str, list[str]] = config["bands"]
        self.tag_aliases: dict[str, str] = config.get("tagAliases", {})
        self._keywords = {
            key: {normalize(word) for word in entry.get("keywords", [])}
            for key, entry in self.catalog.items()
        }
        self._id_patterns = {
            key: [
                re.compile(rf"\b{re.escape(word.lower())}", re.IGNORECASE)
                for word in entry.get("idKeywords", [])
            ]
            for key, entry in self.catalog.items()
        }
        self._suffixes = {
            key: tuple(suffix.lower() for suffix in entry.get("suffixes", []))
            for key, entry in self.catalog.items()
        }
        self._fallbacks = {
            key: tuple(entry.get("fallbackWordTypes", []))
            for key, entry in self.catalog.items()
        }

    def topics_for(self, level: str) -> list[str]:
        return self.bands[level]

    def _matches_suffix(self, lemma: str, suffixes: tuple[str, ...]) -> bool:
        return any(
            len(lemma) > len(suffix) + 2 and lemma.endswith(suffix)
            for suffix in suffixes
        )

    def assign(self, level: str, card: dict, word_type: str) -> str:
        order = self.topics_for(level)

        for tag in card.get("tags", []):
            alias = self.tag_aliases.get(tag)
            if alias and alias in order:
                return alias

        lemma = normalize(card["front"])
        for key in order:
            if lemma in self._keywords.get(key, set()):
                return key

        meaning = card.get("meaningId", "")
        for key in order:
            if any(pattern.search(meaning) for pattern in self._id_patterns.get(key, [])):
                return key

        for key in order:
            if self._matches_suffix(lemma, self._suffixes.get(key, ())):
                return key

        for key in order:
            if word_type in self._fallbacks.get(key, ()):
                return key

        return "general"

    def meta(self, key: str) -> dict:
        return self.catalog[key]


def to_card(entry: dict, level: str) -> dict:
    word_type = entry["wordType"]
    return {
        "front": entry["word"],
        "meaningId": entry["meaningId"],
        "meaningEn": entry["meaningEn"],
        "wordType": word_type,
        "tags": [TAG_BY_POS.get(word_type, "dasar")],
        "level": level,
    }


def is_proper_name(
    word: str, meaning_id: str, meaning_en: str, names: set[str]
) -> bool:
    """Names are either listed explicitly or translate to themselves."""
    lemma = normalize(word)
    if lemma in names:
        return True
    first_id = normalize((meaning_id or "").split(" · ")[0])
    first_en = normalize((meaning_en or "").split(" · ")[0])
    return lemma == first_id and (not first_en or first_en == lemma)


def legacy_ids() -> dict[tuple[str, str], str]:
    """Old `de-<level>-core` card ids keyed by lemma + word type."""
    mapping: dict[tuple[str, str], str] = {}
    for path in sorted(CONTENT.glob("*-core.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        level = data["deck"]["level"]
        deck_id = f"de-{level.lower()}-core"
        for index, card in enumerate(data["cards"], start=1):
            key = (normalize(card["front"]), card.get("wordType", "other"))
            mapping.setdefault(key, f"{deck_id}-{index:04d}")
    return mapping


def current_topic_ids() -> dict[tuple[str, str], str]:
    """Card ids of the currently shipped topic decks (for progress remaps)."""
    mapping: dict[tuple[str, str], str] = {}
    for path in sorted(CONTENT.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        level = data.get("level")
        if not level or not isinstance(data.get("cards"), list):
            continue
        counters: dict[str, int] = {}
        for card in data["cards"]:
            topic = card.get("topic")
            if not topic:
                continue
            counters[topic] = counters.get(topic, 0) + 1
            key = (normalize(card["front"]), card.get("wordType", "other"))
            mapping.setdefault(key, card.get("id", f"de-{level.lower()}-{topic}-{counters[topic]:04d}"))
    return mapping


def split_topic(key: str, cards: list[dict], meta: dict) -> list[tuple[str, str, list[dict]]]:
    """Splits a topic larger than MAX_TOPIC_SIZE into numbered parts."""
    if len(cards) <= MAX_TOPIC_SIZE:
        return [(key, meta["title"], cards)]

    parts = [cards[i : i + MAX_TOPIC_SIZE] for i in range(0, len(cards), MAX_TOPIC_SIZE)]
    total = len(parts)
    return [
        (f"{key}-{index + 1}", f"{meta['title']} ({index + 1}/{total})", chunk)
        for index, chunk in enumerate(parts)
    ]


def main() -> int:
    for required in ("de-id.sqlite3", "de-en.sqlite3", "de_50k.txt"):
        if not (CACHE / required).exists():
            print(f"missing {CACHE / required}", file=sys.stderr)
            return 1

    config = json.loads(TOPICS.read_text(encoding="utf-8"))
    proper_names = {
        normalize(name)
        for name in json.loads(PROPER_NAMES.read_text(encoding="utf-8"))["names"]
    }
    index = TopicIndex(config)
    old_ids = legacy_ids()
    old_topic_ids = current_topic_ids()

    indo = load_translations(CACHE / "de-id.sqlite3")
    english = load_translations(CACHE / "de-en.sqlite3")
    frequency = load_frequency(CACHE / "de_50k.txt")

    curated = curated_cards()
    curated_keys = {
        (normalize(card["front"]), card.get("wordType", "other")) for card in curated
    }

    candidates: list[dict] = []
    for (word, pos), (score, glosses) in indo.items():
        if pos not in POS_MAP:
            continue
        word_type = POS_MAP[pos]
        key = (normalize(word), word_type)
        if key in curated_keys:
            continue
        if pos == "Substantiv" and not word[:1].isupper():
            continue
        if len(normalize(word)) < 2:
            continue
        if score < MIN_SCORE:
            continue

        en_entry = english.get((word, pos))
        if not en_entry:
            continue
        rank = frequency.get(word.lower(), MAX_RANK + 1)
        if rank > MAX_RANK:
            continue

        meaning_id = " · ".join(glosses)
        meaning_en = " · ".join(en_entry[1][:3])
        if is_proper_name(word, meaning_id, meaning_en, proper_names):
            continue

        candidates.append(
            {
                "word": word,
                "rank": rank,
                "wordType": word_type,
                "meaningId": meaning_id,
                "meaningEn": meaning_en,
            }
        )

    candidates.sort(key=lambda entry: (entry["rank"], entry["word"].lower()))
    seen: set[tuple[str, str]] = set(curated_keys)
    ordered: list[dict] = []
    for entry in candidates:
        key = (normalize(entry["word"]), entry["wordType"])
        if key in seen:
            continue
        seen.add(key)
        ordered.append(entry)

    manifest_levels = []
    migration: dict[str, str] = {}
    topic_remap: dict[str, str] = {}
    total_cards = 0

    cursor = 0
    for level_index, (level, size) in enumerate(LEVEL_SIZES, start=1):
        level_cards: list[dict] = []
        if level == "A1":
            level_cards.extend(
                dict(card)
                for card in curated
                if not is_proper_name(
                    card["front"],
                    card.get("meaningId", ""),
                    card.get("meaningEn", ""),
                    proper_names,
                )
            )
        while len(level_cards) < size and cursor < len(ordered):
            level_cards.append(to_card(ordered[cursor], level))
            cursor += 1

        buckets: dict[str, list[dict]] = {key: [] for key in index.topics_for(level)}
        for card in level_cards:
            word_type = card.get("wordType", "other")
            topic = index.assign(level, card, word_type)
            buckets.setdefault(topic, []).append(card)

        # Merge tiny topics into the general bucket so every session is useful.
        general = buckets.setdefault("general", [])
        for key in index.topics_for(level):
            if key == "general":
                continue
            if 0 < len(buckets[key]) < MIN_TOPIC_SIZE:
                general.extend(buckets[key])
                buckets[key] = []

        topics_payload = []
        cards_payload = []
        order = 0
        for key in index.topics_for(level):
            if not buckets.get(key):
                continue
            meta = index.meta(key)
            for deck_key, title, chunk in split_topic(key, buckets[key], meta):
                order += 1
                deck_id = f"de-{level.lower()}-{deck_key}"
                for position, card in enumerate(chunk, start=1):
                    card_id = f"{deck_id}-{position:04d}"
                    new_card = {
                        "front": card["front"],
                        "meaningId": card["meaningId"],
                        "meaningEn": card["meaningEn"],
                        "wordType": card["wordType"],
                        "tags": [deck_key],
                        "level": level,
                        "topic": deck_key,
                    }
                    for field in (
                        "gender",
                        "plural",
                        "ipa",
                        "exampleDe",
                        "exampleId",
                        "exampleEn",
                    ):
                        if card.get(field):
                            new_card[field] = card[field]
                    cards_payload.append(new_card)

                    old_key = (normalize(card["front"]), card["wordType"])
                    old_id = old_ids.get(old_key)
                    if old_id:
                        migration[old_id] = card_id
                    previous_id = old_topic_ids.get(old_key)
                    if previous_id:
                        topic_remap[previous_id] = card_id

                topics_payload.append(
                    {
                        "id": deck_id,
                        "key": deck_key,
                        "title": title,
                        "icon": meta.get("icon", "📚"),
                        "order": order,
                        "cardCount": len(chunk),
                    }
                )
                print(f"{level} · {deck_key:24s} {len(chunk):4d} kartu -> {deck_id}")

        payload = {
            "courseId": "de",
            "level": level,
            "topics": topics_payload,
            "cards": cards_payload,
        }
        file_name = f"{level.lower()}.json"
        (CONTENT / file_name).write_text(
            json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )

        manifest_levels.append(
            {
                "level": level,
                "order": level_index,
                "file": file_name,
                "topics": topics_payload,
            }
        )
        total_cards += len(cards_payload)

    manifest = {"version": 2, "courseId": "de", "levels": manifest_levels}
    (ROOT / "src" / "content" / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if migration:
        (ROOT / "src" / "content" / "migration-map.json").write_text(
            json.dumps(migration, ensure_ascii=False, indent=0, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    # Historical v3→v4 mappings remain necessary for dormant accounts. The
    # semantic v6 layout has its own migration snapshot and keeps card ids.
    topic_map_path = ROOT / "src" / "content" / "topic-map.json"
    if not topic_map_path.exists():
        topic_map_path.write_text(
            json.dumps(topic_remap, ensure_ascii=False, indent=0, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    for stale in CONTENT.glob("*-core.json"):
        stale.unlink()

    print(f"total {total_cards} kartu di {len(manifest_levels)} band")
    print(f"migration map: {len(migration)} id lama dipetakan")
    review_decks()
    from reclassify_decks import reclassify_decks
    reclassify_decks()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
