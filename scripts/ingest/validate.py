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
# Columns whose document prints cents. Everywhere else a decimal point is the
# formatted-value error below.
DECIMAL_AMOUNT = re.compile(r'^$|^(0|[1-9][0-9]*)\.\d{2}$')
FORMATTED = re.compile(r'^\d{1,3}(,\d{3})+')
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
    'rti-20th-majlis.csv': ['row_id', 'name', 'name_dv', 'constituency',
                            'constituency_dv', 'amount', 'source_page',
                            'source_row', 'source_id'],
    'political-posts-foreign-affairs.csv': [
        'row_id', 'source_page', 'source_row', 'designation', 'rank', 'job_type',
        'basic_salary', 'foreign_service_allowance', 'living_allowance',
        'executive_allowance', 'service_allowance', 'supporting_co_allowance',
        'technical_co_allowance', 'phone_allowance', 'minimum_wage_allowance',
        'petrol_allowance', 'dress_allowance_yearly', 'stated_total', 'source_id'],
    'political-posts-health.csv': [
        'row_id', 'source_page', 'source_row', 'rcn', 'office', 'designation',
        'rank', 'employed_date', 'appraisal_marks_2025', 'department',
        'basic_salary', 'housing', 'transport', 'phone', 'other', 'source_id'],
    'political-posts-finance.csv': [
        'row_id', 'source_row', 'name', 'office', 'designation', 'rank',
        'occupied_date', 'termination_date', 'rejoined_date', 'no_pay_leave',
        'basic_salary', 'basic_after_10pct_deduction', 'living_allowance',
        'phone_allowance', 'car_allowance', 'source_id'],
    'political-posts-education.csv': [
        'row_id', 'source_page', 'source_row', 'designation_dv', 'rank',
        'basic_salary', 'living_allowance', 'phone_allowance',
        'petrol_allowance', 'occupied_date', 'status', 'source_id'],
    'political-posts-aggregate.csv': [
        'row_id', 'body_id', 'office', 'designation', 'rank', 'posts',
        'basic_salary', 'living_allowance', 'phone_allowance',
        'stated_total_min', 'stated_total_max', 'source_page', 'note',
        'source_id'],
    'political-posts-coverage.csv': [
        'body_id', 'body_name', 'as_of', 'answer_kind', 'posts_stated',
        'posts_itemised', 'note', 'source_id'],
    'vip-18th-majlis.csv': [
        'row_id', 'source_page', 'source_row', 'constituency', 'name',
        'movements', 'rate_usd', 'total_usd', 'total_mvr', 'source_id'],
    'vip-19th-majlis.csv': [
        'row_id', 'source_page', 'source_row', 'constituency', 'name',
        'movements', 'rate_usd', 'total_usd', 'total_mvr', 'source_id'],
    'vip-20th-majlis.csv': [
        'row_id', 'source_page', 'source_row', 'name', 'name_dv',
        'constituency', 'constituency_dv', 'movements', 'total_mvr',
        'source_id'],
    'diplomatic-passports-20th-majlis.csv': [
        'row_id', 'source_page', 'source_row', 'name', 'name_dv',
        'constituency', 'constituency_dv', 'source_id'],
}

# Files whose header carries a variable tail of fiscal-year columns.
WIDE_HEADERS = {
    'premium-payments.csv': (
        ['row_id', 'name', 'name_dv', 'title', 'title_dv', 'constituency',
         'constituency_dv', 'source_page', 'source_row'],
        ['source_id'],
    ),
}

DATE_COLUMNS = {'start', 'end', 'period_start', 'period_end', 'retrieved',
                'as_of', 'employed_date', 'occupied_date', 'termination_date',
                'rejoined_date', 'no_pay_leave'}

RANKS = {'minister', 'state-minister', 'deputy-minister',
         'senior-political-director', 'political-director'}

ANSWER_KINDS = {'per-post', 'aggregate', 'unreadable'}

# The four rates three independently-sourced ministries print identically:
# basic salary, then the living-allowance slot - which Health prints under the
# heading "Housing". Reading those two headings as one slot is an inference,
# made here and in registry.rankLadder(), and nowhere else.
RANK_LADDER = {
    'state-minister': (29500, 12500),
    'deputy-minister': (18000, 12500),
    'senior-political-director': (15000, 10000),
    'political-director': (11000, 9000),
}

