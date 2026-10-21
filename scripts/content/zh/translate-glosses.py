#!/usr/bin/env python3
"""Translate the English glosses of the Mandarin cards into short Indonesian.

Reads the generated `src/content/zh/book*.json`, finds cards whose `meaningId`
is still the English fallback, asks Gemini (flash) for a short Indonesian gloss
and appends the result to `scripts/content/zh/id-glosses.jsonl`.

The key is read from `GEMINI_API_KEY` or from `.env.local` (never printed).

Usage:
    python3 scripts/content/zh/translate-glosses.py            # translate all
    python3 scripts/content/zh/translate-glosses.py --limit 60 # one batch (debug)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CONTENT = ROOT / "src" / "content" / "zh"
GLOSSES = ROOT / "scripts" / "content" / "zh" / "id-glosses.jsonl"
BATCH = 60


def read_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            match = re.match(r"^\s*GEMINI_API_KEY\s*=\s*(.+)$", line)
            if match:
                return match.group(1).strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY tidak ditemukan (env atau .env.local)")


def existing() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not GLOSSES.exists():
        return mapping
    for line in GLOSSES.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            mapping[f"{parts[0].strip()}|{parts[1].strip()}"] = parts[2].strip()
    return mapping


def pending(mapping: dict[str, str]) -> list[tuple[str, str, str]]:
    rows: dict[str, tuple[str, str, str]] = {}
    for path in sorted(CONTENT.glob("book*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for card in data.get("cards", []):
            key = f"{card['front']}|{card.get('pinyin') or ''}"
            if key in mapping or key in rows:
                continue
            rows[key] = (card["front"], card.get("pinyin") or "", card["meaningEn"])
    return list(rows.values())


def call_gemini(key: str, model: str, items: list[tuple[str, str, str]]) -> list[str]:
    numbered = "\n".join(
        f"{index + 1}. {english}" for index, (_, _, english) in enumerate(items)
    )
    prompt = (
        "You translate English vocabulary glosses from a Chinese textbook into "
        "Bahasa Indonesia for flashcards.\n"
        "Rules:\n"
        "- Output a JSON array of strings with exactly the same number of items, in order.\n"
        "- Each translation is short (1-4 words), lowercase, no trailing period.\n"
        "- Do not add 'to' for verbs; use the bare verb (e.g. 'datang', 'makan').\n"
        "- Keep proper nouns as they are (Taiwan, Jepang, Oolong).\n"
        "- If the gloss has several senses, join at most two with a comma.\n"
        "- Never explain, never add notes, never answer anything else.\n\n"
        f"Glosses:\n{numbered}"
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={key}"
    )
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.15,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = json.loads(response.read().decode("utf-8"))

    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    if isinstance(parsed, dict):
        parsed = [parsed[str(i)] for i in range(1, len(parsed) + 1)]
    if not isinstance(parsed, list) or len(parsed) != len(items):
        raise ValueError(f"jumlah terjemahan tidak cocok: {len(parsed)} vs {len(items)}")
    return [str(item).strip().rstrip(".") for item in parsed]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="max items (debug)")
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash")
    args = parser.parse_args()

    key = read_key()
    mapping = existing()
    todo = pending(mapping)
    if args.limit:
        todo = todo[: args.limit]

    print(f"{len(todo)} gloss belum diterjemahkan", flush=True)
    written = 0
    with GLOSSES.open("a", encoding="utf-8") as sink:
        for start in range(0, len(todo), BATCH):
            chunk = todo[start : start + BATCH]
            for attempt in range(4):
                try:
                    translations = call_gemini(key, args.model, chunk)
                    break
                except (urllib.error.HTTPError, urllib.error.URLError, ValueError, KeyError) as error:
                    wait = 5 * (attempt + 1)
                    print(f"  gagal ({error}); coba lagi dalam {wait}s", flush=True)
                    time.sleep(wait)
            else:
                print("  melewati batch ini", file=sys.stderr)
                continue

            for (front, pinyin, _), meaning in zip(chunk, translations):
                meaning = meaning.strip()
                if not meaning:
                    continue
                sink.write(f"{front}\t{pinyin}\t{meaning}\n")
                written += 1
            sink.flush()
            print(f"  {min(start + BATCH, len(todo))}/{len(todo)}", flush=True)
            time.sleep(0.4)

    print(f"selesai: {written} arti ditambahkan")


if __name__ == "__main__":
    main()
