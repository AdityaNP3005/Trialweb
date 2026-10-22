#!/usr/bin/env python3
"""Adds tone syllables, measure words, character breakdowns and example sentences
to the Mandarin (Traditional) cards.

Sources (see NOTICE.md):
- CC-CEDICT (CC BY-SA 4.0): measure words (CL:), per-character glosses, syllables.
- Make Me a Hanzi (LGPL / Arphic Public License data): radical of each character.
- Tatoeba (CC BY 2.0 FR): Traditional-script sentences (script tag "Hant"), their
  word-segmented pinyin, and human Indonesian/English translations (direct or via
  English).

Picks are stored per `front|pinyin` in `zh-enrichment.json`, so rebuilds need no
downloads. Run:
    python3 scripts/content/zh/zh-enrich.py                         (apply)
    python3 scripts/content/zh/zh-enrich.py CEDICT.gz MMAH.txt TATOEBA/   (refresh)
"""

from __future__ import annotations

import gzip
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "src" / "content" / "zh"
DATA_FILE = Path(__file__).with_name("zh-enrichment.json")
MAX_SENTENCE = 24  # Hanzi; long literary sentences are not useful on a card

MARKS = {"̄": 1, "́": 2, "̌": 3, "̀": 4}
CJK = re.compile(r"[㐀-鿿豈-﫿]")


def is_cjk(char: str) -> bool:
    return bool(CJK.fullmatch(char))


def strip_tone(syllable: str) -> tuple[str, int]:
    """'kè' → ('ke', 4); 'lǜ' → ('lü', 4); unmarked → tone 5 (neutral)."""
    tone = 5
    base = ""
    for char in unicodedata.normalize("NFD", syllable.lower()):
        if char in MARKS:
            tone = MARKS[char]
        elif char != "̈" or not base.endswith("u"):
            base += char
        else:
            base = base[:-1] + "ü"
    return base, tone


def numbered_to_marked(syllable: str) -> str:
    """CC-CEDICT/Tatoeba 'lu:4' / 'zhang1' → 'lǜ' / 'zhāng'."""
    match = re.fullmatch(r"([a-zü:v]+?)([1-5])?", syllable.lower())
    if not match:
        return syllable
    base = match.group(1).replace("u:", "ü").replace("v", "ü")
    tone = int(match.group(2) or 5)
    if tone == 5:
        return base
    mark = {1: "̄", 2: "́", 3: "̌", 4: "̀"}[tone]
    # Standard placement: a or e takes the mark, ou marks the o, else the last vowel.
    for vowel in ("a", "e"):
        if vowel in base:
            index = base.index(vowel)
            break
    else:
        index = base.index("o") if "ou" in base else max(base.rfind(v) for v in "iouü")
    return unicodedata.normalize("NFC", base[: index + 1] + mark + base[index + 1:])


def segment_pinyin(pinyin: str, count: int, inventory: set[str]) -> list[str] | None:
    """Splits written pinyin ('kètīng', "dà'ān", 'guójì guānxì') into exactly
    `count` syllables. Spaces, hyphens and apostrophes are hard boundaries."""
    chunks = [c for c in re.split(r"[\s'’·.…,\-]+", unicodedata.normalize("NFC", pinyin)) if c]
    memo: dict[tuple[int, int, int], list[str] | None] = {}

    def solve(chunk: int, start: int, left: int) -> list[str] | None:
        if chunk == len(chunks):
            return [] if left == 0 else None
        text = chunks[chunk]
        if start == len(text):
            return solve(chunk + 1, 0, left)
        if left == 0:
            return None
        key = (chunk, start, left)
        if key not in memo:
            memo[key] = None
            for end in range(min(len(text), start + 7), start, -1):  # longest first
                piece = text[start:end]
                marks = sum(1 for c in unicodedata.normalize("NFD", piece) if c in MARKS)
                if strip_tone(piece)[0] in inventory and marks <= 1:
                    rest = solve(chunk, end, left - 1)
                    if rest is not None:
                        memo[key] = [piece] + rest
                        break
        return memo[key]

    return solve(0, 0, count)