# The pegged rate the 18th and 19th convert at, and the flat charge per
# movement they price at. Both are printed in the documents themselves.
VIP_RATE_USD = 60
VIP_MVR_PER_USD = 15.42

# Rows each document itemises, as its own coverage row states.
EXPECTED_ROWS = {
    'political-posts-foreign-affairs.csv': 268,
    'political-posts-health.csv': 81,
    'political-posts-finance.csv': 34,
    'political-posts-education.csv': 46,
}


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


def check_money(report, name, rows, columns, rates=None, decimal=()):
    """V10-V12: one canonical form, and divisibility where a rate applies."""
    for i, row in enumerate(rows, 1):
        for column in columns:
            value = row[column]
            if column in decimal:
                if not DECIMAL_AMOUNT.match(value):
                    report.error(at(name, i, row, column),
                                 f'{value!r} is not an amount to two decimal '
                                 'places, which is how this document prints it')
                continue
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
            # A warning, not an error. The bare-marker check above and the
            # marker-inside-the-name check below are the actual signature of
            # an inverted split, and neither can fire on a faithful row. This
            # one can: the 20th VIP table prints Mathiveri with no marker at
            # all on row 41, and failing a build over a faithful extraction
            # would teach the next person to weaken the checks that matter.
            report.warn(at(name, i, row, constituency_column),
                        f'does not end with {DHAAIRAA!r}, so either the source '
                        'omits the marker or the split is short')

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


def check_vip(report, tables):
    """The VIP disclosures price every movement, so the row must reconcile.

    movements x USD 60 is the dollar total, and that times 15.42 is the
    rufiyaa total. Both hold exactly in every row of both documents, which is
    what makes the count trustworthy: a dropped or misread movement figure
    breaks the identity immediately.

    The 20th is not checked this way on purpose. It prints MVR 872.93 a
    movement and no dollar figure at all, which is a different arrangement,
    and forcing the two into one formula would assert a bridge neither
    document makes.
    """
    for name in ('vip-18th-majlis.csv', 'vip-19th-majlis.csv'):
        if name not in tables:
            continue
        rows = tables[name][1]
        check_money(report, name, rows, ['movements'])
        check_money(report, name, rows,
                    ['rate_usd', 'total_usd', 'total_mvr'],
                    decimal=('rate_usd', 'total_usd', 'total_mvr'))
        for i, row in enumerate(rows, 1):
            if not row['movements'] or not row['total_usd']:
                continue
            movements = int(row['movements'])
            usd, mvr = float(row['total_usd']), float(row['total_mvr'] or 0)
            if float(row['rate_usd']) != VIP_RATE_USD:
                report.warn(at(name, i, row),
                            f'is priced at USD {row["rate_usd"]}, not the '
                            f'USD {VIP_RATE_USD} every other row states')
            if abs(movements * VIP_RATE_USD - usd) > 0.005:
                report.error(at(name, i, row),
                             f'{movements} movements at USD {VIP_RATE_USD} is '
                             f'{movements * VIP_RATE_USD:,}, but the row states '
                             f'USD {usd:,.2f}')
            if row['total_mvr'] and abs(usd * VIP_MVR_PER_USD - mvr) > 0.02:
                report.error(at(name, i, row),
                             f'USD {usd:,.2f} at {VIP_MVR_PER_USD} is '
                             f'{usd * VIP_MVR_PER_USD:,.2f}, but the row states '
                             f'MVR {mvr:,.2f}')

    if 'vip-20th-majlis.csv' in tables:
        rows = tables['vip-20th-majlis.csv'][1]
        check_money(report, 'vip-20th-majlis.csv', rows, ['movements'])
        check_money(report, 'vip-20th-majlis.csv', rows, ['total_mvr'],
                    decimal=('total_mvr',))
        check_thaana_split(report, 'vip-20th-majlis.csv', rows,
                           'name_dv', 'constituency_dv')
        check_latin(report, 'vip-20th-majlis.csv', rows, ['name', 'constituency'])
        # One flat charge, whatever it is. Reported rather than assumed: the
        # rate is not stated in words anywhere in the document, so the check
        # is that it is consistent, not that it is a particular number.
        rates = {round(float(r['total_mvr']) / int(r['movements']), 2)
                 for r in rows if r['movements'] and int(r['movements'])}
        if len(rates) > 2:
            report.warn(at('vip-20th-majlis.csv'),
                        f'implies {len(rates)} different charges per movement: '
                        f'{sorted(rates)}')

    if 'diplomatic-passports-20th-majlis.csv' in tables:
        rows = tables['diplomatic-passports-20th-majlis.csv'][1]
        check_thaana_split(report, 'diplomatic-passports-20th-majlis.csv', rows,
                           'name_dv', 'constituency_dv')
        check_latin(report, 'diplomatic-passports-20th-majlis.csv', rows,
                    ['name', 'constituency'])


