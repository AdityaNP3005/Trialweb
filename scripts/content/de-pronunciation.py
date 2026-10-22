#!/usr/bin/env python3
"""Adds `readingId` (cara baca dengan ejaan Indonesia) to every German card.

Source of truth is IPA from the German Wiktionary (CC BY-SA 4.0, via the
wiktextract dump at kaikki.org), stored per card front in `de-ipa.json` so the
transcription can be reviewed. The IPA is respelled with Indonesian letter
values; see docs/GERMAN-PRONUNCIATION.md for the table and its references.

Run: python3 scripts/content/de-pronunciation.py            (apply de-ipa.json)
     python3 scripts/content/de-pronunciation.py DUMP.jsonl.gz  (refresh IPA first)
"""

from __future__ import annotations

import gzip
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src" / "content"
IPA_FILE = Path(__file__).with_name("de-ipa.json")

# Tokens missing from Wiktionary (inflected forms, loanwords), checked by hand.
MANUAL_IPA = {
    "guten": "ˈɡuːtn̩",
    "gute": "ˈɡuːtə",
    "pyjama": "pyˈd͡ʒaːma",
    "malware": "ˈmɛlˌvɛːɐ̯",
    "tschüss": "t͡ʃʏs",
    # Wiktionary has only a "…" placeholder for these; IPA per Duden spelling rules.
    "joel": "ˈjoːɛl",
    "kaleb": "ˈkaːlɛp",
    "oger": "ˈoːɡɐ",
    "para": "ˈpaːʁa",
    "saba": "ˈzaːba",
    "tael": "teːl",
    "constable": "ˈkanstəbl̩",
}

# Longest match first: affricates and diphthong-like pairs before single symbols.
CONSONANTS = {
    "t͡s": "ts", "t͡ʃ": "c", "d͡ʒ": "j", "p͡f": "pf", "d͡z": "dz",
    "ʃ": "sy", "ʒ": "j", "ç": "sy", "ɕ": "sy", "x": "kh", "χ": "kh",
    "ŋ": "ng", "ɡ": "g", "g": "g", "ʁ": "r", "r": "r", "ɾ": "r",
    "j": "y", "v": "w", "w": "w", "z": "z", "s": "s", "θ": "t", "ð": "d",
    "p": "p", "b": "b", "t": "t", "d": "d", "k": "k", "f": "f", "h": "h",
    "m": "m", "n": "n", "l": "l",
}
VOWELS = {
    "a": "a", "ɑ": "a", "ʌ": "a", "ɐ": "a", "æ": "é",
    "e": "é", "ɛ": "é", "ə": "e",
    "i": "i", "ɪ": "i", "y": "i", "ʏ": "i",
    "o": "o", "ɔ": "o", "ø": "e", "œ": "e",
    "u": "u", "ʊ": "u", "ɯ": "u",
}
SYMBOLS = sorted({**CONSONANTS, **VOWELS}, key=len, reverse=True)
DROP = set("ˈˌːˑ.‿̥̯̩̃̍͡()[]/ꜜ")
# Indonesian reads these pairs as one diphthong; mark German hiatus with '.
DIPHTHONGS = {"ai", "au", "oi", "ei", "éi"}
# Letter pairs that would be read as a different Indonesian digraph.
DIGRAPH_CLASH = {("n", "g"), ("n", "y"), ("k", "h"), ("s", "y")}


def respell(ipa: str) -> str:
    """IPA (Wiktionary style) → Indonesian respelling, lower case."""
    ipa = unicodedata.normalize("NFC", ipa).replace("\u00f5", "o\u0303")
    out: list[str] = []
    prev_kind = ""  # "v" vowel, "c" consonant, "" boundary
    i = 0
    while i < len(ipa):
        ch = ipa[i]
        if ch == " ":
            out.append(" ")
            prev_kind = ""
            i += 1
            continue
        if ch == "ʔ":
            if prev_kind == "v":
                out.append("'")
            i += 1
            continue
        symbol = next((s for s in SYMBOLS if ipa.startswith(s, i)), None)
        if symbol is None:
            if ch not in DROP:
                out.append(ch)  # punctuation such as … ? -
            i += 1
            continue
        i += len(symbol)
        marks = ""
        while i < len(ipa) and unicodedata.combining(ipa[i]) and ipa[i] != "͡":
            marks += ipa[i]
            i += 1
        if symbol in VOWELS:
            letter = VOWELS[symbol]
            nonsyllabic = "̯" in marks
            if symbol == "ɐ" and nonsyllabic and out and out[-1] == "a":
                continue  # [aːɐ̯] "gar" is a long a
            if prev_kind == "v" and not nonsyllabic and (out[-1][-1] + letter) in DIPHTHONGS:
                out.append("'")
            out.append(letter + ("ng" if "̃" in marks else ""))
            prev_kind = "v"
        else:
            letter = CONSONANTS[symbol]
            if "̩" in marks or "̍" in marks:
                letter = "e" + letter  # syllabic [n̩] in "guten" → "en"
            elif out and (out[-1][-1], letter[0]) in DIGRAPH_CLASH:
                out.append("-")
            out.append(letter)
            prev_kind = "c"
    return re.sub(r"\s+", " ", "".join(out)).strip()


