# -*- coding: utf-8 -*-
"""Ingest the People's Majlis member rosters and the speaker history.

Two things this gives us that the premium disclosure cannot:
  - stated membership of a parliament, replacing positions we could only infer
    from the fiscal years in which a premium happened to be paid
  - party, and the Thaana/Latin name pair from the official record rather than
    from our own transliteration

The roster arrives as person-*terms*, one row per member per parliament, and
the CSV keeps it that way: that is what the source publishes, and collapsing
it into people is an identity decision that belongs in build_graph.py where
the review file can see it.

Run:  python scripts/ingest/majlis_members.py [--accept]
Out:  data/majlis-roster.csv, data/majlis-speakers.csv
"""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csvio  # noqa: E402
from fetch import get  # noqa: E402
from thaana import slugify  # noqa: E402

ROSTER_CSV = 'majlis-roster.csv'
SPEAKERS_CSV = 'majlis-speakers.csv'
# (majlis_id, term) is an identifier the source itself assigns, so this file
# needs no row_id. The premium disclosure's row numbers are the opposite case:
# 11 repeat and 5 are skipped, which is why that CSV carries one.
ROSTER_COLUMNS = ['majlis_id', 'term', 'name', 'name_dv', 'constituency',
                  'constituency_dv', 'party', 'seat_no', 'photo_url', 'source_id']
SPEAKERS_COLUMNS = ['row_id', 'name', 'start', 'end', 'source_id']

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
    accept = '--accept' in sys.argv
    roster, speakers = [], []
    counts = {}

    for term in sorted(TERMS):
        english = get(f'{BASE}/en/{term}-parliament/members')
        dhivehi = get(f'{BASE}/dv/{term}-parliament/members')

        latin = parse_roster(english)
        thaana = parse_roster(dhivehi)
        counts[term] = len(latin)

        for member_id, en in latin.items():
            dv = thaana.get(member_id, {})
            roster.append({
                'majlis_id': member_id,
                'term': term,
                'name': en['name'],
                'name_dv': dv.get('name', ''),
                'constituency': en['constituency'],
                'constituency_dv': dv.get('constituency', ''),
                'party': en.get('party') or '',
                'seat_no': '' if en.get('seatNo') is None else en['seatNo'],
                'photo_url': en.get('photo') or '',
                'source_id': ROSTER_SOURCE,
            })

    for entry in parse_speakers(get(f'{BASE}/en/speakers-history')):
        speakers.append({
            # Seeded from the id this ingest has always minted, then opaque:
            # correcting a spelling must not rename the row.
            'row_id': f'speaker--{slugify(entry["name"])}--{entry["start"]}',
            'name': entry['name'],
            'start': entry['start'],
            'end': entry['end'],
            'source_id': SPEAKERS_SOURCE,
        })

    csvio.sync(ROSTER_CSV, ROSTER_COLUMNS, roster, accept)
    csvio.sync(SPEAKERS_CSV, SPEAKERS_COLUMNS, speakers, accept)

    for term in sorted(counts):
        print(f'  {term}th parliament   {counts[term]} members')
    print(f'  person-terms       {len(roster)}')
    print(f'  with a party       {sum(1 for r in roster if r["party"])}')
    print(f'  with a photo       {sum(1 for r in roster if r["photo_url"])}')
    print(f'  speaker rows       {len(speakers)}')
    missing_dv = sum(1 for r in roster if not r['name_dv'])
    if missing_dv:
        print(f'  WARN missing Thaana name for {missing_dv} person-terms')


if __name__ == '__main__':
    main()