def check_posts(report, tables):
    """V22-V30: the political-appointee tables."""
    for name, expected in EXPECTED_ROWS.items():
        if name in tables and len(tables[name][1]) != expected:
            report.error(at(name),
                         f'has {len(tables[name][1])} rows, expected {expected}')

    if 'political-posts-foreign-affairs.csv' in tables:
        rows = tables['political-posts-foreign-affairs.csv'][1]
        monthly = ['basic_salary', 'foreign_service_allowance', 'living_allowance',
                   'executive_allowance', 'service_allowance',
                   'supporting_co_allowance', 'technical_co_allowance',
                   'phone_allowance', 'minimum_wage_allowance', 'petrol_allowance']
        check_money(report, 'political-posts-foreign-affairs.csv', rows,
                    monthly + ['dress_allowance_yearly', 'stated_total'],
                    decimal=('stated_total',))
        for i, row in enumerate(rows, 1):
            if not row['stated_total']:
                continue          # the document prints none; never compute one
            total = float(row['stated_total'])
            components = sum(int(row[c]) for c in monthly if row[c])
            # The published TOTAL is monthly and excludes the yearly dress
            # allowance. Components print rounded to whole rufiyaa while the
            # total carries unrounded cents, so the Foreign Service rows sit
            # under a rufiyaa out. Compare; never recompute - the document is
            # the record, and its own figure is what gets published.
            if abs(total - components) >= 1:
                report.error(
                    at('political-posts-foreign-affairs.csv', i, row),
                    f'stated_total {total:,.2f} is {abs(total - components):,.2f} '
                    f'away from the sum of its monthly components '
                    f'({components:,})')

    money_columns = {
        'political-posts-health.csv':
            ['basic_salary', 'housing', 'transport', 'phone', 'other'],
        'political-posts-finance.csv':
            ['basic_salary', 'basic_after_10pct_deduction', 'living_allowance',
             'phone_allowance', 'car_allowance'],
        'political-posts-education.csv':
            ['basic_salary', 'living_allowance', 'phone_allowance',
             'petrol_allowance'],
    }
    for name, columns in money_columns.items():
        if name in tables:
            check_money(report, name, tables[name][1], columns)

    if 'political-posts-finance.csv' in tables:
        for i, row in enumerate(tables['political-posts-finance.csv'][1], 1):
            if not row['basic_after_10pct_deduction'] or not row['basic_salary']:
                continue
            expected = round(int(row['basic_salary']) * 0.9)
            if int(row['basic_after_10pct_deduction']) != expected:
                report.error(at('political-posts-finance.csv', i, row),
                             f'{row["basic_after_10pct_deduction"]} is not 90% of '
                             f'{row["basic_salary"]} (expected {expected})')

    bodies = {}
    if 'political-posts-coverage.csv' in tables:
        for i, row in enumerate(tables['political-posts-coverage.csv'][1], 1):
            bodies[row['body_id']] = row
            if row['answer_kind'] not in ANSWER_KINDS:
                report.error(at('political-posts-coverage.csv', i, row),
                             f'answer_kind {row["answer_kind"]!r} is not known')
            if not row['posts_stated']:
                continue
            stated, itemised = int(row['posts_stated']), int(row['posts_itemised'])
            if itemised > stated:
                report.error(at('political-posts-coverage.csv', i, row),
                             f'itemises {itemised} posts but states only {stated}')
            elif itemised < stated:
                # Not an error. Homeland states 57 and itemises 27; the gap is
                # the finding, and the page has to say so rather than imply
                # that 27 is the whole.
                report.warn(at('political-posts-coverage.csv', i, row),
                            f'{row["body_id"]} states {stated} posts and itemises '
                            f'{itemised}: {stated - itemised} are not described')

    if 'political-posts-aggregate.csv' in tables:
        rows = tables['political-posts-aggregate.csv'][1]
        check_money(report, 'political-posts-aggregate.csv', rows,
                    ['posts', 'basic_salary', 'living_allowance',
                     'phone_allowance', 'stated_total_min', 'stated_total_max'])
        for i, row in enumerate(rows, 1):
            if bodies and row['body_id'] not in bodies:
                report.error(at('political-posts-aggregate.csv', i, row),
                             f'body_id {row["body_id"]!r} is not in the coverage file')
            if int(row['posts'] or 0) < 1:
                report.error(at('political-posts-aggregate.csv', i, row),
                             'posts must be at least 1')
            has_components = bool(row['basic_salary'] or row['living_allowance'])
            has_range = bool(row['stated_total_min'] or row['stated_total_max'])
            if has_components == has_range:
                report.error(
                    at('political-posts-aggregate.csv', i, row),
                    'must carry either pay components or a stated range, never '
                    'both and never neither: a range is a whole package and '
                    'cannot be compared with a basic salary')

    check_rank_ladder(report, tables)


