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
| Data | Entity/claim graph as static JSON in `src/data/graph.json` |
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

## Data model

Everything this project holds is the same shape: **a claim about a person, over
a period, with a source**. Spending, income, pledges, delivery, attendance and
allegations are therefore claim *types* in `src/lib/schema.ts`, not separate
schemas. A new dataset adds a variant to `Claim`; it does not add a table.

```
Source   what we read it from
Person   who the claim is about
Position a public office held, with dates  -> the timeline comes from these
Claim    a typed, dated, cited assertion
```

Two consequences worth stating:

- **Citations are a type error to omit.** `Claim["sources"]` is
  `[SourceRef, ...SourceRef[]]`, so a claim with no source does not compile.
- **The timeline is derived, not stored.** `registry.timeline()` merges dated
  positions and claims, so a new claim type appears on every profile timeline
  without touching the view.

`AllegationClaim` requires a `status` field (alleged / charged / convicted /
acquitted / dismissed / withdrawn) and carries an optional right-of-reply,
because publishing an allegation without its current status is how a project
like this causes real harm.

## Data pipeline

```bash
pip install -r scripts/ingest/requirements.txt
python scripts/ingest/extract_allowances.py     # -> src/data/graph.json
```

The source PDF is vendored at `scripts/ingest/source/mps-allowance.pdf` so the
build is reproducible without a network fetch.

The extractor reads word positions rather than a text dump, because the PDF
splits values mid-token (`24,000` arrives as `2` + `4,000`) and because a blank
year is meaningful: mapping an amount to the correct fiscal year needs the
x-coordinate of its column.

It also matches amounts on **shape, not on a separator**. The disclosure mixes
`12,500`, `120000.00` and `-` for nil across its pages; keying on the comma
silently classified plain-decimal amounts as name text and lost them. This is
safe to do because Thaana labels never contain ASCII digits.

Thaana runs are stored in the PDF in visual order, character-reversed and with
cell words running left to right. `scripts/ingest/thaana.py` undoes both and
provides the transliteration used for slugs and Latin search.

Current output: **266 people, 266 positions, 1,769 claims, MVR 92,451,000,
zero parse warnings**, with every row in the source document accounted for.

### Three things the data does not claim

- **The source's own row numbers are unreliable.** They repeat 11 values and
  skip 5. Identity is therefore `(name, constituency)`, never the printed row
  number.
- **People are never auto-merged.** Some names appear against more than one
  constituency. Some of those are one person after a redistricting; others are
  two different people who share a name. Deciding which needs a human, so the
  records stay separate and each links to the other via `possiblySameAs`.
- **Positions from this source are inferred, and say so.** The disclosure
  records payments, not terms of service. A payment in a fiscal year strongly
  implies the seat was held, but the source never states it, so every position
  carries `basis: "inferred"` and shows its reasoning in the UI.

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
src/data/           generated graph, committed so data changes are reviewable
src/lib/            schema, registry (data access), i18n, formatting
src/components/     shared UI
src/app/[lang]/     routes
```

`src/lib/registry.ts` is the only module that reads the graph, so moving to a
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
