# -*- coding: utf-8 -*-
"""Turn the committed CSVs in data/ into one graph, resolving identities.

The CSVs are the correction surface; this is where they become persons,
positions and claims, and where the app's only input file is written.

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
import csvio  # noqa: E402
import validate  # noqa: E402
from thaana import fold_for_match  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'data', 'graph.json')
REVIEW = os.path.join(ROOT, 'docs', 'identity-review.md')

FISCAL_YEAR = re.compile(r'^20\d\d-20\d\d$')


# Each fiscal year runs 28 May -> 27 May, as the disclosure's own header says.
def year_bounds(fiscal_year):
    start, end = fiscal_year.split('-')
    return f'{start}-05-28', f'{end}-05-27'


def norm(text):
    """Whitespace-normalised for comparison. Nothing else: no transliteration
    fuzz, no character folding, no stripping of honorifics."""
    return re.sub(r'\s+', ' ', (text or '')).strip()


# ---------------------------------------------------------------------------
# Political posts
#
# One CSV per document, because each mirrors its own document's columns and
# that is what makes a figure checkable against the page it came from. The
# unification into one shape happens here, where the differences between the
# bodies can be named rather than flattened.
#
# `posts` is never multiplied by a rate, here or downstream. posts x basic x 12
# would be a fabricated expenditure figure: it ignores vacancies, part-months,
# the 10 per cent deduction, and the four bodies that did not answer per post.
# ---------------------------------------------------------------------------

# (csv column, label the source prints, period). The label is carried verbatim
# rather than canonicalised, because the bodies disagree: Foreign Affairs,
# Finance and Education print "Living Allowance" where Health prints "Housing".
POST_COMPONENTS = {
    'political-posts-foreign-affairs.csv': [
        ('foreign_service_allowance', 'Foreign Service Allowance', 'monthly'),
        ('living_allowance', 'Living Allowance', 'monthly'),
        ('executive_allowance', 'Executive Allowance', 'monthly'),
        ('service_allowance', 'Service Allowance', 'monthly'),
        ('supporting_co_allowance', 'Supporting Co Allowance', 'monthly'),
        ('technical_co_allowance', 'Technical Co Allowance', 'monthly'),
        ('phone_allowance', 'Phone Allowance', 'monthly'),
        ('minimum_wage_allowance', 'Minimum Wage Allowance', 'monthly'),
        ('petrol_allowance', 'Petrol Allowance', 'monthly'),
        ('dress_allowance_yearly', 'Dress Allowance', 'yearly'),
    ],
    'political-posts-health.csv': [
        ('housing', 'Housing', 'monthly'),
        ('transport', 'Transport', 'monthly'),
        ('phone', 'Phone', 'monthly'),
        ('other', 'Other', 'monthly'),
    ],
    'political-posts-finance.csv': [
        ('living_allowance', 'Living Allowance', 'monthly'),
        ('phone_allowance', 'Phone allowance', 'monthly'),
        ('car_allowance', 'Car Allowance', 'monthly'),
    ],
    'political-posts-education.csv': [
        ('living_allowance', 'Living Allowance', 'monthly'),
        ('phone_allowance', 'Phone Allowance', 'monthly'),
        ('petrol_allowance', 'Petrol Allowance', 'monthly'),
    ],
    'political-posts-aggregate.csv': [
        ('living_allowance', 'Living Allowance', 'monthly'),
        ('phone_allowance', 'Phone Allowance', 'monthly'),
    ],
}

POST_BODIES = {
    'political-posts-foreign-affairs.csv': 'foreign-affairs',
    'political-posts-health.csv': 'health-family-welfare',
    'political-posts-finance.csv': 'finance',
    'political-posts-education.csv': 'education-higher-education',
}

EDUCATION_STATUS = {
    'left': 'This post appears in the second section of the table: staff who '
            'have left.',
    'moved-to-political-director': 'This post appears in the second section of '
                                   'the table: the holder moved to a political '
                                   'director post.',
}


def components_for(name, row):
    """Every component the source prints, in the source's own column order.

    A printed nil is 0 and is kept: "this post gets no car allowance" is a
    fact. A blank cell is absent, because the document says nothing about it.
    """
    out = []
    for column, label, period in POST_COMPONENTS[name]:
        if row.get(column) == '':
            continue
        out.append({'label': label, 'amount': int(row[column]), 'period': period})
    return out


def post_base(name, row, office, designation):
    post = {
        'id': row['row_id'],
        'bodyId': row.get('body_id') or POST_BODIES[name],
        'measure': 'entitlement',
        'office': office,
        'designation': designation,
        'rank': row['rank'] or None,
        'posts': int(row.get('posts') or 1),
        'components': components_for(name, row),
        'sources': [row['source_id']],
    }
    if row.get('basic_salary'):
        post['basic'] = int(row['basic_salary'])
    locator = {}
    if row.get('source_page'):
        locator['page'] = int(row['source_page'])
    if row.get('source_row'):
        locator['row'] = int(row['source_row'])
    if locator:
        post['locator'] = locator
    return post


def load_political_posts(person_of_row):
    """The six documents, as one list of posts plus the coverage table."""
    posts = []

    name = 'political-posts-foreign-affairs.csv'
    for row in csvio.read(name)[1]:
        post = post_base(name, row, 'Ministry of Foreign Affairs',
                         row['designation'])
        post['jobType'] = row['job_type']
        if row['stated_total']:
            post['statedTotal'] = float(row['stated_total'])
        posts.append(post)

    name = 'political-posts-health.csv'
    for row in csvio.read(name)[1]:
        post = post_base(name, row, row['office'], row['designation'])
        if row['employed_date']:
            post['occupiedFrom'] = row['employed_date']
        posts.append(post)

    name = 'political-posts-finance.csv'
    for row in csvio.read(name)[1]:
        post = post_base(name, row, row['office'], row['designation'])
        post['holderName'] = row['name']
        # Minted by load_appointees() from this same sheet. Never a roster
        # person: see the note there.
        if person_of_row.get(row['row_id']):
            post['personId'] = person_of_row[row['row_id']]
        for column, field in (('occupied_date', 'occupiedFrom'),
                              ('termination_date', 'terminatedOn'),
                              ('rejoined_date', 'rejoinedOn')):
            if row[column]:
                post[field] = row[column]
        if row['basic_after_10pct_deduction']:
            post['basicAfterDeduction'] = int(row['basic_after_10pct_deduction'])
        posts.append(post)

    name = 'political-posts-education.csv'
    for row in csvio.read(name)[1]:
        # The scan's designation column is Thaana and was not transcribed. The
        # rank is read off the pay ladder instead, so the designation shown is
        # the rank's own label rather than the document's words.
        post = post_base(name, row, 'Ministry of Education and Higher Education',
                         RANK_LABELS.get(row['rank'], ''))
        if row['occupied_date']:
            post['occupiedFrom'] = row['occupied_date']
        if row['status']:
            post['note'] = EDUCATION_STATUS[row['status']]
        posts.append(post)

    name = 'political-posts-aggregate.csv'
    for row in csvio.read(name)[1]:
        post = post_base(name, row, row['office'], row['designation'])
        if row['stated_total_min']:
            post['statedTotalRange'] = {'min': int(row['stated_total_min']),
                                        'max': int(row['stated_total_max'])}
        if row['note']:
            post['note'] = row['note']
        posts.append(post)

    coverage = []
    for row in csvio.read('political-posts-coverage.csv')[1]:
        entry = {
            'bodyId': row['body_id'],
            'bodyName': row['body_name'],
            'answerKind': row['answer_kind'],
            'postsItemised': int(row['posts_itemised']),
            'sources': [row['source_id']],
        }
        if row['as_of']:
            entry['asOf'] = row['as_of']
        if row['posts_stated']:
            entry['postsStated'] = int(row['posts_stated'])
        if row['note']:
            entry['note'] = row['note']
        coverage.append(entry)

    return posts, coverage


def latin_slug(text):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', (text or '').lower())).strip('-')


def load_appointees():
    """Person and Position records for the 34 named political appointees.

    Finance is the only one of the six documents that names anybody, so it is
    the only one that can produce people. They are real Person records rather
    than strings on a row: the site is a record of public figures, and a
    minister named in an official pay disclosure is one.

    Two identity rules, and neither is negotiable:

    - Rows are collapsed within THIS document only, on an exact name match.
      One ministry listing its own staff is one authority, and two rows with
      the same name are that authority saying "this person, twice" - Mohamed
      Anas moves from deputy minister to president of the PCB on the day the
      first post ends. Nothing is collapsed across documents.
    - Nothing is EVER joined to the Majlis roster. These rows carry no
      constituency, so the folded-name-plus-exact-constituency rule cannot be
      satisfied, and anything looser attaches one person's record to another
      with nothing downstream to reveal it. Names that also appear on the
      roster are written to the review file for a human, and that is all.
    """
    persons, positions, person_of_row = {}, [], {}
    for row in csvio.read('political-posts-finance.csv')[1]:
        name = row['name'].strip()
        if not name:
            continue
        pid = f'appointee-{latin_slug(name)}'
        if pid not in persons:
            persons[pid] = {
                'id': pid,
                'name': name,
                # The sheet is Latin only. nameDv is absent rather than empty:
                # this is a person no source has printed in Thaana, and so one
                # who can never be roster-joined.
                'title': None,
                'sources': [row['source_id']],
            }
        positions.append({
            'id': f'{pid}--{row["row_id"]}',
            'personId': pid,
            'kind': 'minister' if row['rank'] in ('minister', 'state-minister')
                    else 'other',
            'organisation': row['office'],
            'start': row['occupied_date'],
            'end': row['termination_date'] or None,
            'basis': 'stated',
            'basisNote': 'Stated by the ministry\'s own list of political '
                         'appointees, which gives the post and the date it was '
                         'taken up.',
            'sources': [row['source_id']],
        })
        person_of_row[row['row_id']] = pid
    return list(persons.values()), positions, person_of_row


RANK_LABELS = {
    'minister': 'Minister',
    'state-minister': 'Minister of State',
    'deputy-minister': 'Deputy Minister',
    'senior-political-director': 'Senior Political Director',
    'political-director': 'Political Director',
}


# ---------------------------------------------------------------------------
# Airport VIP
#
# One claim per member per term. The 18th and 19th price every movement at
# USD 60 and convert at 15.42; the 20th prints a flat rufiyaa charge and no
# dollar figure. Each document's own figures are published as it prints them,
# and the two are never reconciled.
#
# The joins are the interesting part, and they are two different joins:
#
#   18th, 19th   Latin only. The Latin constituency is the key AGENTS.md
#                records as DRIFTING between terms, so the term number is
#                carried into the key and the match must be unique within it.
#   20th         Thaana, which is the stable key everything else uses.
#
# Nothing is merged on a name alone, and an unmatched row is written to the
# review file rather than attached to the nearest plausible person.
# ---------------------------------------------------------------------------

VIP_TERMS = {
    'vip-18th-majlis.csv': 18,
    'vip-19th-majlis.csv': 19,
    'vip-20th-majlis.csv': 20,
}


def latin_key(text):
    """Lowercase, letters and digits only, and no trailing "dhaaira".

    "Medhu Henveyru", "Medhuhenveyru" and "medhu henveyru" are the same seat
    written three ways across two documents. The roster also suffixes every
    constituency with "Dhaaira" - the word for constituency - where the VIP
    tables do not, so that suffix goes too. Spacing, case and that one word
    are all this folds; anything beyond is a judgement and goes to a human.
    """
    key = re.sub(r'[^a-z0-9]+', '', (text or '').lower())
    return re.sub(r'dhaaira+$', '', key)


def build_vip_index(persons, positions):
    """Two indexes per term: seats by folded constituency, and by folded name.

    Both keys are exact after folding. Nothing here scores similarity or picks
    a nearest match.
    """
    by_id = {p['id']: p for p in persons}
    seats, names = {}, {}
    for position in positions:
        if position.get('kind') != 'majlis-member' or position.get('basis') != 'stated':
            continue
        person = by_id.get(position.get('personId'))
        if not person:
            continue
        for term in position.get('termNumbers') or []:
            for key, value in (
                    (latin_key(position.get('constituency')), seats),
                    (fold_for_match(position.get('constituencyDv')), seats),
            ):
                if key:
                    value.setdefault((term, key), set()).add(person['id'])
            for key, value in (
                    (latin_key(person.get('name')), names),
                    (fold_for_match(person.get('nameDv')), names),
            ):
                if key:
                    value.setdefault((term, key), set()).add(person['id'])
    return seats, names


def vip_keys(row, term):
    """The row's constituency and name keys, in whichever script it prints."""
    if row.get('name_dv'):
        return ((term, fold_for_match(row['constituency_dv'])),
                (term, fold_for_match(row['name_dv'])))
    return ((term, latin_key(row['constituency'])),
            (term, latin_key(row['name'])))


