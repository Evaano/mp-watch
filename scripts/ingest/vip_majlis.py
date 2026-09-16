# -*- coding: utf-8 -*-
"""Extract the airport VIP disclosures and the diplomatic passport list.

Three documents, obtained through the Information Commissioner's Office:

  18th Majlis   85 members, VIP movements over the whole term, Latin.
  19th Majlis   89 members, same shape, Latin.
  20th Majlis   one document carrying two lists: 87 members who took a
                diplomatic passport, then VIP users from 28 May 2024 to
                31 July 2025. Thaana.

The 18th and 19th price every movement at USD 60 and convert at 15.42, which
is the Bank of Maldives pegged rate this repo already cites. The 20th prints
MVR 872.93 a movement and no dollar figure at all. Those two are NOT
reconciled here and must not be: each document's own figures are published as
it prints them, and inventing a bridge between them would be an assertion
neither makes.

Run:  python scripts/ingest/vip_majlis.py [--accept]
Out:  data/vip-18th-majlis.csv, data/vip-19th-majlis.csv,
      data/vip-20th-majlis.csv, data/diplomatic-passports-20th-majlis.csv
"""
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csvio  # noqa: E402
import pdfgrid  # noqa: E402
from thaana import repair_visual_order, romanise  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(HERE, 'source')

THAANA = re.compile(r'[ހ-ޱ]')
ROW_NO = re.compile(r'^\d{1,3}$')
USD = re.compile(r'^\$[\d,]+\.?\d*$')
NUMBER = re.compile(r'^[\d,]+\.?\d*$|^-$')

# Seats, not rows. The 18th table has 86 rows for 85 seats: Dhiggaru appears
# twice, once for Ahmed Nazim and once for Ahmed Faris Maumoon, which is a
# mid-term replacement. A constituency is not unique within a term.
LATIN = {
    18: ('vip-18th-majlis.pdf', 'vip-18th-majlis.csv', 'rti-majlis-vip-18th', 85),
    19: ('vip-19th-majlis.pdf', 'vip-19th-majlis.csv', 'rti-majlis-vip-19th', 89),
}
LATIN_COLUMNS = ['row_id', 'source_page', 'source_row', 'constituency', 'name',
                 'movements', 'rate_usd', 'total_usd', 'total_mvr', 'source_id']

TWENTIETH_PDF = 'vip-diplomatic-20th-majlis.pdf'
VIP20_SOURCE = 'rti-majlis-vip-passports-20th'
VIP20_COLUMNS = ['row_id', 'source_page', 'source_row', 'name', 'name_dv',
                 'constituency', 'constituency_dv', 'movements', 'total_mvr',
                 'source_id']
PASSPORT_COLUMNS = ['row_id', 'source_page', 'source_row', 'name', 'name_dv',
                    'constituency', 'constituency_dv', 'source_id']

# The one geometric assumption in the Latin documents: everything left of here
# is the constituency, everything right of it is the name. The two columns sit
# at x 78 and x 184, so the boundary is nowhere near either.
LATIN_NAME_X = 150
# Same idea in the 20th, where the columns sit at x ~260 and x ~440.
THAANA_NAME_X = 350


def latin(term):
    """One row per member: constituency, name, movements, and the two totals.

    Read from word positions, not `extract_tables`, which loses a cell on at
    least one row of the 19th: Ikram Hassan's movements and dollar total come
    back empty while the rufiyaa total survives.
    """
    filename, _, source_id, _ = LATIN[term]
    rows, warnings = [], []
    with pdfplumber.open(os.path.join(SOURCE_DIR, filename)) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for band in pdfgrid.bands(page):
                if not band or not ROW_NO.match(band[0]['text']):
                    continue
                rest = band[1:]
                words = [w for w in rest if not THAANA.search(w['text'])]

                # Four value columns, left to right: movements, rate, dollar
                # total, rufiyaa total. Taken by position rather than by shape
                # because the two documents disagree about the dollar sign -
                # the 18th prints 26100 where the 19th prints $4,320.00 - and
                # keying on it would drop half of one file.
                values = sorted(
                    (w for w in words
                     if USD.match(w['text']) or NUMBER.match(w['text'])),
                    key=lambda w: w['x0'])
                labels = [w for w in words
                          if not USD.match(w['text']) and not NUMBER.match(w['text'])]
                if len(values) != 4:
                    warnings.append(f'{term}th page {pno}: row {band[0]["text"]} '
                                    f'has {len(values)} value columns, expected 4')
                    continue

                constituency = ' '.join(w['text'] for w in labels
                                        if w['x0'] < LATIN_NAME_X)
                name = ' '.join(w['text'] for w in labels
                                if w['x0'] >= LATIN_NAME_X)
                rows.append({
                    'row_id': f'vip{term}--{len(rows) + 1:03d}',
                    'source_page': pno,
                    'source_row': int(band[0]['text']),
                    'constituency': constituency,
                    'name': name,
                    'movements': csvio.amount(values[0]['text']),
                    'rate_usd': csvio.amount(values[1]['text'].lstrip('$'), dp=2),
                    'total_usd': csvio.amount(values[2]['text'].lstrip('$'), dp=2),
                    'total_mvr': csvio.amount(values[3]['text'], dp=2),
                    'source_id': source_id,
                })
    return rows, warnings


