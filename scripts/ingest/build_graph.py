# -*- coding: utf-8 -*-
"""Merge the ingest parts into one graph, resolving identities.

Each ingest writes a partial graph to src/data/parts/. This joins them and
decides which person records refer to the same human.

The joining rule is deliberately strict: an exact match on both the Thaana
name and the Thaana constituency, and only when that match is unique. Anything
short of that is left unmerged and written to docs/identity-review.md for a
human. Fuzzy-matching Maldivian names would silently attach one person's
spending, votes or allegations to another, and there is no way to notice from
the output that it happened.

Run:  python scripts/ingest/build_graph.py
Out:  src/data/graph.json, docs/identity-review.md
"""
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from thaana import fold_for_match  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PARTS = os.path.join(ROOT, 'src', 'data', 'parts')
OUT = os.path.join(ROOT, 'src', 'data', 'graph.json')
REVIEW = os.path.join(ROOT, 'docs', 'identity-review.md')

# The roster is the authority on who served, so it is loaded first and other
# parts resolve onto it.
PART_ORDER = ['majlis-members.json', 'allowances.json']


def norm(text):
    """Whitespace-normalised for comparison. Nothing else: no transliteration
    fuzz, no character folding, no stripping of honorifics."""
    return re.sub(r'\s+', ' ', (text or '')).strip()


def load_parts():
    parts = []
    for name in PART_ORDER:
        path = os.path.join(PARTS, name)
        if not os.path.exists(path):
            print(f'  skipping missing part {name}')
            continue
        parts.append((name, json.load(io.open(path, encoding='utf-8'))))
    return parts


def build_roster_index(positions, persons_by_id, roster_ids):
    """(name, constituency) -> set of roster person ids.

    Only roster people are indexed. Indexing everyone makes each unmerged
    record match itself, which reads as an ambiguous join rather than a clean
    one.
    """
    index = {}
    for position in positions:
        if position.get('kind') != 'majlis-member':
            continue
        if position.get('personId') not in roster_ids:
            continue
        person = persons_by_id.get(position.get('personId'))
        if not person:
            continue
        key = (fold_for_match(person.get('name')),
               fold_for_match(position.get('constituency')))
        if not key[0] or not key[1]:
            continue
        index.setdefault(key, set()).add(person['id'])
    return index


def consolidate_roster(persons, positions):
    """Collapse per-parliament roster records for the same person.

    Joined on the folded Thaana name plus the folded Thaana constituency. The
    Thaana constituency is stable across terms where the Latin one is not
    ("Hithadhoo Uthuru Dhaaira" in the 18th becomes "North Hithadhoo" in the
    19th), which is why the join runs on Thaana.

    A member who changed seat between terms will not collapse, and will appear
    as two people until a human links them. That is the safe direction to err.
    """
    roster = [p for p in persons if p.get('majlisId') is not None]
    others = [p for p in persons if p.get('majlisId') is None]

    seat_of = {}
    for position in positions:
        if position.get('kind') == 'majlis-member':
            seat_of.setdefault(position['personId'], position)

    groups = {}
    for person in roster:
        seat = seat_of.get(person['id'])
        if not seat:
            continue
        key = (fold_for_match(person.get('name')),
               fold_for_match(seat.get('constituency')))
        groups.setdefault(key, []).append(person)

    remap, kept, merges = {}, [], 0
    for group in groups.values():
        # Keep the earliest record as canonical so ids stay stable as new
        # parliaments are added.
        group.sort(key=lambda p: p['majlisId'])
        canonical = group[0]
        canonical['majlisIds'] = [p['majlisId'] for p in group]
        kept.append(canonical)
        for duplicate in group[1:]:
            remap[duplicate['id']] = canonical['id']
            merges += 1

    for position in positions:
        owner = position.get('personId')
        if owner in remap:
            position['personId'] = remap[owner]

    return kept + others, positions, merges