def read_cedict(path: Path):
    entries: dict[str, list[tuple[list[str], list[str]]]] = defaultdict(list)
    to_trad: dict[tuple[str, str], set[str]] = defaultdict(set)  # (simplified, pinyin) → traditional
    inventory = {"r", "ê"}
    nasal_only = {"n", "ng", "m", "hm", "hng"}  # 嗯/呣 interjections; would split "cānguān"
    line_re = re.compile(r"^(\S+) (\S+) \[([^\]]+)\] /(.+)/$")
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("#"):
                continue
            match = line_re.match(line.strip())
            if not match:
                continue
            trad, simp, pinyin, defs = match.groups()
            syllables = pinyin.lower().replace("u:", "ü").split()
            to_trad[(simp, " ".join(syllables))].add(trad)
            to_trad[(simp, "")].add(trad)
            for syllable in syllables:
                base = re.sub(r"[1-5]$", "", syllable).replace("u:", "ü")
                if base.isalpha() and base not in nasal_only:
                    inventory.add(base)
            # Capitalised pinyin marks a proper noun (書 Shu1 = Book of Documents).
            entries[trad].append((syllables, defs.split("/"), pinyin[:1].isupper()))
    return entries, inventory, to_trad


def toneless(syllables: list[str]) -> str:
    return "".join(re.sub(r"[1-5]$", "", s).replace("u:", "ü") for s in syllables)


def best_entry(entries, word: str, written_syllables: list[str] | None):
    # Common-noun readings before proper nouns, so 水 is "water", not an ethnic group.
    candidates = sorted(entries.get(word, []), key=lambda e: e[2])
    if not candidates:
        return None
    if written_syllables:
        wanted = "".join(strip_tone(s)[0] for s in written_syllables)
        same = [e for e in candidates if toneless(e[0]) == wanted]
        if same:
            # Prefer the reading with the same tones too (e.g. 長 cháng vs zhǎng).
            tones = [strip_tone(s)[1] for s in written_syllables]
            exact = [e for e in same if [int(s[-1]) if s[-1].isdigit() else 5 for s in e[0]] == tones]
            return (exact or same)[0]
    # Different Taiwan reading (垃圾 lèsè): only trust entries that are not surnames.
    return next((e for e in candidates if not e[1][0].startswith("surname")), candidates[0])


def measure_words(entries, word: str, syllables: list[str] | None) -> str | None:
    found: list[str] = []
    for _, defs, _ in [best_entry(entries, word, syllables)] if entries.get(word) else []:
        for definition in defs:
            if definition.startswith("CL:"):
                for item in definition[3:].split(","):
                    match = re.match(r"([^\[|]+)(?:\|[^\[]+)?\[([^\]]+)\]", item.strip())
                    if match:
                        char, reading = match.groups()
                        label = f"{char} {' '.join(numbered_to_marked(s) for s in reading.split())}"
                        if label not in found:
                            found.append(label)
    return " · ".join(found[:3]) or None


def short_gloss(defs: list[str]) -> str | None:
    useful = [
        d for d in defs
        if d and not d.startswith(("CL:", "variant of", "old variant", "surname", "used in", "see ", "Taiwan pr."))
    ]
    return "; ".join(useful[:2]) or None


def read_radicals(path: Path) -> dict[str, str]:
    radicals = {}
    for line in path.open(encoding="utf-8"):
        entry = json.loads(line)
        if entry.get("radical"):
            radicals[entry["character"]] = entry["radical"]
    return radicals


