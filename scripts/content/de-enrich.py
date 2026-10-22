#!/usr/bin/env python3
"""Fills noun gender/plural and an example sentence for German cards that lack them.

Sources (see NOTICE.md):
- German Wiktionary via the wiktextract dump (CC BY-SA 4.0): gender, nominative
  plural, inflected forms (to find the word inside sentences), fallback examples.
- Tatoeba (CC BY 2.0 FR): short everyday sentences with human translations.
  Indonesian comes from a direct deu–ind link, or via the English translation
  (deu–eng–ind) when no direct link exists.

The picks are stored in `de-enrichment.json` so rebuilds need no downloads and the
data can be reviewed. Existing values (curated A1 cards) are never overwritten.

Run: python3 scripts/content/de-enrich.py                       (apply de-enrichment.json)
     python3 scripts/content/de-enrich.py DUMP.jsonl.gz TATOEBA_DIR  (refresh first)
"""

from __future__ import annotations

import gzip
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src" / "content"
DATA_FILE = Path(__file__).with_name("de-enrichment.json")

GENDER_TAGS = {"masculine": "der", "feminine": "die", "neuter": "das"}
ARTICLE = re.compile(r"^(der|die|das)\s+")
WORD = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
# Table rows that name a different word (Berater for Beraterin, U for Spannung).
SKIP_FORM_TAGS = {"symbol", "masculine", "feminine", "neuter", "diminutive", "auxiliary", "abbreviation",
                  "imperative"}  # imperative "wach!" equals the adjective wach
HEAD = re.compile(r'^\{"word": ("(?:[^"\\]|\\.)*")')
# Auxiliaries, pronouns and particles that appear inside inflection tables
# ("gegangen sein", "ich gehe", "rufe an") but are not forms of the headword.
NOT_FORMS = set(
    "ich du er sie es wir ihr man sein bin bist ist sind seid war waren sei seien wäre "
    "haben habe hast hat habt hatte hätte werden werde wirst wird werdet wurde würde "
    "zu am an auf aus ab ein mit vor nach zurück weg her hin los fest bei um durch "
    "über unter wieder dar fort heim mehr meisten der die das des dem den".split()
)
# A verb sentence ending in one of these is usually a separable verb
# ("Wachen Sie auf!" is aufwachen, not wachen).
PARTICLES = set("an auf aus ab ein mit vor zu zurück weg los fest nach her hin bei um durch".split())
MAX_WORDS = 12
MAX_CHARS = 90


def headword(front: str) -> str:
    return ARTICLE.sub("", front).strip()


def fold(text: str) -> str:
    return text.lower().translate(str.maketrans({"ä": "a", "ö": "o", "ü": "u", "ß": "ss"}))


def same_stem(form: str, word: str) -> bool:
    """Keeps inflections (Tische, konstruierte), drops other words in the table
    (worden, eine) and separable-verb pieces (fällt in "fällt über").
    shortcut: drops strong-verb stems like ging for gehen; the infinitive and
    regular forms usually still find a sentence."""
    return fold(form)[:3] == fold(word)[:3]


def level_files() -> list[Path]:
    manifest = json.loads((CONTENT / "manifest.json").read_text())
    return [CONTENT / "de" / level["file"] for level in manifest["levels"]]


def read_wiktionary(dump: Path, words: set[str]) -> dict[str, dict]:
    """Per word: gender (first noun entry), plural, forms, short example sentences."""
    info: dict[str, dict] = {}
    with gzip.open(dump, "rt", encoding="utf-8") as handle:
        for line in handle:
            if '"lang_code": "de"' not in line:
                continue
            head = HEAD.match(line)
            if not head or json.loads(head.group(1)) not in words:
                continue
            entry = json.loads(line)
            if entry.get("lang_code") != "de":
                continue
            word = entry["word"]
            item = info.setdefault(word, {"forms": set(), "examples": [], "pos": {}})
            pos = entry.get("pos", "")
            for form in entry.get("forms", []):
                text = form.get("form", "")
                if SKIP_FORM_TAGS & set(form.get("tags", [])):
                    continue
                item["forms"].update(
                    t for t in WORD.findall(text) if t.lower() not in NOT_FORMS and same_stem(t, word)
                )
            if pos == "noun" and "noun" not in item["pos"]:
                gender = next((GENDER_TAGS[t] for t in entry.get("tags", []) if t in GENDER_TAGS), None)
                plurals = [
                    f["form"].strip() for f in entry.get("forms", [])
                    if {"nominative", "plural"} <= set(f.get("tags", []))
                    and f.get("form", "").strip("—– ") and not f["form"].startswith("keine ")
                ]
                # Adjectival nouns list "Angestellte" (strong) and "die Angestellten";
                # the form after "die" is the one learned with the article.
                plurals.sort(key=lambda form: not form.startswith("die "))
                plural = ("die " + ARTICLE.sub("", plurals[0])) if plurals else None
                item["pos"]["noun"] = {"gender": gender, "plural": plural}
            for sense in entry.get("senses", []):
                for example in sense.get("examples", []):
                    text = example.get("text", "").strip()
                    # Constructed examples have no "ref"; quotations are often archaic.
                    if text and "ref" not in example and len(text) <= MAX_CHARS:
                        item["examples"].append(text)
    return info


