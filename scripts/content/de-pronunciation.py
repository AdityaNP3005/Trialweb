#!/usr/bin/env python3
"""Adds `readingId` (cara baca dengan ejaan Indonesia) to every German card.

Source of truth is IPA from the German Wiktionary (CC BY-SA 4.0, via the
wiktextract dump at kaikki.org), stored per card front in `de-ipa.json` so the
transcription can be reviewed. The IPA is respelled with Indonesian letter
values (EYD V) and split into syllables; see docs/GERMAN-PRONUNCIATION.md
for the table and its references.

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

# IPA → letters with their EYD V value (Badan Bahasa 2022): c=[tʃ], j=[dʒ], y=[j],
# kh=[x], ng=[ŋ], sy=[ʃ], ê=[ə]. EYD V says v is read [f], so German [v] is "w".
CONSONANTS = {
    "t͡s": "ts", "t͡ʃ": "c", "d͡ʒ": "j", "p͡f": "pf", "d͡z": "dz",
    "ʃ": "sy", "ʒ": "j", "ç": "h", "ɕ": "sy", "x": "kh", "χ": "kh",
    "ŋ": "ng", "ɡ": "g", "g": "g", "ʁ": "r", "r": "r", "ɾ": "r",
    "j": "y", "v": "w", "w": "w", "z": "z", "s": "s", "θ": "t", "ð": "d",
    "p": "p", "b": "b", "t": "t", "d": "d", "k": "k", "f": "f", "h": "h",
    "m": "m", "n": "n", "l": "l",
}
VOWELS = {
    "a": "a", "ɑ": "a", "ʌ": "a", "ɐ": "a", "æ": "e",
    "e": "e", "ɛ": "e", "ə": "ê",
    # ü/ö have no Indonesian letter: tongue of i/e + lips of u/o, written as one
    # nucleus that is never hyphenated (see docs/GERMAN-PRONUNCIATION.md).
    "i": "i", "ɪ": "i", "y": "iu", "ʏ": "iu",
    "o": "o", "ɔ": "o", "ø": "eo", "œ": "eo",
    "u": "u", "ʊ": "u", "ɯ": "u",
}
SYMBOLS = sorted({**CONSONANTS, **VOWELS}, key=len, reverse=True)
BOUNDARY = set("ˈˌʔ.")  # Wiktionary marks stressed-syllable starts and glottal onsets
DROP = set("ːˑ‿̥̯̩̃̍͡()[]/ꜜ")
DIGRAPHS = {"kh", "ng", "ny", "sy"}  # EYD V: one sound, never split
# Consonant clusters German allows at the start of a syllable (letters per unit).
LEGAL_ONSETS = {
    tuple(onset.split())
    for onset in (
        "p l|p r|b l|b r|t r|d r|k l|k r|k n|k w|g l|g r|g n|f l|f r|w r|"
        "pf l|pf r|ts w|sy l|sy m|sy n|sy r|sy w|sy t|sy p|sy t r|sy p r|sy p l|"
        "s k|s l|s m|s n|s p|s t|s w|s f|p s|t w|s t r|s k r|s p r"
    ).split("|")
}


def _units(word: str) -> list[tuple[str, str]]:
    """Splits one IPA word into (kind, letters): V nucleus, C consonant, B boundary."""
    units: list[tuple[str, str]] = []
    i = 0
    while i < len(word):
        ch = word[i]
        if ch in BOUNDARY:
            units.append(("B", ""))
            i += 1
            continue
        symbol = next((s for s in SYMBOLS if word.startswith(s, i)), None)
        if symbol is None:
            if ch not in DROP:
                units.append(("P", ch))  # punctuation such as … ? -
            i += 1
            continue
        i += len(symbol)
        marks = ""
        while i < len(word) and unicodedata.combining(word[i]) and word[i] != "͡":
            marks += word[i]
            i += 1
        if symbol in VOWELS:
            letter = VOWELS[symbol] + ("ng" if "̃" in marks else "")
            if "̯" in marks and units and units[-1][0] == "V":
                # Second half of a diphthong or vocalic r: [aɪ̯] ai, [iːɐ̯] ia.
                if symbol in ("y", "ʏ"):
                    letter = "i"  # [ɔʏ̯] eu/äu is the EYD V diphthong oi
                if not (symbol == "ɐ" and units[-1][1].endswith("a")):
                    units[-1] = ("V", units[-1][1] + letter)
                continue
            units.append(("V", letter))
        else:
            letter = CONSONANTS[symbol]
            if "̩" in marks or "̍" in marks:
                units.append(("V", "ê"))  # syllabic [n̩] in "guten" → tên
            units.append(("C", letter))
    return units


def _syllabify(units: list[tuple[str, str]]) -> str:
    """Joins units into syllables with EYD V pemenggalan rules (C.1.a–g)."""
    nuclei = [k for k, (kind, _) in enumerate(units) if kind == "V"]
    cuts = set()
    for left, right in zip(nuclei, nuclei[1:]):
        middle = range(left + 1, right)
        marks = [k for k in middle if units[k][0] == "B"]
        cons = [k for k in middle if units[k][0] == "C"]
        if not cons:
            cuts.add(marks[-1] if marks else right)  # ma-in
            continue
        if marks:
            cut = sum(1 for k in cons if k < marks[-1])  # Wiktionary's syllable start
        else:
            cut = 0 if len(cons) == 1 else 1  # ba-pak, ban-tu, am-bruk
        onset = lambda c: tuple(units[k][1] for k in cons[c:])
        while len(cons) - cut > 1 and onset(cut) not in LEGAL_ONSETS:
            cut += 1  # [ˈɛksaːmən] ek-sa-mên, not e-ksa-mên
        cuts.add(cons[cut] if cut < len(cons) else right)
    out = ""
    for k, (kind, letters) in enumerate(units):
        if k in cuts and out:
            out += "-"
        elif kind == "C" and (out[-1:] + letters[:1]) in DIGRAPHS:
            out += "-"  # n+g, s+y inside a syllable would read as one sound
        out += letters
    return out


def respell(ipa: str) -> str:
    """IPA (Wiktionary style) → Indonesian respelling with syllable hyphens."""
    ipa = unicodedata.normalize("NFC", ipa).replace("\u00f5", "o\u0303")
    words = [_syllabify(_units(word)) for word in ipa.split()]
    return " ".join(word.strip("-") for word in words if word)


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
        "ˈvasɐ": "wa-sa",
        "bʁoːt": "brot",
        "ˈdaŋkə": "dang-kê",
        "ˈɡuːtn̩ ˈmɔʁɡn̩": "gu-tên mor-gên",
        "haʊ̯s": "haus",
        "ˈhɔɪ̯tə": "hoi-tê",
        "t͡ʃʏs": "cius",
        "ʃøːn": "syeon",
        "ʃoːn": "syon",
        "ˈmyːdə": "miu-dê",
        "ˈyːbɐ": "iu-ba",
        "t͡svœlf": "tsweolf",
        "ˈhøːʁən": "heo-rên",
        "ˈʃʏt͡sn̩": "syiu-tsên",
        "tyːɐ̯": "tiua",
        "ɪç": "ih",
        "buːx": "bukh",
        "t͡seːn": "tsen",
        "ɡaːɐ̯": "ga",
        "fiːɐ̯": "fia",
        "ˈapfl̩": "ap-fêl",
        "naˈiːf": "na-if",
        "bəˈʔaxtn̩": "bê-akh-tên",
        "ˈanˌɡeːbn̩": "an-ge-bên",
        "ʁɛstoˈʁɑ̃ː": "res-to-rang",
        "ʃtaˈt͡si̯oːn": "syta-tsi-on",
        "ˈkʁaŋkhaɪ̯t": "krangk-hait",
        "ɛˈksaːmən": "ek-sa-mên",
        "ˈfɛstʃtɛlʊŋ": "fest-syte-lung",
        "ˈhaɪ̯t͡sʊŋ": "hai-tsung",
        "ˈhɔɪ̯ptlɪŋ": "hoipt-ling",
        "ɛntˈʃʊldɪɡʊŋ": "ent-syul-di-gung",
        "vaɪ̯n": "wain",
        "ˈaɪ̯nˌkaʊ̯fn̩": "ain-kau-fên",
    }
    for ipa, expected in cases.items():
        got = respell(ipa)
        assert got == expected, f"{ipa}: {got!r} != {expected!r}"


if __name__ == "__main__":
    _self_check()
    if len(sys.argv) > 1:
        refresh_ipa(Path(sys.argv[1]))
    apply_pronunciation()
