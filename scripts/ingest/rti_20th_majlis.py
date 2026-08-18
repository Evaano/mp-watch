# -*- coding: utf-8 -*-
"""Ingest the RTI disclosure of 20th Majlis insurance expenditure.

Source: Annex-1 to an RTI response, published via the Information Commissioner's
Office, covering 28 May 2024 to 27 May 2026.

This document is the key to reading the older premium disclosure. Its header
states two things that one does not:

  - the premium is MVR 24,000 **per head, per 12 months**
  - cover extends to the **member and their dependents**

So a member's total is not a personal benefit that varies by seniority. It is
`heads x years x 24,000`, and the variation between members is the number of
people they cover. Every one of the 93 rows divides exactly by 24,000, and the
rows sum to the document's own printed total of MVR 16,608,000, which is what
confirms the reading rather than merely permitting it.

Run:  python scripts/ingest/rti_20th_majlis.py
Out:  src/data/parts/rti-20th-majlis.json
"""
import io
import json
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from thaana import repair_visual_order, romanise  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PDF = os.path.join(HERE, 'source', 'rti-20th-majlis-2024-2026.pdf')
OUT = os.path.join(ROOT, 'src', 'data', 'parts', 'rti-20th-majlis.json')

SOURCE_ID = 'rti-20th-majlis-insurance-2024-2026'

PERIOD_START = '2024-05-28'
PERIOD_END = '2026-05-27'
YEARS_COVERED = 2

# Stated in the document header, not inferred by us.
PREMIUM_PER_HEAD_PER_YEAR = 24000

# The document prints its own total. Treated as a checksum: if our rows stop
# summing to it, the parse has drifted and the build should fail rather than
# publish a quietly wrong figure.
STATED_TOTAL = 16608000

DHAAIRAA = ''.join(map(chr, [0x7A7, 0x783, 0x7A8, 0x787, 0x7A7, 0x78B]))
AMOUNT = re.compile(r'^[\d,]+(?:\.\d+)?$')


def parse():
    rows, warnings = [], []

    with pdfplumber.open(PDF) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for line in (page.extract_text() or '').split('\n'):
                tokens = line.split()
                amounts = [t for t in tokens
                           if AMOUNT.match(t) and (',' in t or '.' in t)]
                if not amounts:
                    continue

                total = int(float(amounts[0].replace(',', '')))
                if total == STATED_TOTAL:
                    continue                      # the printed grand total

                labels = [t for t in tokens if t not in amounts]
                if DHAAIRAA not in labels:
                    warnings.append(f'page {pno}: row without a constituency marker')
                    continue

                # Thaana is stored character-reversed with cell words running
                # left to right; both are undone to get logical order.
                split = labels.index(DHAAIRAA)
                constituency = ' '.join(repair_visual_order(t)
                                        for t in reversed(labels[:split + 1]))
                name = ' '.join(repair_visual_order(t)
                                for t in reversed(labels[split + 1:]))

                if total % PREMIUM_PER_HEAD_PER_YEAR:
                    warnings.append(
                        f'page {pno}: {total} is not a whole multiple of the '
                        f'stated per-head premium')

                rows.append({
                    'name': name,
                    'nameLatin': romanise(name),
                    'constituency': constituency,
                    'constituencyLatin': romanise(constituency),
                    'total': total,
                    'personYears': total // PREMIUM_PER_HEAD_PER_YEAR,
                    'sourcePage': pno,
                })

    return rows, warnings


def main():
    rows, warnings = parse()
    total = sum(r['total'] for r in rows)

    # Fail loudly rather than publish a drifted parse.
    if total != STATED_TOTAL:
        raise SystemExit(
            f'ABORT: rows sum to {total:,}, but the document states '
            f'{STATED_TOTAL:,}. The parse has drifted.')

    source = {
        'id': SOURCE_ID,
        'title': "20th People's Majlis members' insurance expenditure "
                 "(member and dependents)",
        'publisher': "People's Majlis, via the Information Commissioner's Office",
        'url': 'https://icom.sgp1.digitaloceanspaces.com/ID%206732-%20Annex-1_RTI'
               '_20th%20Majlis%20till%2027th%20May%202026-1760009635350.pdf',
        'kind': 'official-disclosure',
        'periodStart': PERIOD_START,
        'periodEnd': PERIOD_END,
    }

    claims = []
    for row in rows:
        claims.append({
            'id': f'rti20--{row["nameLatin"].replace(" ", "-")}--'
                  f'{row["constituencyLatin"].replace(" ", "-")}',
            'personId': None,        # resolved against the roster in the build
            'personName': row['name'],
            'constituency': row['constituency'],
            'type': 'expenditure',
            'subtype': 'health-insurance-premium',
            'amount': row['total'],
            'currency': 'MVR',
            'periodStart': PERIOD_START,
            'periodEnd': PERIOD_END,
            # What the money actually bought, which the older disclosure never
            # states. Reported as person-years because the document gives a
            # two-year total, and cover can start or stop mid-period: 9
            # person-years cannot be split into a head count without guessing.
            'personYears': row['personYears'],
            'perHeadPerYear': PREMIUM_PER_HEAD_PER_YEAR,
            'coversDependents': True,
            'locator': {'page': row['sourcePage']},
            'sources': [SOURCE_ID],
        })

    part = {
        'meta': {'generatedBy': 'scripts/ingest/rti_20th_majlis.py'},
        'sources': [source],
        'persons': [],
        'positions': [],
        'claims': claims,
        'warnings': warnings,
        'statedFacts': {
            'premiumPerHeadPerYear': PREMIUM_PER_HEAD_PER_YEAR,
            'coversDependents': True,
            'statedTotal': STATED_TOTAL,
            'periodStart': PERIOD_START,
            'periodEnd': PERIOD_END,
            'yearsCovered': YEARS_COVERED,
        },
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(part, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    person_years = sum(r['personYears'] for r in rows)
    print(f'wrote {os.path.relpath(OUT, ROOT)}')
    print(f'  members           {len(rows)}')
    print(f'  total MVR         {total:,}  (matches the printed total)')
    print(f'  person-years      {person_years}')
    print(f'  people per member {person_years / YEARS_COVERED / len(rows):.2f}'
          f'  (member + dependents)')
    print(f'  warnings          {len(warnings)}')
    for w in warnings[:10]:
        print(f'    - {w}')


if __name__ == '__main__':
    main()