def repair(word):
    """Undo the visual order, but only where there is Thaana to undo.

    Reversing an ASCII run turns 3,491.70 into 07.1943 and row 78 into row 87,
    and both still look like numbers, so nothing downstream would notice.
    """
    return repair_visual_order(word) if THAANA.search(word) else word


def logical(words):
    """Thaana words in logical order: the cell reads right to left."""
    return ' '.join(repair(w['text']) for w in sorted(words, key=lambda w: -w['x0']))


def twentieth():
    """One document, two lists.

    A row carrying numbers is a VIP row; a row carrying only a row number and
    Thaana is a passport holder. Classifying on content rather than on which
    page it fell on means the boundary cannot drift: the VIP table starts
    part-way down page 4, under the passport list.
    """
    vip, passports, warnings = [], [], []
    with pdfplumber.open(os.path.join(SOURCE_DIR, TWENTIETH_PDF)) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for band in pdfgrid.bands(page):
                numbers = [w for w in band
                           if not THAANA.search(w['text']) and NUMBER.match(w['text'])]
                labels = [w for w in band if THAANA.search(w['text'])]
                if not numbers or not labels:
                    continue

                # The row number sits at the reading start, furthest right.
                ordered = sorted(numbers, key=lambda w: -w['x0'])
                row_no = ordered[0]
                if not ROW_NO.match(row_no['text']):
                    continue
                figures = ordered[1:]

                constituency = logical([w for w in labels if w['x0'] < THAANA_NAME_X])
                name = logical([w for w in labels if w['x0'] >= THAANA_NAME_X])
                if not constituency or not name:
                    warnings.append(f'20th page {pno}: row {row_no["text"]} has '
                                    'labels on only one side of the column split')
                    continue

                common = {
                    'source_page': pno,
                    'source_row': int(row_no['text']),
                    'name': romanise(name),
                    'name_dv': name,
                    'constituency': romanise(constituency),
                    'constituency_dv': constituency,
                    'source_id': VIP20_SOURCE,
                }
                if len(figures) >= 2:
                    # Rightmost of the remaining figures is the count; the
                    # leftmost is the rufiyaa total.
                    vip.append({
                        'row_id': f'vip20--{len(vip) + 1:03d}',
                        'movements': csvio.amount(figures[0]['text']),
                        'total_mvr': csvio.amount(figures[-1]['text'], dp=2),
                        **common,
                    })
                else:
                    passports.append({
                        'row_id': f'dp20--{len(passports) + 1:03d}',
                        **common,
                    })
    return vip, passports, warnings


def main():
    accept = '--accept' in sys.argv
    warnings = []

    for term in sorted(LATIN):
        _, csv_name, _, expected = LATIN[term]
        rows, notes = latin(term)
        warnings += notes
        csvio.sync(csv_name, LATIN_COLUMNS, rows, accept)
        movements = sum(int(r['movements']) for r in rows if r['movements'])
        seats = len({r['source_row'] for r in rows})
        print(f'  {term}th rows        {len(rows)} for {seats} seats '
              f'({expected} in that parliament)')
        print(f'  {term}th movements   {movements:,}')

    vip, passports, notes = twentieth()
    warnings += notes
    csvio.sync('vip-20th-majlis.csv', VIP20_COLUMNS, vip, accept)
    csvio.sync('diplomatic-passports-20th-majlis.csv', PASSPORT_COLUMNS,
               passports, accept)
    movements = sum(int(r['movements']) for r in vip if r['movements'])
    print(f'  20th VIP members   {len(vip)}')
    print(f'  20th movements     {movements:,}')
    print(f'  20th passports     {len(passports)}')

    print(f'  warnings           {len(warnings)}')
    for note in warnings[:10]:
        print(f'    - {note}')


if __name__ == '__main__':
    main()
