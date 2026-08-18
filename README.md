# MP Watch

A public record of Maldivian public figures: political history, campaign
pledges, achievements, controversies and documented spending, with every claim
traceable to a source.

The first dataset is the People's Majlis disclosure of health insurance
premiums paid for its members between 28 May 2014 and 27 May 2025.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, semantic tokens in `src/app/globals.css` |
| Data | Static JSON in `src/data/`, generated and git-versioned |
| Ingestion | Python + pdfplumber, in `scripts/ingest/` |
| Rendering | Fully static. Every page is prerendered at build time. |

## Bilingual and RTL

The app ships in English and Dhivehi under `/(en|dv)`. `src/proxy.ts` sends
bare paths to a locale using `Accept-Language`.

Every visible string lives in `src/lib/i18n.ts`. Components never hardcode
copy, and only serializable strings cross into Client Components.

Two things that are easy to get wrong and are handled deliberately:

- **Thaana optical size.** Thaana renders smaller than Latin at an equal
  `font-size`, so it gets a bump. The rules in `globals.css` use attribute
  selectors, which match only elements carrying `lang` and never their
  descendants, so the scale cannot compound.
- **Bidi and figures.** Any number, date range or year sits in `.numeral`,
  which isolates it from the surrounding text direction. Without it, `2014-2025`
  displays as `2025-2014` inside a Dhivehi sentence.

## Data pipeline

```bash
pip install -r scripts/ingest/requirements.txt
python scripts/ingest/extract_allowances.py     # -> src/data/allowances.json
```

The source PDF is vendored at `scripts/ingest/source/mps-allowance.pdf` so the
build is reproducible without a network fetch.

The extractor reads word positions rather than a text dump, because the PDF
splits values mid-token (`24,000` arrives as `2` + `4,000`) and because a blank
year is meaningful: mapping an amount to the correct fiscal year needs the
x-coordinate of its column.

Thaana runs are stored in the PDF in visual order, character-reversed and with
cell words running left to right. `scripts/ingest/thaana.py` undoes both and
provides the transliteration used for slugs and Latin search.

Current output: **266 member records, 11 fiscal years, MVR 92,235,000, zero
parse warnings**, with every row in the source document accounted for.

### Two things the data does not claim

- **The source's own row numbers are unreliable.** They repeat 11 values and
  skip 5. Identity is therefore `(name, constituency)`, never the printed row
  number.
- **Members are never auto-merged.** Some names appear against more than one
  constituency. Some of those are one person after a redistricting; others are
  two different people who share a name. Deciding which needs a human, so the
  records stay separate and each links to the other via `sameNameAs`.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # prerenders every member page in both languages
pnpm lint
```

## Layout

```
scripts/ingest/     PDF -> JSON, plus the Thaana helpers
src/data/           generated JSON, committed so data changes are reviewable
src/lib/            data access, i18n, formatting
src/components/     shared UI
src/app/[lang]/     routes
```

`src/lib/allowances.ts` is the only module that reads the JSON, so moving to a
database later is a change to one file.

## Sourcing standard

This project makes claims about real, named people. Anything beyond neutral
public record (controversies, allegations, pledge tracking) ships only with a
citation to a named, checkable source, and allegations are described as
allegations with their status. Data changes arrive as reviewable diffs, which is
why the dataset is committed rather than kept in a database.

## Source

Health insurance premium disclosure, People's Majlis, via
<https://mvdevsunion.github.io/MPs_allowance/>.