def load_vip(persons, positions, sources_by_id):
    """VIP claims, plus the rows no roster seat could be found for.

    THE JOIN, and why it is two keys rather than one.

    Each document drifts on a different axis, and on the other it is exact.
    The 19th spells constituencies its own way - "Medhuhenveyru" for the
    roster's "Medhu Henveyru" - while every one of those members' names is on
    the roster verbatim. The 18th does the reverse: its constituencies match
    exactly and its names do not, printing "Eva Abdulla" for "Eeva Abdulla"
    and "Hon. Mohamed Ismail" without the honorific.

    So a seat is claimed only when the two keys agree, or when one of them
    resolves uniquely and the other contradicts nothing:

      1. Both keys resolve and land on the same single person -> match.
      2. Both resolve and disagree -> review. That is a contradiction, and
         guessing which key to believe is exactly how a wrong merge happens.
      3. One key resolves to exactly one person and the other resolves to
         nobody -> match. A constituency returns one member per parliament
         and a name is unique within one, so each is a real key; the silent
         one is a spelling the two documents disagree about, not evidence.
      4. Anything else -> review.

    A constituency is NOT unique per term in the VIP tables: the 18th lists
    Dhiggaru twice, for Ahmed Nazim and then Ahmed Faris Maumoon, which is a
    mid-term replacement. So where a constituency carries two rows the name
    has to break the tie, and rule 3 is deliberately blocked for it.
    """
    seats, names = build_vip_index(persons, positions)
    claims, unmatched = [], []

    for name, term in VIP_TERMS.items():
        rows = csvio.read(name)[1]
        # Constituencies this document lists more than once: a replacement
        # mid-term, where the seat alone cannot say which holder a row means.
        shared = {key for key in
                  [vip_keys(row, term)[0] for row in rows]
                  if [vip_keys(r, term)[0] for r in rows].count(key) > 1}

        for row in rows:
            if not row['movements']:
                continue
            seat_key, name_key = vip_keys(row, term)
            by_seat = seats.get(seat_key, set())
            by_name = names.get(name_key, set())

            both = by_seat & by_name
            if len(both) == 1:
                person_id = next(iter(both))
            elif by_seat and by_name:
                unmatched.append((name, row, sorted(by_seat | by_name),
                                  'the constituency and the name point at '
                                  'different members'))
                continue
            elif len(by_seat) == 1 and seat_key not in shared:
                person_id = next(iter(by_seat))
            elif len(by_name) == 1:
                person_id = next(iter(by_name))
            else:
                unmatched.append((name, row, sorted(by_seat | by_name),
                                  'no unique seat'))
                continue

            source = sources_by_id[row['source_id']]
            claim = {
                'id': row['row_id'],
                'personId': person_id,
                'type': 'expenditure',
                'subtype': 'airport-vip',
                'amount': round(float(row['total_mvr'] or 0), 2),
                'currency': 'MVR',
                'units': int(row['movements']),
                'unitLabel': 'airport VIP movements',
                'periodStart': source['periodStart'],
                'periodEnd': source['periodEnd'],
                'locator': {'page': int(row['source_page']),
                            'row': int(row['source_row'])},
                'sources': [row['source_id']],
            }
            if row.get('total_usd'):
                # The 18th and 19th state the dollar figure and the rate they
                # converted at. Carried as a note rather than a second amount:
                # the claim is one payment, not two.
                claim['note'] = (
                    f'USD {float(row["total_usd"]):,.2f} for '
                    f'{row["movements"]} movements at USD '
                    f'{float(row["rate_usd"]):,.2f} each, converted at 15.42.')
            claims.append(claim)

    return claims, unmatched