def read_tatoeba(folder: Path):
    def rows(name: str):
        for line in (folder / name).open(encoding="utf-8"):
            yield line.rstrip("\n").split("\t")

    def links(name: str) -> dict[int, list[int]]:
        table: dict[int, list[int]] = defaultdict(list)
        for left, right in rows(name):
            table[int(left)].append(int(right))
        return table

    # Each sentence has one Han transcription in the *other* script, generated by
    # Tatoeba: a "Hans" row means the sentence itself is Traditional, a "Hant" row
    # holds Tatoeba's Traditional conversion of a Simplified sentence.
    original_trad, auto_trad, latn = set(), {}, {}
    for parts in rows("cmn_transcriptions.tsv"):
        sid, script = int(parts[0]), parts[2]
        if script == "Hans":
            original_trad.add(sid)
        elif script == "Hant":
            auto_trad[sid] = parts[4]
        elif script == "Latn":
            latn[sid] = parts[4]
    texts = {int(p[0]): p[2] for p in rows("cmn_sentences.tsv")}
    cmn = {sid: texts[sid] for sid in original_trad if sid in texts}
    simplified = {sid: (texts[sid], auto_trad[sid]) for sid in auto_trad if sid in texts}
    ind = {int(p[0]): p[2] for p in rows("ind_sentences.tsv") if len(p) == 3}
    eng = {int(p[0]): p[2] for p in rows("eng_sentences.tsv") if len(p) == 3}
    return cmn, latn, ind, eng, links("cmn-ind_links.tsv"), links("cmn-eng_links.tsv"), links("eng-ind_links.tsv"), simplified


def sentence_words(text: str, pinyin: str) -> list[str] | None:
    """Uses Tatoeba's word-segmented pinyin to split the Hanzi into words."""
    hanzi = [c for c in text if is_cjk(c)]
    words, position = [], 0
    for token in pinyin.split():
        syllables = re.findall(r"[a-zü:v]+[1-5]", token.lower())
        if not syllables:
            continue
        words.append("".join(hanzi[position: position + len(syllables)]))
        position += len(syllables)
    return words if position == len(hanzi) else None


def simplified_only_chars(to_trad) -> set[str]:
    """Characters that CC-CEDICT only knows as Simplified forms (们, 会, 对)."""
    simp = {key[0] for key in to_trad if key[1] == "" and len(key[0]) == 1}
    trad = {t for (word, pin), forms in to_trad.items() if pin == "" and len(word) == 1 for t in forms}
    return simp - trad


def to_traditional(text: str, pinyin: str, to_trad) -> str | None:
    """Converts a Simplified sentence word by word. Each word must map to exactly one
    Traditional form for its pinyin in CC-CEDICT (发 → 發/髮 is resolved by the
    word, e.g. 头发 tou2 fa5 → 頭髮); otherwise the sentence is dropped."""
    hanzi_out: list[str] = []
    position = 0
    hanzi = [c for c in text if is_cjk(c)]
    for token in pinyin.split():
        syllables = re.findall(r"[a-zü:v]+[1-5]", token.lower().replace("u:", "ü").replace("v", "ü"))
        if not syllables:
            continue
        word = "".join(hanzi[position: position + len(syllables)])
        position += len(syllables)
        options = to_trad.get((word, " ".join(syllables))) or to_trad.get((word, ""), set())
        if len(options) != 1:
            if all(to_trad.get((c, ""), {c}) == {c} for c in word):
                options = {word}  # characters that are the same in both scripts
            else:
                return None
        hanzi_out += list(next(iter(options)))
    if position != len(hanzi) or len(hanzi_out) != len(hanzi):
        return None
    chars = iter(hanzi_out)
    return "".join(next(chars) if is_cjk(c) else c for c in text)