def main():
    parts = load_parts()

    sources, persons, positions, claims, warnings = [], [], [], [], []
    seen_sources = set()
    for name, part in parts:
        for source in part.get('sources', []):
            if source['id'] not in seen_sources:
                seen_sources.add(source['id'])
                sources.append(source)
        persons.extend(part.get('persons', []))
        positions.extend(part.get('positions', []))
        claims.extend(part.get('claims', []))
        warnings.extend(part.get('warnings', []))
        # Carry the fiscal-year vocabulary through from whichever part has it.
        if part.get('fiscalYears'):
            fiscal_years = part['fiscalYears']
            terms = part.get('terms', [])

    # The Majlis assigns a NEW member id in every parliament (18th = 1-85,
    # 19th = 86-174, 20th = 175-268), so the roster arrives as person-terms
    # rather than people. Collapse them first, or every later join sees the
    # same human three times and reads as ambiguous.
    persons, positions, roster_merges = consolidate_roster(persons, positions)

    persons_by_id = {p['id']: p for p in persons}
    roster_ids = {p['id'] for p in persons if p.get('majlisId') is not None}
    index = build_roster_index(positions, persons_by_id, roster_ids)

    remap, merged, ambiguous, unmatched = {}, [], [], []

    for person in persons:
        if person['id'] in roster_ids:
            continue
        name = fold_for_match(person.get('name'))
        # An unmerged person's constituency lives on their own position.
        own = [p for p in positions if p.get('personId') == person['id']]
        keys = {(name, fold_for_match(p.get('constituency'))) for p in own}
        matches = set()
        for key in keys:
            matches |= index.get(key, set())

        if len(matches) == 1:
            target = matches.pop()
            remap[person['id']] = target
            merged.append((person, target))
            roster = persons_by_id[target]
            # The disclosure prints an honorific the roster omits; keep it.
            if person.get('title') and not roster.get('title'):
                roster['title'] = person['title']
        elif len(matches) > 1:
            ambiguous.append((person, sorted(matches)))
        else:
            unmatched.append(person)

    # Apply the remap: claims move to the canonical person, and positions that
    # were only inferred are dropped in favour of the roster's stated ones.
    for claim in claims:
        claim['personId'] = remap.get(claim['personId'], claim['personId'])

    kept_positions = []
    for position in positions:
        owner = position.get('personId')
        if owner in remap and position.get('basis') == 'inferred':
            continue
        if owner in remap:
            position['personId'] = remap[owner]
        kept_positions.append(position)

    # Speaker positions carry a name rather than an id; resolve on exact Latin.
    latin_index = {}
    for person in persons:
        if person['id'] in roster_ids:
            latin_index.setdefault(norm(person['nameLatin']).lower(), set()).add(person['id'])
    # index is keyed the same way the speaker lookup will key its query

    # Speaker names carry honorifics the roster omits.
    honorific = re.compile(
        r'^(president|utz\.|uz\.|sheikh|al ameer|saahibuh saadhaa|al marhoom)\s+',
        re.I)

    def speaker_key(name):
        key = norm(name).lower()
        while True:
            stripped = honorific.sub('', key)
            if stripped == key:
                return stripped
            key = stripped

    speakers_resolved, speakers_unresolved = 0, []
    final_positions = []
    for position in kept_positions:
        if position.get('kind') == 'speaker' and not position.get('personId'):
            candidates = latin_index.get(speaker_key(position.get('personNameLatin')), set())
            if len(candidates) == 1:
                position['personId'] = next(iter(candidates))
                position.pop('personNameLatin', None)
                speakers_resolved += 1
                final_positions.append(position)
            else:
                # Either a speaker from before our rosters begin, or a Latin
                # name shared by two members. Recorded as a gap rather than
                # guessed at: there really are two Mohamed Nasheeds.
                position['reviewReason'] = (
                    'name shared by more than one member'
                    if candidates else 'no member of that name in any roster')
                speakers_unresolved.append(position)
            continue
        final_positions.append(position)

    kept_persons = [p for p in persons if p['id'] not in remap]

    # Recompute same-name links across the merged set.
    by_name = {}
    for person in kept_persons:
        person.pop('possiblySameAs', None)
        by_name.setdefault(norm(person.get('name')) or person['nameLatin'], []).append(person)
    for group in by_name.values():
        if len(group) > 1:
            ids = [p['id'] for p in group]
            for person in group:
                person['possiblySameAs'] = [i for i in ids if i != person['id']]

    graph = {
        'meta': {
            'generatedBy': 'scripts/ingest/build_graph.py',
            'datasets': sorted(seen_sources),
        },
        'sources': sources,
        'persons': kept_persons,
        'positions': final_positions,
        'claims': claims,
        'fiscalYears': fiscal_years,
        'terms': terms,
        'warnings': warnings,
    }

    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    write_review(ambiguous, unmatched, speakers_unresolved)

    orphan_claims = sum(
        1 for c in claims if c['personId'] not in {p['id'] for p in kept_persons})

    print(f'wrote {os.path.relpath(OUT, ROOT)}')
    print(f'  persons            {len(kept_persons)}')
    print(f'  positions          {len(final_positions)}')
    print(f'  claims             {len(claims)}')
    print(f'  roster terms merged{roster_merges:>4}')
    print(f'  merged onto roster {len(merged)}')
    print(f'  ambiguous          {len(ambiguous)}')
    print(f'  unmatched          {len(unmatched)}')
    print(f'  speakers resolved  {speakers_resolved} of '
          f'{speakers_resolved + len(speakers_unresolved)}')
    print(f'  orphan claims      {orphan_claims}')
    print(f'  review queue       {os.path.relpath(REVIEW, ROOT)}')


def write_review(ambiguous, unmatched, speakers_unresolved):
    lines = [
        '# Identity review queue',
        '',
        'Generated by `scripts/ingest/build_graph.py`. These are the records the',
        'automated join refused to decide. Nothing here is a bug; the join is',
        'strict on purpose, because a wrong merge attaches one person\'s record',
        'to another and nothing downstream would reveal it.',
        '',
        '## Ambiguous: matched more than one roster member',
        '',
    ]
    if ambiguous:
        for person, matches in ambiguous:
            lines.append(f'- **{person["nameLatin"]}** ({person["name"]}) -> '
                         + ', '.join(f'`{m}`' for m in matches))
    else:
        lines.append('_None._')

    lines += [
        '',
        '## Unmatched: no roster member with that name and constituency',
        '',
        'Expected for members who served before the rosters published here, and',
        'for constituencies renamed between terms.',
        '',
    ]
    if unmatched:
        for person in sorted(unmatched, key=lambda p: p['nameLatin']):
            lines.append(f'- **{person["nameLatin"]}** ({person["name"]}) `{person["id"]}`')
    else:
        lines.append('_None._')

    lines += [
        '',
        '## Speakers not resolved to a member record',
        '',
        'Speakers from before the earliest roster. Recorded here rather than',
        'invented as person records.',
        '',
    ]
    if speakers_unresolved:
        for position in speakers_unresolved:
            lines.append(f'- **{position.get("personNameLatin")}** '
                         f'{position["start"]} to {position["end"]} '
                         f'- _{position.get("reviewReason", "")}_')
    else:
        lines.append('_None._')

    os.makedirs(os.path.dirname(REVIEW), exist_ok=True)
    io.open(REVIEW, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