def load_passports(persons, positions):
    """The 87 members of the 20th Majlis who took a diplomatic passport.

    Joined exactly as the VIP rows are, and against the same 20th-Majlis
    roster. A holder we cannot place is dropped rather than guessed: the list
    is a fact about named people, and attaching one to the wrong member is the
    failure this whole join exists to avoid.
    """
    seats, names = build_vip_index(persons, positions)
    held, unmatched = [], []
    for row in csvio.read('diplomatic-passports-20th-majlis.csv')[1]:
        seat_key, name_key = vip_keys(row, 20)
        by_seat = seats.get(seat_key, set())
        by_name = names.get(name_key, set())
        both = by_seat & by_name
        if len(both) == 1:
            person_id = next(iter(both))
        elif by_seat and by_name:
            unmatched.append((row, sorted(by_seat | by_name)))
            continue
        elif len(by_seat) == 1:
            person_id = next(iter(by_seat))
        elif len(by_name) == 1:
            person_id = next(iter(by_name))
        else:
            unmatched.append((row, sorted(by_seat | by_name)))
            continue
        held.append({'personId': person_id, 'sources': [row['source_id']]})
    return held, unmatched


def load_sources():
    """sources.csv -> Source records, in file order.

    Empty cells are dropped rather than emitted as empty strings: an absent
    optional field and a present but blank one are different claims about the
    document, and the schema's optionals mean the first.
    """
    _, rows = csvio.read('sources.csv')
    keys = [('title', 'title'), ('title_dv', 'titleDv'), ('publisher', 'publisher'),
            ('url', 'url'), ('reference', 'reference'), ('kind', 'kind'),
            ('period_start', 'periodStart'), ('period_end', 'periodEnd'),
            ('retrieved', 'retrieved')]
    out = []
    for row in rows:
        source = {'id': row['source_id']}
        for column, field in keys:
            if row.get(column):
                source[field] = row[column]
        if row.get('checksum_total'):
            source['checksumTotal'] = int(row['checksum_total'])
        out.append(source)
    return out


