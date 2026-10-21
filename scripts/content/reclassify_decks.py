#!/usr/bin/env python3
"""Rebuild semantic topics from the reviewed per-headword inventory, keeping ids."""
from __future__ import annotations
import json
from pathlib import Path
from review_decks import CONTENT, ROOT, headword

CATALOG = Path(__file__).with_name('de-topic-catalog.json')
ASSIGNMENTS = Path(__file__).with_name('de-topic-assignments.json')


def reclassify_decks() -> dict:
    config = json.loads(CATALOG.read_text())
    assignments = json.loads(ASSIGNMENTS.read_text())
    manifest_path = CONTENT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    total, moved, topics_total = 0, 0, 0
    seen = set()
    files = []
    for level in manifest['levels']:
        path = CONTENT / 'de' / level['file']
        payload = json.loads(path.read_text())
        buckets = {key: [] for key in config['topics']}
        # Stable order independent of old topic placement or reruns. Card ids
        # preserve source rank within the pre-reclassification v5 inventory.
        layout = json.loads((CONTENT / 'topic-map-v6.json').read_text())['fromDecks']
        old_order = {f'{deck}-{suffix:04d}': rank
                     for rank, (deck, suffix) in enumerate(
                         (deck, suffix) for deck, suffixes in layout.items() for suffix in suffixes)}
        cards = sorted(payload['cards'], key=lambda card: old_order[card['id']])
        for card in cards:
            key = headword(card['front'])
            if key in seen:
                raise ValueError(f'Duplicate headword: {card["front"]}')
            seen.add(key)
            if key not in assignments:
                raise ValueError(f'No reviewed category for {card["front"]}; review the new word first')
            category = assignments[key]
            if category not in buckets:
                raise ValueError(f'Unknown category: {category}')
            buckets[category].append(card)
        topics, classified = [], []
        for key, bucket in buckets.items():
            if not bucket:
                continue
            meta = config['topics'][key]
            size = config['maxTopicSize']
            parts = [bucket[i:i + size] for i in range(0, len(bucket), size)]
            for number, chunk in enumerate(parts, 1):
                topic_key = key if len(parts) == 1 else f'{key}-{number}'
                title = meta['title'] if len(parts) == 1 else f'{meta["title"]} ({number}/{len(parts)})'
                for card in chunk:
                    moved += card['topic'] != topic_key
                    card['topic'] = topic_key
                    card['tags'] = [key]
                    classified.append(card)
                topics.append(dict(id=f'de-{level["level"].lower()}-{topic_key}', key=topic_key,
                                   title=title, icon=meta['icon'], order=len(topics)+1, cardCount=len(chunk)))
        payload['cards'] = classified
        payload['topics'] = topics
        level['topics'] = topics
        total += len(classified)
        topics_total += len(topics)
        files.append((path, payload))
    unused = set(assignments) - seen
    if unused:
        raise ValueError(f'Assignments have unshipped words: {sorted(unused)}')
    for path, payload in files:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1)+'\n')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    result = dict(cards=total, topics=topics_total, movedCards=moved)
    print(json.dumps(result))
    return result


if __name__ == '__main__':
    reclassify_decks()
