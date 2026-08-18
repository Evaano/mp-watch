# -*- coding: utf-8 -*-
"""Ingest the People's Majlis member rosters and the speaker history.

Two things this gives us that the premium disclosure cannot:
  - stated membership of a parliament, replacing positions we could only infer
    from the fiscal years in which a premium happened to be paid
  - party, and the Thaana/Latin name pair from the official record rather than
    from our own transliteration

Run:  python scripts/ingest/majlis_members.py
Out:  src/data/parts/majlis-members.json
"""
import html
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch import get  # noqa: E402
from thaana import slugify  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'data', 'parts', 'majlis-members.json')

BASE = 'https://majlis.gov.mv'

# A parliament's roster states membership of that parliament. It does not give
# per-member start and end dates, so positions take the term's own bounds and
# say so. Mid-term replacements are therefore approximate at the edges.
TERMS = {
    18: {'start': '2014-05-28', 'end': '2019-05-27'},
    19: {'start': '2019-05-28', 'end': '2024-05-27'},
    20: {'start': '2024-05-28', 'end': None},
}

ROSTER_SOURCE = 'majlis-member-roster'
SPEAKERS_SOURCE = 'majlis-speakers-history'

DATA_ARRAY = re.compile(r'var data = (\[.*?\]);', re.S)
# The anchor wraps the card and sits *before* it, so cards must be matched
# anchor-first. Splitting on the card class alone pairs each member with the
# next member's link, and silently shifts every party by one.
CARD = re.compile(
    r'<a[^>]*href="[^"]*/members/(\d+)"[^>]*>(.*?)</a>', re.S)
BADGE = re.compile(r'xbadge[^>]*>([^<]{1,24})<')
CARD_NAME = re.compile(r'<h5[^>]*>(.*?)</h5>', re.S)
CARD_SEAT = re.compile(r'<h6[^>]*>(.*?)</h6>', re.S)
CARD_PHOTO = re.compile(r'<img[^>]*src="([^"]+/storage/members/[^"]+)"')
SPEAKER_BLOCK = re.compile(
    r'member-block.*?<h6[^>]*>(.*?)</h6>.*?'
    r'(\d{1,2} \w{3} \d{4})\s*-\s*(\d{1,2} \w{3} \d{4})', re.S)

