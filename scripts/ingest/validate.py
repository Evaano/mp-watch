# -*- coding: utf-8 -*-
"""Check the committed CSVs in data/ before anything is built from them.

build_graph.py runs this first and aborts on failure. The checks are the
project's documented invariants turned into code, so a hand correction that
breaks one is caught at the point it is made rather than after it has shipped.

Two of them exist because of a bug that was in the committed output for
months: every row of the 20th-Majlis RTI extraction carried the bare word
`dhaairaa` as its constituency, with the real constituency glued onto the
name, and the file's own checksum passed anyway because it only validated
amounts. THAANA_SPLIT below is what catches that shape, from both sides.

Run:  python scripts/ingest/validate.py
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import csvio  # noqa: E402
from thaana import fold_for_match  # noqa: E402

DHAAIRAA = 'ދާއިރާ'
THAANA = re.compile(r'[ހ-ޱ]')
AMOUNT = re.compile(r'^(|0|[1-9][0-9]*)$')
FORMATTED = re.compile(r'^\d{1,3}(,\d{3})+$|^\d+\.\d+$')
FISCAL_YEAR = re.compile(r'^(20\d\d)-(20\d\d)$')
ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

SOURCE_KINDS = {'official-disclosure', 'official-register', 'court-record',
                'audit-report', 'news', 'manifesto', 'reference'}

# Per covered head, per year. 24,000 is stated by the RTI disclosure; 12,500
# is inferred from the exact GCD of every row in those two years. Every
# premium the disclosure prints divides exactly by the rate in force, which is
# what makes it usable as an extraction check.
PER_HEAD_RATES = {
    '2014-2015': 12500, '2015-2016': 12500,
    '2016-2017': 24000, '2017-2018': 24000, '2018-2019': 24000,
    '2019-2020': 24000, '2020-2021': 24000, '2021-2022': 24000,
    '2022-2023': 24000, '2023-2024': 24000, '2024-2025': 24000,
}

# Member ids are reissued every parliament, so an id only means anything
# alongside its term. A roster re-fetch that shifted them trips this.
ID_BLOCKS = {18: (1, 85), 19: (86, 174), 20: (175, 268)}

HEADERS = {
    'sources.csv': ['source_id', 'title', 'title_dv', 'publisher', 'url',
                    'reference', 'kind', 'period_start', 'period_end',
                    'retrieved', 'checksum_total'],
    'terms.csv': ['term_number', 'start', 'end'],
    'majlis-roster.csv': ['majlis_id', 'term', 'name', 'name_dv', 'constituency',
                          'constituency_dv', 'party', 'seat_no', 'photo_url',
                          'source_id'],
    'majlis-speakers.csv': ['row_id', 'name', 'start', 'end', 'source_id'],
}

# Files whose header carries a variable tail of fiscal-year columns.
WIDE_HEADERS = {
    'premium-payments.csv': (
        ['row_id', 'name', 'name_dv', 'title', 'title_dv', 'constituency',
         'constituency_dv', 'source_page', 'source_row'],
        ['source_id'],
    ),
}

DATE_COLUMNS = {'start', 'end', 'period_start', 'period_end', 'retrieved'}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, message):
        self.errors.append(f'{where}: {message}')

    def warn(self, where, message):
        self.warnings.append(f'{where}: {message}')


def at(name, index=None, row=None, column=None):
    where = f'data/{name}'
    if index is not None:
        where += f' row {index}'
        if row:
            where += csvio.locator(row)
    if column:
        where += f' column {column}'
    return where


def check_structure(report, name, header, rows):
    """V1-V5: encoding, header, field count, row ids, dates."""
    expected = HEADERS.get(name)
    if expected is None and name in WIDE_HEADERS:
        head, tail = WIDE_HEADERS[name]
        if header[:len(head)] != head or header[-len(tail):] != tail:
            report.error(at(name), 'header does not match the expected shape')
            return
        expected = header
    if expected is not None and header != expected:
        report.error(at(name),
                     f'header changed\n    expected {",".join(expected)}\n'
                     f'    found    {",".join(header)}')
        return

    if 'row_id' in header:
        seen = {}
        for i, row in enumerate(rows, 1):
            rid = row['row_id']
            if not rid:
                report.error(at(name, i, row), 'row_id is empty')
            elif rid in seen:
                report.error(at(name, i, row),
                             f'row_id {rid!r} already used on row {seen[rid]}')
            else:
                seen[rid] = i

    for i, row in enumerate(rows, 1):
        for column in header:
            if column in DATE_COLUMNS and row[column] and not ISO_DATE.match(row[column]):
                report.error(at(name, i, row, column),
                             f'{row[column]!r} is not an ISO date')


def check_sources(report, sources, referenced):
    """V6-V7: every reference resolves, every source is citable."""
    ids = {s['source_id'] for s in sources}
    for name, used in referenced.items():
        for source_id, index in used.items():
            if source_id not in ids:
                report.error(at(name, index),
                             f'source_id {source_id!r} is not in sources.csv')

    for i, source in enumerate(sources, 1):
        for column in ('title', 'publisher', 'url'):
            if not source[column]:
                report.error(at('sources.csv', i), f'{column} is empty')
        if source['kind'] not in SOURCE_KINDS:
            report.error(at('sources.csv', i),
                         f'kind {source["kind"]!r} is not a SourceKind')
        if not source['reference'] and not source['url'].startswith('http'):
            report.warn(at('sources.csv', i),
                        f'{source["source_id"]} has no public URL and no '
                        'reference number, so a reader cannot check it')


def check_fiscal_years(report, name, header):
    """V9: the year vocabulary is contiguous and ascending."""
    years = [c for c in header if FISCAL_YEAR.match(c)]
    previous = None
    for year in years:
        first, second = (int(g) for g in FISCAL_YEAR.match(year).groups())
        if second != first + 1:
            report.error(at(name), f'fiscal year {year!r} does not span one year')
        if previous is not None and first != previous + 1:
            report.error(at(name),
                         f'fiscal years jump from {previous} to {first}')
        previous = first
    return years


def check_money(report, name, rows, columns, rates=None):
    """V10-V12: one canonical integer form, and divisibility where a rate applies."""
    for i, row in enumerate(rows, 1):
        for column in columns:
            value = row[column]
            if FORMATTED.match(value):
                report.error(
                    at(name, i, row, column),
                    f'{value!r} is formatted, not a value. The source prints '
                    '12,500, 120000.00 and - in one document; the CSV stores '
                    'one canonical integer form. Keying on the comma is how '
                    'MVR 216,000 was lost once already.')
                continue
            if not AMOUNT.match(value):
                report.error(at(name, i, row, column),
                             f'{value!r} is not a plain integer or empty')
                continue
            if value and rates and column in rates:
                rate = rates[column]
                if int(value) % rate:
                    report.error(
                        at(name, i, row, column),
                        f'{value} does not divide by the MVR {rate:,} per-head '
                        'rate in force that year')


def check_checksums(report, sources, tables):
    """V13: where a document prints its own grand total, the rows must hit it."""
    for source in sources:
        if not source['checksum_total']:
            continue
        stated = int(source['checksum_total'])
        total = 0
        found = False
        for name, rows, columns in tables:
            for row in rows:
                if row.get('source_id') != source['source_id']:
                    continue
                found = True
                total += sum(int(row[c]) for c in columns if row.get(c))
        if found and total != stated:
            report.error(at('sources.csv'),
                         f'{source["source_id"]} states a total of {stated:,} '
                         f'but its rows sum to {total:,}')


def check_thaana_split(report, name, rows, name_column, constituency_column):
    """V14-V18. The three that catch an inverted name/constituency split.

    Either half can fire on its own, so they are separate checks: a split that
    keeps only the marker leaves the constituency bare, and a split that runs
    the other way leaves the marker inside the name.
    """
    bare = fold_for_match(DHAAIRAA)
    for i, row in enumerate(rows, 1):
        person, seat = row[name_column], row[constituency_column]

        if not THAANA.search(person or ''):
            report.error(at(name, i, row, name_column), 'no Thaana in the name')
        if not THAANA.search(seat or ''):
            report.error(at(name, i, row, constituency_column),
                         'no Thaana in the constituency')
            continue

        if fold_for_match(seat) == bare:
            report.error(
                at(name, i, row, constituency_column),
                f'is the bare word {DHAAIRAA!r} with no constituency in front '
                'of it. The name/constituency split has inverted.')
        elif not seat.strip().endswith(DHAAIRAA):
            report.error(at(name, i, row, constituency_column),
                         f'does not end with {DHAAIRAA!r}')

        if DHAAIRAA in (person or ''):
            report.error(
                at(name, i, row, name_column),
                f'contains {DHAAIRAA!r}, so the constituency has been glued '
                'onto the name. The split has inverted.')

        for column, value in ((name_column, person), (constituency_column, seat)):
            if re.search(r'\d', value or ''):
                report.error(at(name, i, row, column),
                             'contains an ASCII digit. Thaana labels never do, '
                             'and amount matching relies on that.')


def check_latin(report, name, rows, columns):
    """V19: the Latin columns hold Latin. Catches a swapped pair of columns."""
    for i, row in enumerate(rows, 1):
        for column in columns:
            value = row[column]
            if not value:
                report.error(at(name, i, row, column), 'is empty')
            elif THAANA.search(value):
                report.error(at(name, i, row, column),
                             'holds Thaana. The Latin and Thaana columns look swapped.')


def check_roster(report, rows, terms):
    """V20-V21: id blocks, unique person-terms, and fold collisions."""
    known = {t['term_number'] for t in terms}
    seen = {}
    folded = {}
    for i, row in enumerate(rows, 1):
        term = int(row['term'])
        member_id = int(row['majlis_id'])
        if str(term) not in {str(t) for t in known}:
            report.error(at('majlis-roster.csv', i, row),
                         f'term {term} is not in terms.csv')
        low, high = ID_BLOCKS.get(term, (None, None))
        if low is not None and not low <= member_id <= high:
            report.error(at('majlis-roster.csv', i, row),
                         f'majlis_id {member_id} is outside the {term}th '
                         f'parliament block ({low}-{high})')
        key = (member_id, term)
        if key in seen:
            report.error(at('majlis-roster.csv', i, row),
                         f'(majlis_id, term) {key} already used on row {seen[key]}')
        seen[key] = i

        fold = (fold_for_match(row['name_dv']), fold_for_match(row['constituency_dv']))
        folded.setdefault(fold, []).append((i, member_id, term))

    # Not an error. A collision is the precondition for an ambiguous join, so
    # it has to be visible - but it is also exactly what a member serving two
    # terms looks like, which is the normal case.
    for fold, entries in folded.items():
        ids = {member_id for _, member_id, _ in entries}
        terms_seen = [term for _, _, term in entries]
        if len(ids) > 1 and len(terms_seen) != len(set(terms_seen)):
            report.warn(at('majlis-roster.csv'),
                        f'{len(entries)} rows fold to the same (name, constituency) '
                        f'across member ids {sorted(ids)}')


def run():
    report = Report()
    tables = {}
    referenced = {}

    for name in list(HEADERS) + list(WIDE_HEADERS):
        try:
            header, rows = csvio.read(name)
        except UnicodeDecodeError as exc:
            report.error(at(name), f'is not valid UTF-8 ({exc}). A spreadsheet '
                                   'saved it in a legacy encoding.')
            continue
        except FileNotFoundError:
            report.error(at(name), 'is missing')
            continue
        except csv.Error as exc:
            report.error(at(name), f'is not readable as CSV ({exc})')
            continue
        tables[name] = (header, rows)
        check_structure(report, name, header, rows)
        if 'source_id' in header:
            referenced[name] = {r['source_id']: i for i, r in enumerate(rows, 1)}

    if 'sources.csv' in tables:
        sources = tables['sources.csv'][1]
        check_sources(report, sources, referenced)

    if 'majlis-roster.csv' in tables and 'terms.csv' in tables:
        rows = tables['majlis-roster.csv'][1]
        check_roster(report, rows, tables['terms.csv'][1])
        check_thaana_split(report, 'majlis-roster.csv', rows,
                           'name_dv', 'constituency_dv')
        check_latin(report, 'majlis-roster.csv', rows, ['name', 'constituency'])

    if 'premium-payments.csv' in tables:
        header, rows = tables['premium-payments.csv']
        years = check_fiscal_years(report, 'premium-payments.csv', header)
        check_money(report, 'premium-payments.csv', rows, years, PER_HEAD_RATES)
        check_thaana_split(report, 'premium-payments.csv', rows,
                           'name_dv', 'constituency_dv')
        check_latin(report, 'premium-payments.csv', rows, ['name', 'constituency'])
        if 'sources.csv' in tables:
            check_checksums(report, tables['sources.csv'][1],
                            [('premium-payments.csv', rows, years)])

    return report


def run_or_exit():
    report = run()
    for warning in report.warnings:
        print(f'  warn  {warning}')
    if report.errors:
        print(f'\nABORT: {len(report.errors)} validation error(s)')
        for error in report.errors[:40]:
            print(f'  {error}')
        if len(report.errors) > 40:
            print(f'  ... and {len(report.errors) - 40} more')
        raise SystemExit(1)
    return report


def main():
    report = run_or_exit()
    print(f'data/ is valid ({len(report.warnings)} warning(s))')


if __name__ == '__main__':
    main()