def load_terms():
    _, rows = csvio.read('terms.csv')
    return [{'number': int(r['term_number']), 'start': r['start'],
             'end': r['end'] or None} for r in rows]


def load_roster(terms):
    """majlis-roster.csv -> one person per member id, one position per term."""
    bounds = {t['number']: t for t in terms}
    _, rows = csvio.read('majlis-roster.csv')

    persons, positions = {}, []
    for row in rows:
        member_id = int(row['majlis_id'])
        term = int(row['term'])
        key = f'majlis-{member_id}'
        if key not in persons:
            persons[key] = {
                'id': key,
                'majlisId': member_id,
                'name': row['name'],
                'nameDv': row['name_dv'],
                'title': None,
                'photoUrl': row['photo_url'] or None,
                'sources': [row['source_id']],
            }
        positions.append({
            'id': f'{key}--majlis-{term}',
            'personId': key,
            'kind': 'majlis-member',
            'constituency': row['constituency'],
            'constituencyDv': row['constituency_dv'],
            'termNumbers': [term],
            'start': bounds[term]['start'],
            'end': bounds[term]['end'],
            'party': row['party'] or None,
            'seatNo': int(row['seat_no']) if row['seat_no'] != '' else None,
            'basis': 'stated',
            'basisNote': 'Membership is stated by the official roster for this '
                         "parliament. Dates are the term's own bounds, so a "
                         'member seated mid-term shows the term start.',
            'sources': [row['source_id']],
        })
    return list(persons.values()), positions