def check_rank_ladder(report, tables):
    """The cross-ministry rank ladder. A warning, never an error.

    Three independently-sourced ministries print the same four rates, which is
    what lets them be read as standing rates rather than one ministry's own
    arrangement. A ministry that pays differently is a FINDING; making that
    fatal would turn a real discovery into a build break.
    """
    living_column = {
        'political-posts-foreign-affairs.csv': 'living_allowance',
        'political-posts-health.csv': 'housing',
        'political-posts-finance.csv': 'living_allowance',
        'political-posts-education.csv': 'living_allowance',
        'political-posts-aggregate.csv': 'living_allowance',
    }
    divergent = {}
    for name, living_key in living_column.items():
        if name not in tables:
            continue
        for i, row in enumerate(tables[name][1], 1):
            rank = row.get('rank', '')
            if rank and rank not in RANKS:
                report.error(at(name, i, row),
                             f'rank {rank!r} is not one of {sorted(RANKS)}')
                continue
            if rank not in RANK_LADDER or not row.get('basic_salary'):
                continue
            basic, living = RANK_LADDER[rank]
            seen_basic = int(row['basic_salary'])
            seen_living = int(row[living_key]) if row.get(living_key) else None
            if seen_basic != basic or (seen_living is not None
                                       and seen_living != living):
                key = (name, rank, seen_basic, seen_living)
                divergent[key] = divergent.get(key, 0) + 1

    # One line per distinct divergence rather than per row. A ministry paying
    # a rank differently is one finding however many people it applies to, and
    # 40 identical lines would bury the rest of the report.
    for (name, rank, seen_basic, seen_living), count in sorted(divergent.items()):
        basic, living = RANK_LADDER[rank]
        report.warn(at(name),
                    f'{count} {rank} row(s) on basic {seen_basic:,} / living '
                    f'{seen_living if seen_living is not None else "-"}, where '
                    f'the other ministries state {basic:,} / {living:,}')


def run():
    report = Report()
    tables = {}
    referenced = {}
    checksummed = []

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
        checksummed.append(('premium-payments.csv', rows, years))

    if 'rti-20th-majlis.csv' in tables:
        rows = tables['rti-20th-majlis.csv'][1]
        check_money(report, 'rti-20th-majlis.csv', rows, ['amount'],
                    {'amount': 24000})
        check_thaana_split(report, 'rti-20th-majlis.csv', rows,
                           'name_dv', 'constituency_dv')
        check_latin(report, 'rti-20th-majlis.csv', rows, ['name', 'constituency'])
        checksummed.append(('rti-20th-majlis.csv', rows, ['amount']))

    if 'sources.csv' in tables and checksummed:
        check_checksums(report, tables['sources.csv'][1], checksummed)

    check_posts(report, tables)
    check_vip(report, tables)

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
