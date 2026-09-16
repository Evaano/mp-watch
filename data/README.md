# data/

These CSVs are the data. Everything the site shows is built from them.

```
source PDFs ──extract_*.py──> data/*.csv ──build_graph.py──> src/data/graph.json
```

If a figure on the site is wrong, fix it here. You do not need Python, and you
do not need to re-read the PDF — edit the cell, run `python
scripts/ingest/build_graph.py`, and commit both the CSV and the rebuilt graph.
The commit message is the audit trail, so say what the source actually prints
and how you know.

## Files

| File | What it is | Written by |
|---|---|---|
| `sources.csv` | Every document anything cites. Nothing else may reference a `source_id` that is not here. | by hand |
| `terms.csv` | Majlis term bounds. An empty `end` means the term is still sitting. | by hand |
| `majlis-roster.csv` | 268 person-*terms*, one row per member per parliament, as the roster publishes them. | `majlis_members.py` |
| `majlis-speakers.csv` | 20 speaker spells. | `majlis_members.py` |
| `premium-payments.csv` | 266 members × 11 fiscal years of health insurance premiums. | `extract_allowances.py` |
| `rti-20th-majlis.csv` | 93 members, one two-year total each, from the RTI disclosure that states the per-head rate. | `rti_20th_majlis.py` |

`rti-20th-majlis.csv` is **not yet built into claims**, deliberately. Its
window (28 May 2024 – 27 May 2026) overlaps the premium disclosure's last
fiscal year, so adding its 93 rows to `graph.claims` would count 2024-2025
twice in every total on the site. The document gives one two-year aggregate
per member and cannot be split, so presenting the two disclosures together is
an editorial decision, not a merge. Until then the rows are read by
`validate.py`, which holds them to the total the document prints for itself.

## Editing rules

**Amounts are plain integers.** No thousands separator, no decimal point, no
currency symbol, no `-`. An empty cell means the document printed nothing, or
printed a nil. The disclosure prints `12,500`, `120000.00` and `-` in the same
file; they all become one canonical form here, and `validate.py` rejects
anything else. Keying on the comma is how MVR 216,000 was lost once already.

**`row_id` is opaque and permanent.** It was seeded from the id the ingest
first minted and is now just data. Correcting a name does *not* rename the
row — that is the whole point. `majlis-roster.csv` has no `row_id` because
`(majlis_id, term)` is an identifier the source itself assigns.

**`source_page` and `source_row` are a locator, not identity.** They tell a
reader where to look. The disclosure's own row numbers are unreliable: 11
repeat and 5 are skipped. Never key on them.

**The `*_dv` columns are the join key, not decoration.** `name_dv` and
`constituency_dv` are what `build_graph.py` matches people on, because the
Latin constituency drifts between terms ("Hithadhoo Uthuru Dhaaira" becomes
"North Hithadhoo") while the Thaana is stable. Nothing renders them. The
folded match key is deliberately *not* stored: a cached fold in a hand-edited
file would keep an old join alive after someone fixed the name, and nothing
downstream would reveal it.

**Print what the document prints.** A typo in a source designation stays; a
figure the document leaves blank stays blank. Where a value needs
interpretation, that happens in `build_graph.py` where it can be labelled.

## Encoding

UTF-8 **with a BOM**, LF line endings, minimal quoting. The BOM is three bytes
and exists so that double-clicking a file on Windows opens it in Excel as
UTF-8 rather than cp1252 — without it, someone fixes a number, saves, and
commits destroyed Thaana. Python reads these with `utf-8-sig`, which strips it.

If your editor shows a row's two Thaana cells in the wrong order, that is bidi
rendering, not corrupt data. The bytes are unambiguous.

## Re-running an extractor

```bash
python scripts/ingest/extract_allowances.py            # compare only
python scripts/ingest/extract_allowances.py --accept   # overwrite the CSV
```

The default compares the fresh extraction against the committed file and fails
on any difference, printing it cell by cell. It writes nothing. A human who
read the PDF outranks a parser that guessed, so discarding hand corrections
takes `--accept` and prints exactly what it is discarding first.

Matching is positional, in document order, so a parse that drops or gains a row
fails loudly instead of silently re-keying every row after it.

## Validating

```bash
python scripts/ingest/validate.py
```

`build_graph.py` runs this first and refuses to build on failure. It checks
encoding, headers, row ids, references into `sources.csv`, the canonical money
form, that every premium divides exactly by the per-head rate in force that
year, that Thaana and Latin have not swapped columns, and that a constituency
is a constituency rather than the bare word `ދާއިރާ` — the shape of a real bug
that sat in committed output for months because the checksum only validated
amounts.