def load_speakers():
    _, rows = csvio.read('majlis-speakers.csv')
    return [{
        'id': row['row_id'],
        'personId': None,          # resolved against the roster below
        'personNameLatin': row['name'],
        'kind': 'speaker',
        'organisation': "People's Majlis",
        'start': row['start'],
        'end': row['end'] or None,
        'basis': 'stated',
        'sources': [row['source_id']],
    } for row in rows]


def term_for(fiscal_year, terms):
    start = int(fiscal_year.split('-')[0])
    for term in terms:
        # A term with no end is the one still sitting, so it has no upper bound.
        end = int(term['end'][:4]) if term['end'] else 9999
        if int(term['start'][:4]) <= start < end:
            return term['number']
    return terms[-1]['number']


def load_premiums(terms):
    """premium-payments.csv -> persons, inferred positions and claims.

    The fiscal-year column headers are the year vocabulary. There is no
    separate file for them: a second place to edit is a sync bug waiting to
    happen, and the disclosure is what defines the years in the first place.
    """
    header, rows = csvio.read('premium-payments.csv')
    years = [c for c in header if FISCAL_YEAR.match(c)]

    # The CSV is in document order so it reads beside the PDF. The graph has
    # always been ordered by total; nothing downstream depends on that, but
    # keeping it means a data change shows up in review as a data change.
    rows = sorted(rows, key=lambda r: (
        -sum(int(r[y]) for y in years if r[y]), r['name']))

    persons, positions, claims, notes = [], [], [], []
    for row in rows:
        pid = row['row_id']
        persons.append({
            'id': pid,
            'name': row['name'],
            'nameDv': row['name_dv'],
            'title': row['title'] or None,
            'titleDv': row['title_dv'] or None,
            'possiblySameAs': None,
            'sources': [row['source_id']],
        })

        paid = [y for y in years if row[y]]
        if not paid:
            # A row printed with no amount in any year. We can record that the
            # person appears in the disclosure, but not a term or a payment.
            notes.append(f'{pid}: listed in the disclosure with no amount in any year')
            continue

        positions.append({
            'id': f'{pid}--majlis',
            'personId': pid,
            'kind': 'majlis-member',
            'constituency': row['constituency'],
            'constituencyDv': row['constituency_dv'],
            'termNumbers': sorted({term_for(y, terms) for y in paid}),
            'start': year_bounds(paid[0])[0],
            'end': year_bounds(paid[-1])[1],
            # The disclosure records payments, not membership. Payment in a
            # fiscal year strongly implies the seat was held, but the source
            # never says so, so the app must not claim it did.
            'basis': 'inferred',
            'basisNote': 'Derived from the fiscal years in which a premium was paid; '
                         'the source discloses payments, not terms of service.',
            'sources': [row['source_id']],
        })

        for fy in paid:
            period_start, period_end = year_bounds(fy)
            claims.append({
                'id': f'{pid}--premium--{fy}',
                'personId': pid,
                'type': 'expenditure',
                'subtype': 'health-insurance-premium',
                'amount': int(row[fy]),
                'currency': 'MVR',
                'fiscalYear': fy,
                'periodStart': period_start,
                'periodEnd': period_end,
                'locator': {'page': int(row['source_page']),
                            'row': int(row['source_row'])},
                'sources': [row['source_id']],
            })

    return persons, positions, claims, years, notes


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
        key = (fold_for_match(person.get('nameDv')),
               fold_for_match(position.get('constituencyDv')))
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
        key = (fold_for_match(person.get('nameDv')),
               fold_for_match(seat.get('constituencyDv')))
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
    # Validation runs first and aborts the build. A graph written from a CSV
    # that failed a check is an artefact nobody can trust, and it would be
    # committed before anyone looked at it.
    validate.run_or_exit()

    sources = load_sources()
    terms = load_terms()

    # The roster is the authority on who served, so it loads first and the
    # disclosure resolves onto it.
    persons, positions = load_roster(terms)
    positions += load_speakers()
    premium_persons, premium_positions, claims, fiscal_years, warnings = (
        load_premiums(terms))
    persons += premium_persons
    positions += premium_positions
    appointee_persons, appointee_positions, person_of_row = load_appointees()
    persons += appointee_persons
    positions += appointee_positions
    political_posts, post_coverage = load_political_posts(person_of_row)

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
        if person['id'].startswith('appointee-'):
            # Named in a ministry's own pay sheet, which prints no Thaana and
            # no constituency. There is no key to join on, so they are never
            # candidates here; check_appointee_names() flags the collisions.
            continue
        name = fold_for_match(person.get('nameDv'))
        # An unmerged person's constituency lives on their own position.
        own = [p for p in positions if p.get('personId') == person['id']]
        keys = {(name, fold_for_match(p.get('constituencyDv'))) for p in own}
        matches = set()
        for key in keys:
            matches |= index.get(key, set())

        if len(matches) == 1:
            target = matches.pop()
            remap[person['id']] = target
            merged.append((person, target))
            roster = persons_by_id[target]
            # The disclosure prints an honorific the roster omits; keep both
            # the Latin label and the original Thaana form.
            if person.get('title') and not roster.get('title'):
                roster['title'] = person['title']
                roster['titleDv'] = person.get('titleDv')
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
            latin_index.setdefault(norm(person['name']).lower(), set()).add(person['id'])
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
        by_name.setdefault(norm(person.get('nameDv')) or person['name'], []).append(person)
    for group in by_name.values():
        if len(group) > 1:
            ids = [p['id'] for p in group]
            for person in group:
                person['possiblySameAs'] = [i for i in ids if i != person['id']]

    # After every identity is settled, so a VIP row joins the person the
    # roster and the premium disclosure already agreed on.
    vip_claims, vip_unmatched = load_vip(
        kept_persons, kept_positions, {s['id']: s for s in sources})
    claims += vip_claims
    passports, passports_unmatched = load_passports(kept_persons, kept_positions)

    graph = {
        'meta': {
            'generatedBy': 'scripts/ingest/build_graph.py',
            'datasets': sorted(s['id'] for s in sources),
            # Published, not buried: the VIP page states its own coverage gap,
            # and it can only do that if the number reaches it.
            'vipRowsUnmatched': len(vip_unmatched),
        },
        'sources': sources,
        'persons': kept_persons,
        'positions': final_positions,
        'claims': claims,
        'politicalPosts': political_posts,
        'politicalPostCoverage': post_coverage,
        'diplomaticPassports': passports,
        'fiscalYears': fiscal_years,
        'terms': terms,
        'warnings': warnings,
    }

    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)
        fh.write('\n')

    write_review(ambiguous, unmatched, speakers_unresolved,
                 appointee_collisions(kept_persons), vip_unmatched)

    orphan_claims = sum(
        1 for c in claims if c['personId'] not in {p['id'] for p in kept_persons})

    print(f'wrote {os.path.relpath(OUT, ROOT)}')
    print(f'  persons            {len(kept_persons)}')
    print(f'  political posts    {len(political_posts)} '
          f'across {len(post_coverage)} bodies')
    print(f'  VIP claims         {len(vip_claims)} '
          f'({len(vip_unmatched)} rows unmatched)')
    print(f'  passport holders   {len(passports)} '
          f'({len(passports_unmatched)} rows unmatched)')
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


