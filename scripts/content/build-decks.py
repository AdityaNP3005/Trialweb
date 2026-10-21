#!/usr/bin/env python3
"""Builds the bundled German decks (A1–C2) from open data.

Sources (both CC BY-SA 4.0, see NOTICE.md):
- Wikdict sqlite dictionaries DE→ID and DE→EN (derived from Wiktionary),
- FrequencyWords `de_50k.txt` for ordering by real-world frequency.

Run: python3 scripts/content/build-decks.py
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".content-cache"
CONTENT = ROOT / "src" / "content" / "de"
CURATED = CONTENT / "source" / "curated-a1.json"

LEVEL_SIZES = [
    ("A1", 600),
    ("A2", 1200),
    ("B1", 1800),
    ("B2", 2000),
    ("C1", 2400),
    ("C2", 2200),
]

# Minimum Wikdict score for the Indonesian gloss; below this the translation
# tends to be a noisy machine suggestion (see "Ruf" -> "bayang-bayang").
MIN_SCORE = 0.5
MAX_RANK = 50_000

# Wikdict part of speech (German) -> our word type.
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

LEXENTRY = re.compile(r"^[a-z]{2,3}/(?P<word>.+?)__(?P<pos>[A-Za-zÄÖÜäöüß_]+)__(?P<sense>\d+)$")


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
    """(word, pos) -> (score, best glosses ordered by wikdict score)."""
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


def main() -> int:
    for required in ("de-id.sqlite3", "de-en.sqlite3", "de_50k.txt"):
        if not (CACHE / required).exists():
            print(f"missing {CACHE / required}; run scripts/content/fetch-sources.sh", file=sys.stderr)
            return 1

    indo = load_translations(CACHE / "de-id.sqlite3")
    english = load_translations(CACHE / "de-en.sqlite3")
    frequency = load_frequency(CACHE / "de_50k.txt")

    curated = curated_cards()
    curated_keys = {(normalize(card["front"]), card.get("wordType", "other")) for card in curated}
    curated_lemmas = {normalize(card["front"]) for card in curated}

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
        en = en_entry[1]
        rank = frequency.get(word.lower(), MAX_RANK + 1)
        if rank > MAX_RANK:
            continue

        candidates.append(
            {
                "word": word,
                "rank": rank,
                "wordType": word_type,
                "meaningId": " · ".join(glosses),
                "meaningEn": " · ".join(en[:3]),
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

    decks: list[tuple[str, list[dict]]] = []
    cursor = 0
    for index, (level, size) in enumerate(LEVEL_SIZES):
        if level == "A1":
            cards = list(curated)
            while len(cards) < size and cursor < len(ordered):
                entry = ordered[cursor]
                cursor += 1
                cards.append(to_card(entry, level))
        else:
            cards = []
            while len(cards) < size and cursor < len(ordered):
                entry = ordered[cursor]
                cursor += 1
                cards.append(to_card(entry, level))
        decks.append((level, cards))

    manifest_decks = []
    for level, cards in decks:
        slug = f"{level.lower()}-core"
        deck_id = f"de-{slug}"
        file_name = f"{slug}.json"

        for position, card in enumerate(cards, start=1):
            card.setdefault("level", level)
            card["level"] = level

        payload = {
            "courseId": "de",
            "deck": {
                "slug": slug,
                "name": f"Deutsch {level} · Kosakata Inti",
                "description": deck_description(level),
                "level": level,
                "tags": [level.lower(), "kosakata", "inti"],
            },
            "cards": cards,
        }
        (CONTENT / file_name).write_text(
            json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        manifest_decks.append(
            {
                "id": deck_id,
                "file": file_name,
                "level": level,
                "name": payload["deck"]["name"],
                "description": payload["deck"]["description"],
                "tags": payload["deck"]["tags"],
                "cardCount": len(cards),
            }
        )
        print(f"{level}: {len(cards)} kartu -> {file_name}")

    manifest = {"courseId": "de", "decks": manifest_decks}
    (ROOT / "src" / "content" / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"total {sum(len(cards) for _, cards in decks)} kartu")
    return 0


def deck_description(level: str) -> str:
    return (
        f"Kata-kata Jerman level {level} yang paling sering muncul, diurutkan menurut frekuensi "
        "pemakaian nyata. Bebas duplikat dengan level di bawahnya."
    )


def to_card(entry: dict, level: str) -> dict:
    word_type = entry["wordType"]
    front = entry["word"]
    card = {
        "front": front,
        "meaningId": entry["meaningId"],
        "meaningEn": entry["meaningEn"],
        "wordType": word_type,
        "tags": [TAG_BY_POS.get(word_type, "dasar")],
        "level": level,
    }
    return card


if __name__ == "__main__":
    raise SystemExit(main())
