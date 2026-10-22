#!/usr/bin/env python3
"""Build the Mandarin (traditional) course from a Pleco-style vocabulary export.

Input (not committed): `.content-cache/acc/pleco_dangdai.tsv`

    //當代中文/Book 1/L01-I
    你<TAB>nǐ<TAB>(N) you
    臺灣/台灣<TAB>Táiwān<TAB>Taiwan

Rules
- `L01-I` + `L01-II` are merged into chapter `l01` of book 1 (one session = one
  chapter, matching the classroom structure).
- Person names (dialogue characters, historical figures) are dropped; place
  names stay because they are taught in the chapters.
- Duplicate `hanzi|pinyin` entries keep the first occurrence; the rest is
  reported so nothing disappears silently.
- The English gloss is normalised (POS tag stripped, notes trimmed).
- Indonesian glosses live in `scripts/content/zh/id-glosses.jsonl`
  (`hanzi<TAB>pinyin<TAB>arti`); missing entries fall back to English and are
  counted in the report.

Output
- `src/content/zh/bookN.json` (chapters + cards)
- `src/content/zh/manifest.json`
- `src/content/zh/report.json`
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE = ROOT / ".content-cache" / "acc" / "pleco_dangdai.tsv"
OUT_DIR = ROOT / "src" / "content" / "zh"
GLOSSES = ROOT / "scripts" / "content" / "zh" / "id-glosses.jsonl"
PERSON_NAMES = ROOT / "scripts" / "content" / "zh" / "person-names.json"
CHAPTER_TITLES = ROOT / "scripts" / "content" / "zh" / "chapter-titles.json"

HEADER = re.compile(r"^//\s*當代中文\s*/\s*Book\s*(\d+)\s*/\s*L(\d+)\s*-?\s*([IV]*)")
POS_TAG = re.compile(r"^\(\s*[A-Za-z][A-Za-z0-9 ,./-]*\)\s*")
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
PERSON_GLOSS = re.compile(
    r"^(a|an)\s+(wo)?man\b|^(a|an)\s+(girl|boy)\b|name of (a|an)|"
    r"person'?s name|female person'?s name|male person'?s name|nickname",
    re.IGNORECASE,
)

WORD_TYPE_BY_POS = {
    "n": "noun",
    "v": "verb",
    "vi": "verb",
    "vt": "verb",
    "vst": "verb",
    "vpt": "verb",
    "vp": "verb",
    "vs": "adjective",
    "vs-pred": "adjective",
    "vs-attr": "adjective",
    "adv": "adverb",
    "m": "other",
    "ptc": "other",
    "conj": "other",
    "prep": "other",
    "det": "other",
    "id": "phrase",
    "ph": "phrase",
}


def slug(text: str) -> str:
    return "".join(
        ch
        for ch in unicodedata.normalize("NFKD", text)
        if ch.isascii() and ch.isalnum()
    )


def normalize_pinyin(raw: str) -> str:
    text = re.sub(r"\s+", " ", raw.replace("\u3000", " ")).strip()
    text = text.replace("u:", "ü").replace("v", "ü") if ":v" in text else text
    if not text:
        return ""
    return text[:1].lower() + text[1:]


def normalize_front(raw: str) -> str:
    text = raw.split("\t")[0].strip()
    text = text.split("/")[0].strip() if "/" in text else text
    text = re.sub(r"\s+", "", text)
    text = text.strip("。．.,、;；")
    return text


def split_gloss(raw: str) -> tuple[str, str]:
    """Returns (pos, gloss) with the leading textbook POS tag removed."""
    text = raw.strip()
    pos = ""
    match = POS_TAG.match(text)
    if match:
        pos = match.group(0).strip("() ").strip().lower()
        text = text[match.end() :].strip()
    # Some rows use "·" to separate the gloss from a long editorial note.
    text = text.split("·")[0].strip()
    text = re.sub(r"\s+", " ", text)
    return pos, clean_gloss(text)


def clean_gloss(text: str) -> str:
    """Keeps the core meaning: no parentheticals, no editorial notes, short.

    The textbook glosses contain long culture notes; a flashcard only needs the
    first sense. This also keeps the Indonesian translation set small.
    """
    original = text
    cleaned = re.sub(r"\([^)]*\)", " ", text)
    cleaned = cleaned.split(";")[0]
    cleaned = re.split(
        r"\blit\.|\bhere\b,|\be\.g\.,?|\bi\.e\.,?|\betc\.?", cleaned
    )[0]
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.-—")
    if len(cleaned) > 56:
        cleaned = cleaned[:56].rsplit(" ", 1)[0].strip(" ,.-—")
    if not cleaned:
        cleaned = re.sub(r"\s+", " ", original).strip()
    return cleaned


def is_person_name(front: str, gloss: str, blocklist: set[str]) -> bool:
    if front in blocklist:
        return True
    return bool(PERSON_GLOSS.search(gloss))


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def load_glosses(path: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not path.exists():
        return mapping
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        front, pinyin, meaning = parts[0].strip(), parts[1].strip(), parts[2].strip()
        mapping[f"{front}|{normalize_pinyin(pinyin)}"] = meaning
    return mapping


def load_english_glosses() -> dict[str, str]:
    """English gloss → Indonesian, split over `en-id-*.tsv` for reviewability."""
    mapping: dict[str, str] = {}
    for path in sorted(GLOSSES.parent.glob("en-id-*.tsv")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            english, meaning = parts[0].strip(), parts[1].strip()
            if english and meaning:
                mapping[unicodedata.normalize("NFC", english)] = meaning
    return mapping


def parse(source: Path, books: set[int], blocklist: set[str], keep_names: bool):
    sections: "OrderedDict[tuple[int, str], list[dict]]" = OrderedDict()
    current: tuple[int, str] | None = None
    stats = Counter()

    for raw_line in source.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip("\n")
        if not line.strip():
            continue
        if line.startswith("//"):
            match = HEADER.match(line.strip())
            if match:
                book = int(match.group(1))
                chapter = f"l{int(match.group(2)):02d}"
                current = (book, chapter)
                sections.setdefault(current, [])
            else:
                stats["unparsed_header"] += 1
            continue
        if current is None:
            stats["orphan_rows"] += 1
            continue

        parts = line.split("\t")
        front = normalize_front(parts[0] if parts else "")
        pinyin = normalize_pinyin(parts[1] if len(parts) > 1 else "")
        pos, gloss = split_gloss(parts[2] if len(parts) > 2 else "")

        if not front or not HAN.search(front):
            stats["non_hanzi_rows"] += 1
            continue
        if not gloss:
            stats["missing_gloss"] += 1
        if not pinyin:
            stats["missing_pinyin"] += 1
        if not keep_names and is_person_name(front, gloss, blocklist):
            stats["person_names_dropped"] += 1
            continue

        sections[current].append(
            {
                "front": front,
                "pinyin": pinyin,
                "meaningEn": gloss,
                "wordType": WORD_TYPE_BY_POS.get(pos, "other"),
                "pos": pos,
                "book": current[0],
                "chapter": current[1],
            }
        )

    # Drop books that were not requested before doing any dedupe work.
    for key in list(sections.keys()):
        if key[0] not in books:
            del sections[key]
    return sections, stats


def build(source: Path, books: set[int], require_id: bool) -> dict:
    blocklist = set(load_json(PERSON_NAMES, {"names": []}).get("names", []))
    titles = load_json(CHAPTER_TITLES, {"titles": {}}).get("titles", {})
    glosses = load_glosses(GLOSSES)
    english_glosses = load_english_glosses()

    sections, stats = parse(source, books, blocklist, keep_names=False)

    seen: dict[str, str] = {}
    duplicates: list[dict] = []
    missing_id: list[dict] = []
    books_out: dict[int, dict] = {}

    for (book, chapter), rows in sections.items():
        target = books_out.setdefault(
            book,
            {
                "courseId": "zh",
                "section": {
                    "id": f"book{book}",
                    "label": f"Buku {book}",
                    "title": f"當代中文課程 {book}",
                    "order": book,
                },
                "chapters": [],
                "cards": [],
            },
        )
        card_order = 0
        for row in rows:
            key = f"{row['front']}|{row['pinyin']}"
            if key in seen:
                duplicates.append(
                    {
                        "front": row["front"],
                        "pinyin": row["pinyin"],
                        "keptIn": seen[key],
                        "droppedFrom": f"book{book}/{chapter}",
                        "gloss": row["meaningEn"],
                    }
                )
                continue
            seen[key] = f"book{book}/{chapter}"

            meaning_id = glosses.get(key) or english_glosses.get(
                unicodedata.normalize("NFC", row["meaningEn"] or row["front"]), ""
            )
            if not meaning_id:
                missing_id.append(
                    {
                        "front": row["front"],
                        "pinyin": row["pinyin"],
                        "meaningEn": row["meaningEn"],
                        "where": f"book{book}/{chapter}",
                    }
                )

            card_order += 1
            target["cards"].append(
                {
                    "front": row["front"],
                    "pinyin": row["pinyin"] or None,
                    "meaningEn": row["meaningEn"] or row["front"],
                    "meaningId": meaning_id or row["meaningEn"] or row["front"],
                    "chapter": chapter,
                    "wordType": row["wordType"],
                    "tags": [] if not meaning_id else [],
                }
            )

        chapter_number = int(chapter[1:])
        chapter_title = (
            titles.get(f"book{book}/{chapter}")
            or f"Bab {chapter_number}"
        )
        count = sum(1 for card in target["cards"] if card["chapter"] == chapter)
        target["chapters"].append(
            {
                "id": f"zh-book{book}-{chapter}",
                "key": chapter,
                "title": chapter_title,
                "icon": f"{chapter_number:02d}",
                "order": chapter_number,
                "cardCount": count,
            }
        )

    for book, payload in books_out.items():
        payload["chapters"].sort(key=lambda item: item["order"])
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / f"book{book}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    manifest = {
        "version": 1,
        "courseId": "zh",
        "books": [
            {
                "id": f"book{book}",
                "label": f"Buku {book}",
                "title": f"當代中文課程 {book}",
                "order": book,
                "file": f"book{book}.json",
                "chapters": payload["chapters"],
            }
            for book, payload in sorted(books_out.items())
        ],
    }
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    report = {
        "source": str(source.relative_to(ROOT)),
        "books": sorted(books_out),
        "parsedRows": sum(len(rows) for rows in sections.values()),
        "cards": sum(len(p["cards"]) for p in books_out.values()),
        "perBook": {
            f"book{book}": {
                "chapters": len(payload["chapters"]),
                "cards": len(payload["cards"]),
            }
            for book, payload in sorted(books_out.items())
        },
        "duplicatesDropped": len(duplicates),
        "personNamesDropped": stats["person_names_dropped"],
        "missingPinyin": stats["missing_pinyin"],
        "missingGloss": stats["missing_gloss"],
        "nonHanziRows": stats["non_hanzi_rows"],
        "unparsedHeaders": stats["unparsed_header"],
        "missingIndonesian": len(missing_id),
        "missingIndonesianSample": missing_id[:40],
        "duplicateSample": duplicates[:40],
    }
    (OUT_DIR / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if require_id and missing_id:
        raise SystemExit(
            f"{len(missing_id)} kartu belum punya arti Indonesia. "
            "Tambahkan ke scripts/content/zh/id-glosses.jsonl "
            "(lihat report.json → missingIndonesianSample)."
        )
    return report


def apply_enrichment() -> None:
    """Re-applies tones, measure words, characters and examples (zh-enrich.py)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("zh_enrich", Path(__file__).with_name("zh-enrich.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.apply_enrichment()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Mandarin course decks")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--books", default="1,2,3,4")
    parser.add_argument(
        "--require-id",
        action="store_true",
        help="Fail when a card has no Indonesian gloss yet.",
    )
    args = parser.parse_args()

    books = {int(part) for part in args.books.split(",") if part.strip()}
    if not args.source.exists():
        raise SystemExit(
            f"File sumber tidak ditemukan: {args.source}\n"
            "Salin ekspor kosakata ke .content-cache/acc/pleco_dangdai.tsv lalu ulangi."
        )

    report = build(args.source, books, require_id=args.require_id)
    apply_enrichment()
    print(
        f"{report['cards']} kartu · {report['parsedRows']} baris · "
        f"duplikat {report['duplicatesDropped']} · "
        f"nama dibuang {report['personNamesDropped']} · "
        f"tanpa arti ID {report['missingIndonesian']}"
    )
    for book, info in report["perBook"].items():
        print(f"  {book}: {info['chapters']} bab, {info['cards']} kartu")


if __name__ == "__main__":
    main()