MONTHS = {m: i + 1 for i, m in enumerate(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}


def clean(text):
    return re.sub(r'\s+', ' ', html.unescape(text or '')).strip()


def parse_roster(markup):
    """id -> {name, constituency, party, seatNo, photo}.

    The cards are the authoritative roster. The seating-chart array only
    covers seats currently rendered on the chart, which for the 18th and 19th
    parliaments is fewer members than actually served, so it supplies seat
    numbers and photos only.
    """
    out = {}
    for member_id, card in CARD.findall(markup):
        member_id = int(member_id)
        if member_id in out:
            continue                      # leadership block repeats members
        name = CARD_NAME.search(card)
        seat = CARD_SEAT.search(card)
        badge = BADGE.search(card)
        photo = CARD_PHOTO.search(card)
        if not name:
            continue
        out[member_id] = {
            'name': clean(re.sub(r'<[^>]+>', '', name.group(1))),
            'constituency': clean(re.sub(r'<[^>]+>', '', seat.group(1))) if seat else '',
            'party': clean(badge.group(1)) if badge else None,
            'seatNo': None,
            # Taken from the card rather than the seating-chart array, which
            # only covers currently-charted seats and so misses older terms.
            'photo': photo.group(1) if photo else None,
        }

    match = DATA_ARRAY.search(markup)
    if match:
        for row in json.loads(match.group(1)):
            if not isinstance(row, dict) or 'id' not in row:
                continue
            entry = out.get(int(row['id']))
            if entry:
                entry['seatNo'] = row.get('seat_no')
    return out


def iso(date_text):
    day, month, year = date_text.split()
    return f'{year}-{MONTHS[month]:02d}-{int(day):02d}'


def parse_speakers(markup):
    body = markup[markup.find('Previous Speakers'):]
    body = body[:body.find('Select a Parliament')]
    seen, out = set(), []
    for name, start, end in SPEAKER_BLOCK.findall(body):
        name = clean(re.sub(r'<[^>]+>', '', name))
        if not name or name.lower().startswith('select'):
            continue
        key = (name, start, end)
        if key in seen:
            continue
        seen.add(key)
        out.append({'name': name, 'start': iso(start), 'end': iso(end)})
    return out


def main():
    persons, positions = {}, []
    counts = {}

    for term in sorted(TERMS):
        english = get(f'{BASE}/en/{term}-parliament/members')
        dhivehi = get(f'{BASE}/dv/{term}-parliament/members')

        latin = parse_roster(english)
        thaana = parse_roster(dhivehi)
        counts[term] = len(latin)

        for member_id, en in latin.items():
            dv = thaana.get(member_id, {})
            key = f'majlis-{member_id}'

            if key not in persons:
                persons[key] = {
                    'id': key,
                    'majlisId': member_id,
                    'name': dv.get('name', ''),
                    'nameLatin': en['name'],
                    'title': None,
                    'photoUrl': en.get('photo'),
                    'sources': [ROSTER_SOURCE],
                }

            positions.append({
                'id': f'{key}--majlis-{term}',
                'personId': key,
                'kind': 'majlis-member',
                'constituency': dv.get('constituency', ''),
                'constituencyLatin': en['constituency'],
                'termNumbers': [term],
                'start': TERMS[term]['start'],
                'end': TERMS[term]['end'],
                'party': en.get('party'),
                'seatNo': en.get('seatNo'),
                'basis': 'stated',
                'basisNote': 'Membership is stated by the official roster for this '
                             'parliament. Dates are the term\'s own bounds, so a '
                             'member seated mid-term shows the term start.',
                'sources': [ROSTER_SOURCE],
            })

    speakers = parse_speakers(get(f'{BASE}/en/speakers-history'))
    for entry in speakers:
        positions.append({
            'id': f'speaker--{slugify(entry["name"])}--{entry["start"]}',
            'personId': None,          # resolved against the roster in the build
            'personNameLatin': entry['name'],
            'kind': 'speaker',
            'organisation': "People's Majlis",
            'start': entry['start'],
            'end': entry['end'],
            'basis': 'stated',
            'sources': [SPEAKERS_SOURCE],
        })

    part = {
        'meta': {'generatedBy': 'scripts/ingest/majlis_members.py'},
        'sources': [
            {
                'id': ROSTER_SOURCE,
                'title': "People's Majlis member roster",
                'publisher': "People's Majlis",
                'url': f'{BASE}/en/20-parliament/members',
                'kind': 'official-register',
            },
            {
                'id': SPEAKERS_SOURCE,
                'title': "People's Majlis previous speakers",
                'publisher': "People's Majlis",
                'url': f'{BASE}/en/speakers-history',
                'kind': 'official-register',
            },
        ],
        'persons': list(persons.values()),
        'positions': positions,
        'claims': [],
        'warnings': [],
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(part, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    seats = [p for p in positions if p['kind'] == 'majlis-member']
    print(f'wrote {os.path.relpath(OUT, ROOT)}')
    for term in sorted(counts):
        print(f'  {term}th parliament   {counts[term]} members')
    print(f'  unique people      {len(persons)}')
    print(f'  seat positions     {len(seats)}')
    print(f'  with a party       {sum(1 for p in seats if p.get("party"))}')
    print(f'  with a photo       {sum(1 for p in persons.values() if p.get("photoUrl"))}')
    print(f'  speaker positions  {len(speakers)}')
    missing_dv = sum(1 for p in persons.values() if not p['name'])
    if missing_dv:
        print(f'  WARN missing Thaana name for {missing_dv} people')


if __name__ == '__main__':
    main()
