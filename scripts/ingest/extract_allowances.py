# -*- coding: utf-8 -*-
"""Turn the Majlis health-insurance-premium PDF into data/premium-payments.csv.

Source: People's Majlis disclosure of health insurance premiums paid for
members, 28 May 2014 - 27 May 2025, published at
https://mvdevsunion.github.io/MPs_allowance/ (mps-allowance.pdf).

The CSV is wide - one row per member, one column per fiscal year - because
that is the shape of the PDF page. A human checking a figure holds the page
beside the row, and 266 rows that look like the document beat 1,769 rows that
look like a database. build_graph.py turns it into persons, positions and
claims.

Rows are written in document order, not in the graph's display order, for the
same reason. build_graph.py does the sorting.

Run:  python scripts/ingest/extract_allowances.py [--accept]
Out:  data/premium-payments.csv
"""
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csvio  # noqa: E402
import pdfgrid  # noqa: E402
from thaana import repair_visual_order, romanise, slugify, split_title  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, 'source', 'mps-allowance.pdf')
CSV = 'premium-payments.csv'
SOURCE_ID = 'majlis-health-insurance-2014-2025'

FIXED_COLUMNS = ['row_id', 'name', 'name_dv', 'title', 'title_dv',
                 'constituency', 'constituency_dv', 'source_page', 'source_row']

# "dhaairaa" (constituency) as the PDF stores it -> character-reversed.
DHAAIRAA = ''.join(map(chr, [0x7A7, 0x783, 0x7A8, 0x787, 0x7A7, 0x78B]))
# The disclosure mixes number formats across pages: '12,500', '120000.00'
# and '-' for nil all appear. Match on shape rather than on a separator,
# which is safe because Thaana labels never contain ASCII digits.
AMOUNT = re.compile(r'^(?:[\d,]+(?:\.\d+)?|-)$')
YEAR = re.compile(r'^20\d\d-20\d\d$')
ROW_NO = re.compile(r'^\d{1,3}$')


def parse():
    records, warnings, years = [], [], []

    with pdfplumber.open(PDF) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            bands = pdfgrid.bands(page)

            columns = None
            for band in bands:
                found = [w for w in band if YEAR.match(w['text'])]
                if len(found) >= 8:
                    columns = sorted(found, key=lambda w: w['x0'])
                    break
            if not columns:
                warnings.append(f'page {pno}: no fiscal-year header row')
                continue
            if not years:
                years = [w['text'] for w in columns]

            for band in bands:
                if not band or not ROW_NO.match(band[0]['text']):
                    continue
                rest = band[1:]
                amounts = [w for w in rest if AMOUNT.match(w['text'])]
                labels = [w['text'] for w in rest if w not in amounts]
                if DHAAIRAA not in labels:
                    warnings.append(f'page {pno}: row without a constituency marker')
                    continue

                split = labels.index(DHAAIRAA)
                name = ' '.join(repair_visual_order(t) for t in reversed(labels[:split]))
                constituency = ' '.join(repair_visual_order(t)
                                        for t in reversed(labels[split:]))

                by_year = {}
                for a in amounts:
                    centre = (a['x0'] + a['x1']) / 2
                    col = min(columns, key=lambda c: abs(centre - (c['x0'] + c['x1']) / 2))
                    if not (col['x0'] - 14 <= centre <= col['x1'] + 14):
                        warnings.append(f'page {pno}: amount {a["text"]} outside the grid')
                        continue
                    value = csvio.amount(a['text'])
                    if value in ('', '0'):
                        continue          # explicit nil, or nothing paid
                    if col['text'] in by_year:
                        warnings.append(f'page {pno}: two amounts in {col["text"]}')
                    by_year[col['text']] = value

                title, title_dv, bare = split_title(name)
                records.append({
                    'name': bare,
                    'nameLatin': romanise(bare),
                    'title': title,
                    'titleDv': title_dv,
                    'constituency': constituency,
                    'constituencyLatin': romanise(constituency),
                    'sourcePage': pno,
                    'sourceRowNo': int(band[0]['text']),
                    'byYear': by_year,
                })

    return records, years, warnings


def assign_ids(records):
    """Identity is (name, constituency) -- never the PDF's own row number,
    which repeats and skips values. Same-name members in different
    constituencies are distinct records by design; deciding whether any pair
    is one redistricted person needs a human, so we only flag them."""
    seen = {}
    for r in records:
        place = re.sub(r'-?dhaairaa$', '', slugify(r['constituency']))
        base = f'{slugify(r["name"])}-{place}'
        seen[base] = seen.get(base, 0) + 1
        r['id'] = base if seen[base] == 1 else f'{base}-{seen[base]}'

    by_name = {}
    for r in records:
        by_name.setdefault(r['name'], []).append(r)
    for name, group in by_name.items():
        if len(group) > 1:
            ids = [r['id'] for r in group]
            for r in group:
                r['sameNameAs'] = [i for i in ids if i != r['id']]
    return records




def main():
    accept = '--accept' in sys.argv
    records, years, warnings = parse()
    records = assign_ids(records)

    # The fiscal-year column headers are the year vocabulary. There is no
    # separate fiscal-years file: a second place to edit is a sync bug waiting
    # to happen, and build_graph.py reads the vocabulary back off this header.
    header = FIXED_COLUMNS + years + ['source_id']

    rows = []
    for r in records:
        row = {
            'row_id': r['id'],
            'name': r['nameLatin'],
            'name_dv': r['name'],
            'title': r['title'] or '',
            'title_dv': r['titleDv'] or '',
            'constituency': r['constituencyLatin'],
            'constituency_dv': r['constituency'],
            'source_page': r['sourcePage'],
            'source_row': r['sourceRowNo'],
            'source_id': SOURCE_ID,
        }
        row.update({y: r['byYear'].get(y, '') for y in years})
        rows.append(row)

    csvio.sync(CSV, header, rows, accept)

    total = sum(int(v) for r in rows for y in years if (v := r[y]))
    print(f'  members     {len(rows)}')
    print(f'  fiscal yrs  {len(years)} ({years[0]} .. {years[-1]})')
    print(f'  total MVR   {total:,}')
    print(f'  warnings    {len(warnings)}')
    for w in warnings[:10]:
        print(f'    - {w}')


if __name__ == '__main__':
    main()
