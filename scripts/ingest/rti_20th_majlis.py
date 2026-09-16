# -*- coding: utf-8 -*-
"""Ingest the RTI disclosure of 20th Majlis insurance expenditure.

Source: Annex-1 to an RTI response, published via the Information
Commissioner's Office, covering 28 May 2024 to 27 May 2026.

This document is the key to reading the older premium disclosure. Its header
states two things that one does not:

  - the premium is MVR 24,000 **per head, per 12 months**
  - cover extends to the **member and their dependents**

So a member's total is not a personal benefit that varies by seniority. It is
`heads x years x 24,000`, and the variation between members is the number of
people they cover. Every one of the 93 rows divides exactly by 24,000, and the
rows sum to the document's own printed total of MVR 16,608,000, which is what
confirms the reading rather than merely permitting it.

Run:  python scripts/ingest/rti_20th_majlis.py [--accept]
Out:  data/rti-20th-majlis.csv
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
PDF = os.path.join(HERE, 'source', 'rti-20th-majlis-2024-2026.pdf')
CSV = 'rti-20th-majlis.csv'
SOURCE_ID = 'rti-20th-majlis-insurance-2024-2026'

COLUMNS = ['row_id', 'name', 'name_dv', 'constituency', 'constituency_dv',
           'amount', 'source_page', 'source_row', 'source_id']

# Stated in the document header, not inferred by us.
PREMIUM_PER_HEAD_PER_YEAR = 24000
# The document prints its own total. Carried in sources.csv as checksum_total,
# where validate.py enforces it against the rows.
STATED_TOTAL = 16608000

# The two column headings, as the PDF stores them: character-reversed.
DHAAIRAA = ''.join(map(chr, [0x7A7, 0x783, 0x7A8, 0x787, 0x7A7, 0x78B]))
NAN = ''.join(map(chr, [0x7B0, 0x782, 0x7A6, 0x782]))
AMOUNT = re.compile(r'^[\d,]+(?:\.\d+)?$')


def column_split(bands):
    """The x position separating the constituency column from the name.

    Read off the header band rather than taken from token order. The marker
    sits at the start of a row here and near the end in the older disclosure,
    so an index-relative split inverts silently - which it did, for months,
    with the amount checksum passing throughout.
    """
    for band in bands:
        seat = next((w for w in band if w['text'] == DHAAIRAA), None)
        name = next((w for w in band if w['text'] == NAN), None)
        if seat and name and seat['x1'] < name['x0']:
            return (seat['x1'] + name['x0']) / 2
    return None


def logical(words):
    """Thaana words in logical order, from words laid out on the page.

    Two separate reversals: the cell's words run right to left, and each word
    has its characters stored reversed. Undo both.
    """
    return ' '.join(repair_visual_order(w['text'])
                    for w in sorted(words, key=lambda w: -w['x0']))


def parse():
    rows, warnings = [], []

    with pdfplumber.open(PDF) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            bands = pdfgrid.bands(page)
            split = column_split(bands)
            if split is None:
                warnings.append(f'page {pno}: no column header band')
                continue

            for band in bands:
                amounts = [w for w in band
                           if AMOUNT.match(w['text']) and (',' in w['text']
                                                           or '.' in w['text'])]
                labels = [w for w in band if w not in amounts]
                if not amounts or not labels:
                    continue          # the printed grand total carries no labels

                seat = [w for w in labels if w['x0'] < split]
                name = [w for w in labels if w['x0'] >= split]
                if not seat or not name:
                    warnings.append(
                        f'page {pno}: a row has labels on only one side of the '
                        f'column split')
                    continue

                constituency = logical(seat)
                person = logical(name)
                rows.append({
                    'row_id': f'rti20--{len(rows) + 1:03d}',
                    'name': romanise(person),
                    'name_dv': person,
                    'constituency': romanise(constituency),
                    'constituency_dv': constituency,
                    'amount': csvio.amount(amounts[0]['text']),
                    'source_page': pno,
                    # This document prints no row numbers of its own.
                    'source_row': '',
                    'source_id': SOURCE_ID,
                })

    return rows, warnings


def main():
    accept = '--accept' in sys.argv
    rows, warnings = parse()
    total = sum(int(r['amount']) for r in rows)

    # A weaker guard than it looks: it checks amounts and nothing else, which
    # is why it did not notice the inverted split. validate.py carries the rest.
    if total != STATED_TOTAL:
        raise SystemExit(
            f'ABORT: rows sum to {total:,}, but the document states '
            f'{STATED_TOTAL:,}. The parse has drifted.')

    csvio.sync(CSV, COLUMNS, rows, accept)

    person_years = total // PREMIUM_PER_HEAD_PER_YEAR
    print(f'  members           {len(rows)}')
    print(f'  total MVR         {total:,}  (matches the printed total)')
    print(f'  person-years      {person_years}')
    print(f'  warnings          {len(warnings)}')
    for w in warnings[:10]:
        print(f'    - {w}')


if __name__ == '__main__':
    main()