def appointee_collisions(persons):
    """Appointee names that also appear on the Majlis roster.

    Reported, never merged. A former MP taking a ministry post is common and
    interesting, but a shared name is not evidence of it: these rows carry no
    constituency, which is the half of the key that makes a match safe.
    """
    roster = {}
    for person in persons:
        if person.get('majlisId') is not None:
            roster.setdefault(norm(person['name']).lower(), []).append(person['id'])
    out = []
    for person in persons:
        if not person['id'].startswith('appointee-'):
            continue
        hits = roster.get(norm(person['name']).lower())
        if hits:
            out.append((person, sorted(hits)))
    return out


def write_review(ambiguous, unmatched, speakers_unresolved, appointees=(),
                 vip_unmatched=()):
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
            lines.append(f'- **{person["name"]}** ({person.get("nameDv", "")}) -> '
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
        for person in sorted(unmatched, key=lambda p: p['name']):
            lines.append(f'- **{person["name"]}** ({person.get("nameDv", "")}) `{person["id"]}`')
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

    lines += [
        '',
        '## Political appointees whose name also appears on the roster',
        '',
        'A former member taking a ministry post is common, and these are the',
        'candidates. Nothing here is merged: the pay sheets carry no',
        'constituency, which is the half of the key that makes a match safe.',
        'Confirming one is a human decision and needs a second source.',
        '',
    ]
    if appointees:
        for person, hits in sorted(appointees, key=lambda pair: pair[0]['name']):
            lines.append(f'- **{person["name"]}** `{person["id"]}` -> '
                         + ', '.join(f'`{h}`' for h in hits))
    else:
        lines.append('_None._')

    lines += [
        '',
        '## VIP rows with no matching roster seat',
        '',
        'A row is claimed only when the constituency and the name agree on',
        'one member, or when one of them resolves uniquely and the other',
        'resolves to nobody. A row where the two keys point at DIFFERENT',
        'members is the dangerous case and is never guessed: it is left out',
        'of the graph and listed here with the reason.',
        '',
    ]
    if vip_unmatched:
        for name, row, matches, why in vip_unmatched:
            found = ', '.join(f'`{m}`' for m in matches) or 'no candidate'
            lines.append(f'- `{name}` row {row["source_row"]}: '
                         f'**{row["name"]}** ({row["constituency"]}) -> {found} '
                         f'- _{why}_')
    else:
        lines.append('_None._')

    os.makedirs(os.path.dirname(REVIEW), exist_ok=True)
    io.open(REVIEW, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
