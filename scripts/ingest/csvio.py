# -*- coding: utf-8 -*-
"""Read and write the committed CSVs in `data/`.

Those CSVs are the correction surface: someone who spots a wrong value fixes
the CSV and rebuilds, without touching Python or re-reading a PDF. That only
holds if an extractor can never quietly overwrite a hand correction, so
`sync()` compares by default and writes only when asked.

Conventions, all enforced here so no caller can drift from them:

- **UTF-8 with a BOM.** Three bytes, so that double-clicking a file on Windows
  opens it in Excel as UTF-8 rather than cp1252. Without it someone fixes a
  number, saves, and commits destroyed Thaana. `utf-8-sig` strips it on read,
  so no caller ever sees it.
- **LF line endings.** Python's csv module defaults to CRLF, which fights git
  on Windows. Excel reads LF-only CSV without complaint.
- **Minimal quoting.** Thaana holds no commas, quotes or newlines, so Thaana
  cells are never quoted and stay legible in the raw file.
- **No Unicode normalisation.** The bytes are what the source printed.
  Normalising could change what `fold_for_match` sees, and the join runs on it.
"""
import csv
import io
import os

ENCODING = 'utf-8-sig'

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(ROOT, 'data')


def path_for(name):
    return os.path.join(DATA, name)


def read(name):
    """Return (header, rows) for a CSV in `data/`. Rows are plain dicts."""
    with io.open(path_for(name), encoding=ENCODING, newline='') as fh:
        reader = csv.reader(fh)
        header = next(reader)
        rows = [dict(zip(header, r)) for r in reader if any(c.strip() for c in r)]
    return header, rows


def write(name, header, rows):
    os.makedirs(DATA, exist_ok=True)
    with io.open(path_for(name), 'w', encoding=ENCODING, newline='') as fh:
        writer = csv.writer(fh, lineterminator='\n')
        writer.writerow(header)
        for row in rows:
            writer.writerow([row.get(c, '') for c in header])


def sync(name, header, rows, accept, label=None):
    """Compare a fresh extraction against the committed CSV.

    Exits non-zero on any difference unless `accept` is set, in which case the
    report is printed first and then the file is overwritten. The default is
    the dry run on purpose: a human who read the PDF outranks a parser that
    guessed, and the only way to keep that true is to make silent clobbering
    impossible.

    Matching is positional, in document order. A parse that drops or gains a
    row therefore fails loudly instead of re-keying every row after it.
    """
    label = label or name
    if not os.path.exists(path_for(name)):
        write(name, header, rows)
        print(f'wrote data/{name} ({len(rows)} rows, new file)')
        return True

    old_header, old_rows = read(name)
    problems = []

    if old_header != header:
        problems.append(
            f'  header changed\n    committed  {",".join(old_header)}\n'
            f'    extracted  {",".join(header)}')
    else:
        for i in range(max(len(old_rows), len(rows))):
            if i >= len(old_rows):
                problems.append(f'  row {i + 1}: extracted a row the CSV does not have '
                                f'({rows[i].get("row_id", "")})')
                continue
            if i >= len(rows):
                problems.append(f'  row {i + 1}: committed row is missing from the '
                                f'extraction ({old_rows[i].get("row_id", "")})')
                continue
            old, new = old_rows[i], rows[i]
            where = locator(old)
            for column in header:
                a, b = old.get(column, ''), str(new.get(column, ''))
                if a != b:
                    problems.append(
                        f'  row {i + 1}{where} column {column}\n'
                        f'    committed  {a!r}\n    extracted  {b!r}')

    if not problems:
        print(f'data/{name}: {len(rows)} rows, identical to the committed file')
        return True

    print(f'{label}: {len(problems)} difference(s) against data/{name}')
    for p in problems[:40]:
        print(p)
    if len(problems) > 40:
        print(f'  ... and {len(problems) - 40} more')

    if not accept:
        print('\nNothing written. The committed CSV may carry hand corrections.')
        print('Re-run with --accept to discard them and take the extraction.')
        raise SystemExit(1)

    write(name, header, rows)
    print(f'\n--accept: wrote data/{name} ({len(rows)} rows)')
    return True


def locator(row):
    page, no = row.get('source_page', ''), row.get('source_row', '')
    if page and no:
        return f' (page {page}, row {no})'
    if page:
        return f' (page {page})'
    return ''


def amount(text, dp=0):
    """Normalise one printed amount to the canonical CSV form.

    The disclosure prints `12,500`, `120000.00` and `-` for nil in the same
    document. All three collapse to one form here, and `-` and an empty cell
    both become ''. Keying on the comma is what lost MVR 216,000 once already.

    `dp` is for a column whose document genuinely prints cents. The Foreign
    Affairs table states totals to two places while printing the components
    that make them up rounded to whole rufiyaa, so rounding the total would
    discard the only exact figure on the row.
    """
    text = (text or '').strip().replace(',', '')
    if text in ('', '-'):
        return ''
    if dp:
        return f'{float(text):.{dp}f}'
    return str(int(round(float(text))))