def pick_example(word: str, tatoeba, word_index, substring_pool, used):
    cmn, latn, ind, eng, cmn_ind, cmn_eng, eng_ind, converted = tatoeba
    if "..." in word or "…" in word:
        parts = [p for p in re.split(r"\.\.\.|…", word) if p]
        pattern = re.compile(".+?".join(map(re.escape, parts)))
        candidates = [sid for sid in substring_pool if pattern.search(cmn[sid])]
    elif len(word) >= 3:
        candidates = [sid for sid in substring_pool if word in cmn[sid]]
    else:
        candidates = word_index.get(word, [])  # whole-word match: 手 not inside 手機
    best = None
    for sid in candidates:
        direct = [ind[i] for i in cmn_ind.get(sid, ()) if i in ind]
        english = [e for e in cmn_eng.get(sid, ()) if e in eng]
        pivot = [ind[i] for e in english for i in eng_ind.get(e, ()) if i in ind]
        rank = 0 if direct else 1 if pivot else 2 if english else 3
        if rank == 3 or re.search(r"[A-Za-z]", cmn[sid]):
            continue  # Latin words (Facebook, Tom) distract from the Hanzi
        # Indonesian first, then short sentences; direct over pivot only as a tie-break.
        key = (rank == 2, used.get(sid, 0), len(cmn[sid]) // 6, rank, len(cmn[sid]), sid)
        if best is None or key < best[0]:
            best = (key, sid, (direct or pivot or [None])[0], eng[english[0]] if english else None, rank)
    if best is None:
        return None
    _, sid, example_id, example_en, rank = best
    used[sid] = used.get(sid, 0) + 1
    pinyin = " ".join(
        "".join(numbered_to_marked(s) for s in re.findall(r"[a-zü:v]+[1-5]", token.lower())) or token
        for token in latn.get(sid, "").split()
    )
    text = cmn[sid]
    if len(text) > 2 and text[0] in "\"“「" and text[-1] in "\"”」":
        text = text[1:-1]  # a few Tatoeba sentences are stored inside quote marks
    return {
        "exampleDe": text,
        "examplePinyin": re.sub(r" ([.,?!;:])", r"\1", pinyin) or None,
        "exampleId": example_id,
        "exampleEn": example_en,
        "exampleSource": f"tatoeba:{sid}" + (":pivot" if rank == 1 else "") + (":converted" if sid in converted else ""),
    }


def load_cards() -> list[dict]:
    return [card for path in sorted(OUT_DIR.glob("book*.json")) for card in json.loads(path.read_text())["cards"]]


def refresh(cedict: Path, mmah: Path, tatoeba_dir: Path) -> None:
    entries, inventory, to_trad = read_cedict(cedict)
    radicals = read_radicals(mmah)
    tatoeba = read_tatoeba(tatoeba_dir)
    cmn, latn = tatoeba[0], tatoeba[1]
    converted = set()
    for sid, (text, tatoeba_trad) in tatoeba[7].items():
        traditional = to_traditional(text, latn.get(sid, ""), to_trad)
        # Two independent conversions (CC-CEDICT per word, Tatoeba's own) must agree.
        if traditional and traditional == tatoeba_trad and sid not in cmn:
            cmn[sid] = traditional
            converted.add(sid)
    # Tatoeba's "Hant" tag is set per sentence by users and is sometimes wrong.
    simplified_only = simplified_only_chars(to_trad)
    mixed = [sid for sid, text in cmn.items() if any(c in simplified_only for c in text)]
    for sid in mixed:
        del cmn[sid]
    print(f"dibuang (berisi karakter sederhana): {len(mixed)}")
    tatoeba = (*tatoeba[:7], converted)
    print(f"kalimat tradisional: {len(cmn) - len(converted)} asli + {len(converted)} konversi per kata")
    word_index: dict[str, list[int]] = defaultdict(list)
    substring_pool = []
    for sid, text in cmn.items():
        if sum(1 for c in text if is_cjk(c)) > MAX_SENTENCE:
            continue
        substring_pool.append(sid)
        for word in set(sentence_words(text, latn.get(sid, "")) or []):
            word_index[word].append(sid)

    cards = load_cards()
    single = {(c["front"], c["pinyin"]): c for c in cards if len(c["front"]) == 1}
    result: dict[str, dict] = {}
    used: dict[int, int] = {}
    unsplit = []
    for card in sorted(cards, key=lambda c: len(word_index.get(c["front"], ()))):
        hanzi = [c for c in card["front"] if is_cjk(c)]
        entry: dict = {}
        parts = segment_pinyin(card["pinyin"], len(hanzi), inventory)
        if parts:
            entry["pinyinParts"] = parts
        else:
            unsplit.append(f"{card['front']} {card['pinyin']}")
        words = measure_words(entries, card["front"], parts)
        if words:  # CL: only appears on noun senses; wordType is unreliable here
            entry["measureWords"] = words
        if len(hanzi) > 1:
            breakdown = []
            for index, char in enumerate(hanzi):
                syllable = parts[index] if parts else None
                own = next((c for (f, p), c in single.items() if f == char and (not syllable or strip_tone(p)[0] == strip_tone(syllable)[0])), None)
                cedict_entry = best_entry(entries, char, [syllable] if syllable else None)
                breakdown.append({
                    "char": char,
                    "pinyin": syllable,
                    "meaningId": own["meaningId"] if own else None,
                    "meaningEn": short_gloss(cedict_entry[1]) if cedict_entry else None,
                    "radical": radicals.get(char),
                })
            entry["characters"] = breakdown
        example = pick_example(card["front"], tatoeba, word_index, substring_pool, used)
        if example:
            entry.update({k: v for k, v in example.items() if v})
        if entry:
            result[f"{card['front']}|{card['pinyin']}"] = entry
    DATA_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    print(f"zh-enrichment.json: {len(result)} kartu; pinyin tak terpecah: {len(unsplit)} {unsplit[:12]}")


def apply_enrichment() -> None:
    data = json.loads(DATA_FILE.read_text())
    filled: dict[str, int] = defaultdict(int)
    for path in sorted(OUT_DIR.glob("book*.json")):
        payload = json.loads(path.read_text())
        for card in payload["cards"]:
            for field, value in data.get(f"{card['front']}|{card['pinyin']}", {}).items():
                if field != "exampleSource" and not card.get(field):
                    card[field] = value
                    filled[field] += 1
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("diisi:", dict(filled))


def _self_check() -> None:
    inventory = {"ke", "ting", "da", "an", "guo", "ji", "guan", "xi", "xian", "zhe", "r", "lü", "ni", "hao"}
    assert segment_pinyin("kètīng", 2, inventory) == ["kè", "tīng"]
    assert segment_pinyin("dà'ān", 2, inventory) == ["dà", "ān"]
    assert segment_pinyin("guójì guānxì", 4, inventory) == ["guó", "jì", "guān", "xì"]
    assert segment_pinyin("xī'ān", 2, inventory) == ["xī", "ān"]
    assert segment_pinyin("zhèr", 2, inventory) == ["zhè", "r"]
    assert segment_pinyin("cānguān", 2, inventory | {"can", "cang", "u", "an"}) == ["cān", "guān"]
    assert segment_pinyin("chāo-shāng", 2, {"chao", "shang"}) == ["chāo", "shāng"]
    assert strip_tone("lǜ") == ("lü", 4) and strip_tone("ma") == ("ma", 5)
    assert [numbered_to_marked(s) for s in ("zhang1", "lu:4", "gou3", "liu2", "ge5")] == ["zhāng", "lǜ", "gǒu", "liú", "ge"]
    assert sentence_words("我沒有錢。", "wo3 mei2you3 qian2 .") == ["我", "沒有", "錢"]
    table = {("头发", "tou2 fa5"): {"頭髮"}, ("头发", ""): {"頭髮"}, ("发", ""): {"發", "髮"},
             ("我", ""): {"我"}, ("的", ""): {"的"}, ("头", ""): {"頭"}}
    assert to_traditional("我的头发。", "wo3 de5 tou2fa5 .", table) == "我的頭髮。"
    assert to_traditional("发。", "fa1 .", table) is None


if __name__ == "__main__":
    _self_check()
    if len(sys.argv) > 3:
        refresh(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
    apply_enrichment()
