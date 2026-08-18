# -*- coding: utf-8 -*-
"""Turn the Majlis health-insurance-premium PDF into typed JSON.

Source: People's Majlis disclosure of health insurance premiums paid for
members, 28 May 2014 - 27 May 2025, published at
https://mvdevsunion.github.io/MPs_allowance/ (mps-allowance.pdf).

Run:  python scripts/ingest/extract_allowances.py
Out:  src/data/allowances.json
"""
import io
import json
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from thaana import repair_visual_order, romanise, slugify, split_title  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PDF = os.path.join(HERE, 'source', 'mps-allowance.pdf')
OUT = os.path.join(ROOT, 'src', 'data', 'allowances.json')

SOURCE = {
    'title': 'Health insurance premiums paid for members of the People\'s Majlis',
    'titleDv': 'ރައްޔިތުންގެ މަޖިލީހުގެ މެންބަރުންނަށް ހެލްތު އިންޝުއަރެންސް ޕްރީމިއަމަށް ހިނގާފައިވާ ޚަރަދު',
    'publisher': 'People\'s Majlis',
    'periodStart': '2014-05-28',
    'periodEnd': '2025-05-27',
    'currency': 'MVR',
    'pdfUrl': 'https://mvdevsunion.github.io/MPs_allowance/mps-allowance.pdf',
    'landingUrl': 'https://mvdevsunion.github.io/MPs_allowance/',
}

# Each fiscal year runs 28 May -> 27 May and belongs to one Majlis term.
TERMS = [
    {'number': 18, 'start': '2014-05-28', 'end': '2019-05-27'},
    {'number': 19, 'start': '2019-05-28', 'end': '2024-05-27'},
    {'number': 20, 'start': '2024-05-28', 'end': '2025-05-27'},
]

# "dhaairaa" (constituency) as the PDF stores it -> character-reversed.
DHAAIRAA = ''.join(map(chr, [0x7A7, 0x783, 0x7A8, 0x787, 0x7A7, 0x78B]))
AMOUNT = re.compile(r'^[\d,]+$')
YEAR = re.compile(r'^20\d\d-20\d\d$')
ROW_NO = re.compile(r'^\d{1,3}$')


def cluster(items, key, tol):
    """Group items whose key values sit within `tol` of each other."""
    out = []
    for it in sorted(items, key=key):
        if out and abs(key(it) - key(out[-1][-1])) <= tol:
            out[-1].append(it)
        else:
            out.append([it])
    return out


def merge_words(words, gap=1.6):
    """Glue tokens the PDF split mid-value, e.g. '2' + '4,000' -> '24,000'."""
    out = []
    for w in sorted(words, key=lambda w: w['x0']):
        if out and w['x0'] - out[-1]['x1'] <= gap:
            out[-1] = {'x0': out[-1]['x0'], 'x1': w['x1'],
                       'text': out[-1]['text'] + w['text']}
        else:
            out.append({'x0': w['x0'], 'x1': w['x1'], 'text': w['text']})
    return out


def term_for(year):
    start = int(year.split('-')[0])
    for t in TERMS:
        if int(t['start'][:4]) <= start < int(t['end'][:4]):
            return t['number']
    return TERMS[-1]['number']


def parse():
    records, warnings, years = [], [], []

    with pdfplumber.open(PDF) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            bands = [merge_words(b)
                     for b in cluster(page.extract_words(), lambda w: w['top'], 3)]

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
                amounts = [w for w in rest if AMOUNT.match(w['text']) and ',' in w['text']]
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
                    if col['text'] in by_year:
                        warnings.append(f'page {pno}: two amounts in {col["text"]}')
                    by_year[col['text']] = int(a['text'].replace(',', ''))

                title, bare = split_title(name)
                records.append({
                    'name': bare,
                    'nameLatin': romanise(bare),
                    'title': title,
                    'constituency': constituency,
                    'constituencyLatin': romanise(constituency),
                    'sourcePage': pno,
                    'sourceRowNo': int(band[0]['text']),
                    'byYear': by_year,
                    'total': sum(by_year.values()),
                    'yearsPaid': len(by_year),
                    'terms': sorted({term_for(y) for y in by_year}),
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
    records, years, warnings = parse()
    records = assign_ids(records)
    records.sort(key=lambda r: (-r['total'], r['nameLatin']))

    payload = {
        'source': SOURCE,
        'terms': TERMS,
        'fiscalYears': years,
        'totals': {
            'records': len(records),
            'amount': sum(r['total'] for r in records),
            'byYear': {y: sum(r['byYear'].get(y, 0) for r in records) for y in years},
        },
        'warnings': warnings,
        'records': records,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    print(f'wrote {os.path.relpath(OUT, ROOT)}')
    print(f'  records     {len(records)}')
    print(f'  fiscal yrs  {len(years)} ({years[0]} .. {years[-1]})')
    print(f'  total MVR   {payload["totals"]["amount"]:,}')
    print(f'  warnings    {len(warnings)}')
    for w in warnings[:10]:
        print(f'    - {w}')


if __name__ == '__main__':
    main()