def strip_ipa(raw: str) -> str:
    return raw.strip().strip("[]/").strip()


def lookup(token: str, table: dict[str, str]) -> str | None:
    for candidate in (token, token.lower(), token.capitalize()):
        if candidate in table:
            return strip_ipa(table[candidate])
    if token.lower() in MANUAL_IPA:
        return MANUAL_IPA[token.lower()]
    if "-" in token:
        parts = [lookup(part, table) for part in token.split("-") if part]
        if all(parts):
            return "-".join(parts)
    return None


def front_ipa(front: str, table: dict[str, str]) -> str | None:
    if front.lower() in MANUAL_IPA:
        return MANUAL_IPA[front.lower()]
    whole = lookup(front, table)
    if whole:
        return whole
    pieces = []
    for token in front.split():
        word = token.strip("?!.,…")
        if not word:
            pieces.append(token)
            continue
        ipa = lookup(word, table)
        if ipa is None:
            return None
        pieces.append(token.replace(word, ipa))
    return " ".join(pieces)


def load_fronts() -> list[str]:
    manifest = json.loads((CONTENT / "manifest.json").read_text())
    fronts = []
    for level in manifest["levels"]:
        payload = json.loads((CONTENT / "de" / level["file"]).read_text())
        fronts += [card["front"] for card in payload["cards"]]
    return fronts


def refresh_ipa(dump: Path) -> None:
    """Rebuilds de-ipa.json from a dewiktionary wiktextract dump."""
    table: dict[str, str] = {}
    with gzip.open(dump, "rt", encoding="utf-8") as handle:
        for line in handle:
            if '"lang_code": "de"' not in line or '"ipa"' not in line:
                continue
            entry = json.loads(line)
            # Wiktionary uses "…" as a placeholder for a missing transcription.
            ipas = [s["ipa"] for s in entry.get("sounds", []) if s.get("ipa", "").strip("[]/ …")]
            if entry.get("lang_code") == "de" and ipas:
                table.setdefault(entry["word"], ipas[0])
    result = {}
    for front in load_fronts():
        ipa = front_ipa(front, table)
        if ipa:
            result[front] = ipa
    IPA_FILE.write_text(
        json.dumps(result, ensure_ascii=False, indent=0, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"de-ipa.json: {len(result)} front")


def apply_pronunciation() -> None:
    table = json.loads(IPA_FILE.read_text())
    manifest = json.loads((CONTENT / "manifest.json").read_text())
    missing = []
    for level in manifest["levels"]:
        path = CONTENT / "de" / level["file"]
        payload = json.loads(path.read_text())
        for card in payload["cards"]:
            ipa = table.get(card["front"]) or MANUAL_IPA.get(card["front"].lower())
            if ipa:
                card["readingId"] = respell(ipa)
            else:
                missing.append(card["front"])
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
    print(f"cara baca: {len(missing)} kartu tanpa IPA {missing[:20]}")


def _self_check() -> None:
    cases = {
        "ˈvasɐ": "wasa",
        "bʁoːt": "brot",
        "ˈdaŋkə": "dangke",
        "ˈɡuːtn̩ ˈmɔʁɡn̩": "guten morgen",
        "haʊ̯s": "haus",
        "ˈhɔɪ̯tə": "hoite",
        "t͡ʃʏs": "cis",
        "ʃøːn": "syen",
        "ɪç": "isy",
        "buːx": "bukh",
        "t͡seːn": "tsén",
        "ɡaːɐ̯": "ga",
        "deːɐ̯": "déa",
        "ˈapfl̩": "apfel",
        "naˈiːf": "na'if",
        "bəˈʔaxtn̩": "be'akhten",
        "ˈanˌɡeːbn̩": "an-gében",
        "ʁɛstoˈʁɑ̃ː": "réstorang",
        "zaˈlõː": "zalong",
        "ɪnʒeˈni̯øːɐ̯": "injéniea",
    }
    for ipa, expected in cases.items():
        got = respell(ipa)
        assert got == expected, f"{ipa}: {got!r} != {expected!r}"


if __name__ == "__main__":
    _self_check()
    if len(sys.argv) > 1:
        refresh_ipa(Path(sys.argv[1]))
    apply_pronunciation()
