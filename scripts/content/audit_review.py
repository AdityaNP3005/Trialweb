#!/usr/bin/env python3
"""Verify the shipped cleanup against its pre-review commit, including stable ids."""
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from review_decks import ROOT, headword

BASELINE = 'dcb466f'
old, new, levels = {}, {}, []
for level in ('a1', 'a2', 'b1', 'b2', 'c1', 'c2'):
    name = f'src/content/de/{level}.json'
    before = json.loads(subprocess.check_output(['git', 'show', f'{BASELINE}:{name}'], cwd=ROOT))
    after = json.loads((ROOT / name).read_text())
    counters = Counter()
    for card in before['cards']:
        counters[card['topic']] += 1
        old[f"de-{level}-{card['topic']}-{counters[card['topic']]:04d}"] = card
    for card in after['cards']:
        assert card['id'] not in new, f"Duplicate id: {card['id']}"
        new[card['id']] = card
    levels.append(dict(level=level.upper(), before=len(before['cards']),
                       after=len(after['cards']), topics=len(after['topics'])))
aliases = json.loads((ROOT / 'src/content/de/review-aliases.json').read_text())
assert not (set(new) & set(aliases)), 'Removed ids still shipped'
assert set(old) == set(new) | set(aliases), 'Some original cards are unaccounted for'
assert all(old[key]['front'] == card['front'] for key, card in new.items()), 'A surviving id changed words'
assert all(headword(old[key]['front']) == headword(new[target]['front'])
           for key, target in aliases.items()), 'An alias points to a different headword'
assert len({headword(card['front']) for card in new.values()}) == len(new), 'Repeated headwords'
normalize = lambda value: re.sub(r'\s*[·;]\s*', ';', value)
corrected = sum(any(normalize(old[key][field]) != normalize(card[field])
                    for field in ('meaningId', 'meaningEn')) for key, card in new.items())
report = dict(baselineCommit=BASELINE, reviewedOriginalCards=len(old), uniqueCards=len(new),
              duplicateCardsConsolidated=len(aliases),
              headwordGroupsConsolidated=sum(bool(card.get('reviewedSenses')) for card in new.values()),
              cardsWithMeaningChangesExcludingDelimiterFormatting=corrected,
              duplicateHeadwordsRemaining=0, survivingIdsUnchanged=True,
              everyRemovedIdHasSameHeadwordTarget=True, levels=levels)
path = ROOT / 'docs/german-vocab-audit.json'
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report))