def read_tatoeba(folder: Path) -> tuple[dict[int, str], dict[int, str], dict[int, str], dict, dict, dict]:
    def sentences(name: str) -> dict[int, str]:
        rows = {}
        for line in (folder / name).open(encoding="utf-8"):
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 3:
                rows[int(parts[0])] = parts[2]
        return rows

    def links(name: str) -> dict[int, list[int]]:
        table: dict[int, list[int]] = defaultdict(list)
        for line in (folder / name).open(encoding="utf-8"):
            left, right = line.split()
            table[int(left)].append(int(right))
        return table

    return (
        sentences("deu_sentences.tsv"),
        sentences("ind_sentences.tsv"),
        sentences("eng_sentences.tsv"),
        links("deu-ind_links.tsv"),
        links("deu-eng_links.tsv"),
        links("eng-ind_links.tsv"),
    )


def pick_example(forms: set[str], is_noun: bool, is_verb: bool, word: str, index: dict[str, list[int]], tatoeba, used: dict[int, int]):
    deu, ind, eng, deu_ind, deu_eng, eng_ind = tatoeba
    # Index keys: "Tisch" inside a sentence, "^Tisch" as its first word, where any
    # word is capitalized. Nouns: exact forms inside, only the headword at the start
    # ("Küssen Sie Tom!" is a verb). Others: lower-case inside, capitalized at the start.
    if is_noun:
        keys = set(forms) | {"^" + word}
    else:
        keys = {f for f in forms if f.islower()} | {"^" + f[:1].upper() + f[1:] for f in forms if f.islower()}
    candidates = {sid for form in keys for sid in index.get(form, ())}
    best = None
    for sid in candidates:
        text = deu[sid]
        if is_verb and WORD.findall(text)[-1].lower() in PARTICLES:
            continue
        direct = [ind[i] for i in deu_ind.get(sid, ()) if i in ind]
        english = [e for e in deu_eng.get(sid, ()) if e in eng]
        pivot = [ind[i] for e in english for i in eng_ind.get(e, ()) if i in ind]
        rank = 0 if direct else 1 if pivot else 2 if english else 3
        if rank == 3:
            continue
        key = (rank, used.get(sid, 0), len(text), sid)
        if best is None or key < best[0]:
            best = (key, sid, (direct or pivot or [None])[0], eng[english[0]] if english else None, rank)
    if best is None:
        return None
    _, sid, example_id, example_en, rank = best
    used[sid] = used.get(sid, 0) + 1
    return {
        "exampleDe": deu[sid],
        "exampleId": example_id,
        "exampleEn": example_en,
        "exampleSource": f"tatoeba:{sid}" + (":pivot" if rank == 1 else ""),
    }


def refresh(dump: Path, tatoeba_dir: Path) -> None:
    cards = [card for path in level_files() for card in json.loads(path.read_text())["cards"]]
    words = {headword(card["front"]) for card in cards}
    wiki = read_wiktionary(dump, words)
    tatoeba = read_tatoeba(tatoeba_dir)
    index: dict[str, list[int]] = defaultdict(list)
    for sid, text in tatoeba[0].items():
        tokens = WORD.findall(text)
        if 3 <= len(tokens) <= MAX_WORDS and len(text) <= MAX_CHARS:
            for position, token in enumerate(tokens):
                index[("^" if position == 0 else "") + token].append(sid)

    result: dict[str, dict] = {}
    used: dict[int, int] = {}
    # Rarer words first so common sentences are not spent on frequent words.
    order = sorted(cards, key=lambda card: len(index.get(headword(card["front"]), ())) + len(index.get("^" + headword(card["front"]), ())))
    for card in order:
        word = headword(card["front"])
        item = wiki.get(word, {"forms": set(), "examples": [], "pos": {}})
        entry: dict = {}
        noun = item["pos"].get("noun")
        if card["wordType"] == "noun" and noun:
            entry.update({k: v for k, v in noun.items() if v})
        if not card.get("exampleDe") and " " not in word:
            forms = {word} | item["forms"]
            example = pick_example(
                forms, card["wordType"] == "noun", card["wordType"] == "verb", word, index, tatoeba, used
            )
            if example is None:
                pattern = re.compile(rf"\b({'|'.join(map(re.escape, sorted(forms, key=len, reverse=True)))})\b")
                wiki_example = next((t for t in item["examples"] if pattern.search(t)), None)
                if wiki_example:
                    example = {"exampleDe": wiki_example, "exampleSource": "wiktionary"}
            if example:
                entry.update({k: v for k, v in example.items() if v})
        if entry:
            result[card["id"]] = entry
    DATA_FILE.write_text(
        json.dumps(result, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"de-enrichment.json: {len(result)} kartu")


def apply_enrichment() -> None:
    data = json.loads(DATA_FILE.read_text())
    filled = defaultdict(int)
    for path in level_files():
        payload = json.loads(path.read_text())
        for card in payload["cards"]:
            for field, value in data.get(card["id"], {}).items():
                if field == "exampleSource":
                    continue
                if field == "gender" and ARTICLE.match(card["front"]):
                    continue  # curated front already carries its article
                if not card.get(field):
                    card[field] = value
                    filled[field] += 1
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("diisi:", dict(filled))


if __name__ == "__main__":
    if len(sys.argv) > 2:
        refresh(Path(sys.argv[1]), Path(sys.argv[2]))
    apply_enrichment()
