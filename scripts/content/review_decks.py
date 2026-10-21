#!/usr/bin/env python3
"""Apply reviewed glosses and consolidate German headwords without renumbering IDs.

Run after build-decks.py, or directly against bundled decks. Synonyms remain separate
words; spelling variants and grammatical uses of the same word share one card.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / 'src/content'
OVERRIDES = Path(__file__).with_name('de-gloss-overrides.json')
VARIANTS = {
    'tschüs': 'tschüss', 'email': 'e-mail', 'photo': 'foto',
    'photographie': 'fotografie', 'photograph': 'fotograf',
    'geographie': 'geografie', 'phantasie': 'fantasie',
    'telephon': 'telefon', 'jogurt': 'joghurt',
    'portmonee': 'portemonnaie', 'saxofon': 'saxophon',
    'majonäse': 'mayonnaise',
}
LABELS = {
    'noun': ('benda', 'noun'), 'verb': ('kerja', 'verb'),
    'adjective': ('sifat', 'adjective'), 'adverb': ('keterangan', 'adverb'),
    'phrase': ('ungkapan', 'phrase'), 'number': ('angka', 'number'),
    'other': ('kata fungsi/seruan', 'function word/interjection'),
}


def headword(front: str) -> str:
    value = unicodedata.normalize('NFC', front).lower().strip()
    value = re.sub(r'^(der|die|das)\s+', '', value)
    value = re.sub(r'\s+', ' ', value).rstrip('.,!?;:')
    return VARIANTS.get(value, value)


def apply_gloss(card: dict, overrides: dict) -> None:
    for key in (card['front'], f"{card['front']}|{card['wordType']}"):
        card.update(overrides.get(key, {}))
    for field in ('meaningId', 'meaningEn'):
        # Source fragments such as "ibuprofen#Indonesia" are dictionary metadata.
        value = re.sub(r'#[^\s]+', '', card[field]).strip()
        parts = re.split(r'\s*[·;]\s*', value)
        unique = list(dict.fromkeys(part for part in parts if part))
        # Keep source formatting unless there really are repeated fragments.
        separator = ' · ' if '·' in value else '; '
        card[field] = separator.join(unique) if len(unique) != len(parts) else value


def combine(group: list[dict], field: str) -> str:
    language = 0 if field == 'meaningId' else 1
    unique = []
    seen = set()
    for card in group:
        meaning = card[field]
        # Identical meanings of nominalized numbers/colours need no repetition.
        key = meaning.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(card)
    if len(unique) == 1:
        return unique[0][field]
    return '; '.join(
        f"{card['front']} ({LABELS[card['wordType']][language]}): {card[field]}"
        for card in unique
    )


def review_decks() -> dict:
    manifest_path = CONTENT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    overrides = json.loads(OVERRIDES.read_text())
    groups: dict[str, list[dict]] = {}
    files = []
    aliases_path = CONTENT / 'de/review-aliases.json'
    aliases = json.loads(aliases_path.read_text()) if aliases_path.exists() else {}
    original_count = 0
    corrected = 0
    for level in manifest['levels']:
        path = CONTENT / 'de' / level['file']
        payload = json.loads(path.read_text())
        counters: Counter = Counter()
        for card in payload['cards']:
            counters[card['topic']] += 1
            card.setdefault('id', f"de-{level['level'].lower()}-{card['topic']}-{counters[card['topic']]:04d}")
            original_count += 1
            before = (card['meaningId'], card['meaningEn'])
            # Merged cards already contain reviewed, labelled senses. Reapplying
            # one sense's override would erase the others on the second run.
            if not card.get('reviewedSenses'):
                apply_gloss(card, overrides)
            corrected += before != (card['meaningId'], card['meaningEn'])
            groups.setdefault(headword(card['front']), []).append(card)
        files.append((path, payload, level))

    removed = set()
    merged = 0
    for group in groups.values():
        if len(group) < 2:
            continue
        survivor = group[0]  # earliest CEFR level, then original deck order
        for field in ('meaningId', 'meaningEn'):
            survivor[field] = combine(group, field)
            if len(survivor[field]) > 240:
                raise ValueError(f"Review merged gloss exceeds schema limit: {survivor['front']} / {field}")
        survivor['reviewedSenses'] = True
        merged += 1
        for duplicate in group[1:]:
            aliases[duplicate['id']] = survivor['id']
            removed.add(duplicate['id'])

    # Flatten chains when an earlier spelling variant becomes the survivor.
    for old_id, target in aliases.items():
        visited = {old_id}
        while target in aliases:
            if target in visited:
                raise ValueError('Cyclic review alias')
            visited.add(target)
            target = aliases[target]
        aliases[old_id] = target

    total = 0
    for path, payload, level in files:
        payload['cards'] = [card for card in payload['cards'] if card['id'] not in removed]
        for card in payload['cards']:
            card.update(overrides.get('@' + headword(card['front']), {}))
        counts = Counter(card['topic'] for card in payload['cards'])
        for topic in payload['topics']:
            topic['cardCount'] = counts[topic['key']]
            if not topic['cardCount']:
                raise ValueError(f"Topic became empty: {topic['id']}")
        level['topics'] = payload['topics']
        total += len(payload['cards'])
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    aliases_path.write_text(json.dumps(aliases, ensure_ascii=False, indent=2, sort_keys=True) + '\n')
    result = dict(before=original_count, after=total, mergedGroups=merged,
                  removed=len(removed), correctedCards=corrected, aliases=len(aliases))
    print(json.dumps(result))
    return result


if __name__ == '__main__':
    review_decks()
