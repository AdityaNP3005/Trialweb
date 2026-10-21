#!/usr/bin/env python3
"""Audit every semantic topic against the complete pre-reclassification inventory."""
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from review_decks import ROOT, headword
from reclassify_decks import CATALOG, ASSIGNMENTS

baseline = 'bd0e4f9'
catalog = json.loads(CATALOG.read_text())
assignments = json.loads(ASSIGNMENTS.read_text())
layout = json.loads((ROOT/'src/content/topic-map-v6.json').read_text())['fromDecks']
old, current, levels = {}, {}, []
for level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2'):
    name = f'src/content/de/{level}.json'
    before = json.loads(subprocess.check_output(['git', 'show', f'{baseline}:{name}'], cwd=ROOT))
    after = json.loads((ROOT/name).read_text())
    assert len(before['cards']) == len(after['cards'])
    old.update({card['id']: card for card in before['cards']})
    for card in after['cards']:
        assert card['id'] not in current, f'Duplicate id: {card["id"]}'
        assert card['level'].lower() == level
        theme = re.sub(r'-\d+$', '', card['topic'])
        assert theme == assignments[headword(card['front'])], card['front']
        assert card['tags'] == [theme]
        current[card['id']] = card
    counts = Counter(card['topic'] for card in after['cards'])
    for topic in after['topics']:
        assert counts[topic['key']] == topic['cardCount']
        assert 0 < topic['cardCount'] <= 80
    levels.append(dict(level=level.upper(), cards=len(after['cards']),
                       previousTopics=len(before['topics']), currentTopics=len(after['topics'])))
assert set(old) == set(current)
assert len({headword(card['front']) for card in current.values()}) == len(current)
assert set(assignments) == {headword(card['front']) for card in current.values()}
for key, card in current.items():
    assert {k: v for k, v in card.items() if k not in ('topic', 'tags')} == {
        k: v for k, v in old[key].items() if k not in ('topic', 'tags')}, f'Changed card content/id: {key}'
old_layout = {}
for card in old.values():
    old_layout.setdefault(f"de-{card['level'].lower()}-{card['topic']}", []).append(int(card['id'].rsplit('-',1)[1]))
assert layout == old_layout, 'Migration source layout differs from the actual v5 decks'
report = dict(baselineCommit=baseline, cardsReviewed=len(current),
              movedCards=sum(old[key]['topic'] != card['topic'] for key,card in current.items()),
              categories=len(catalog['topics']), previousTopics=sum(row['previousTopics'] for row in levels),
              currentTopics=sum(row['currentTopics'] for row in levels),
              previousGeneralCards=sum(card['topic'].startswith('general') for card in old.values()),
              currentGeneralCards=sum(card['topic'].startswith('general') for card in current.values()),
              unchangedIdsLevelsAndCardContents=True, duplicateHeadwords=0,
              migrationSourceLayoutVerified=True, assignmentsCoverEveryCardExactlyOnce=True,
              categoryCounts=dict(sorted(Counter(assignments.values()).items())), levels=levels)
(ROOT/'docs/german-topic-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report))
