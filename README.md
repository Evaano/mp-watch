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
python scripts/ingest/extract_allowances.py    # -> src/data/parts/allowances.json
python scripts/ingest/majlis_members.py        # -> src/data/parts/majlis-members.json
python scripts/ingest/build_graph.py           # -> src/data/graph.json
```

Each ingest writes a partial graph to `src/data/parts/`. `build_graph.py` joins
them and resolves identities. Fetched pages and the source PDF are cached under
`scripts/ingest/source/` and committed, so a build reproduces without depending
on a government site being up or unchanged.

### Sources currently ingested

| Source | Gives us |
|---|---|
| Health insurance premium disclosure (PDF) | 11 years of per-member spending |
| Majlis member rosters, 18th-20th, EN + DV | stated membership, party, official name pair |
| Majlis previous speakers | dated positions back to 1933 |

`docs/data-sources.md` records 67 further sources that were found and verified,
ranked into an ingest roadmap.

### Reading the premium PDF

The extractor reads word positions rather than a text dump, because the PDF
splits values mid-token (`24,000` arrives as `2` + `4,000`) and because a blank
year is meaningful: mapping an amount to the correct fiscal year needs the
x-coordinate of its column.

It matches amounts on **shape, not on a separator**. The disclosure mixes
`12,500`, `120000.00` and `-` for nil across its pages; keying on the comma
silently classified plain-decimal amounts as name text and lost them. This is
safe because Thaana labels never contain ASCII digits.

Thaana runs are stored in that PDF in visual order, character-reversed and with
cell words running left to right. `scripts/ingest/thaana.py` undoes both.

### Identity resolution

Joining the disclosure to the roster is the hard part, and three things make it
harder than it looks:

- **The Majlis reissues member ids every parliament** (18th = 1-85, 19th =
  86-174, 20th = 175-268), so the roster arrives as person-*terms*. They are
  collapsed into people before anything else joins to them.
- **The Latin constituency name drifts between terms** ("Hithadhoo Uthuru
  Dhaaira" becomes "North Hithadhoo") while the Thaana one is stable. The join
  therefore runs on Thaana.
- **Two government documents spell the same name differently.** The roster
  writes Mahloof with `ޙ`, the disclosure with `ޚ`; the roster writes
  Muaz ending in sukun, the disclosure ending in *u*. `fold_for_match()` folds
  thikijehi letters to their plain counterparts and drops fili, leaving a
  consonant skeleton. Measured against the two sources held here, folding gains
  8 further matches and adds **no** new key collisions.

The join requires a folded name match **and** an exact constituency match, and
merges only when the result is unique. Everything else is written to
`docs/identity-review.md` for a human. Fuzzy-matching Maldivian names would
attach one person's spending, votes or allegations to another, and nothing
downstream would reveal that it had happened.

Current output: **278 people, 320 positions, 1,769 claims, MVR 92,451,000**,
zero parse warnings, 217 of 266 disclosure records auto-joined to the roster
with **zero ambiguous matches**, and 49 left for review.

### Four things the data does not claim

- **The disclosure's row numbers are unreliable.** They repeat 11 values and
  skip 5, so they are never used as identity.
- **People are never auto-merged across a name boundary.** Records that share a
  name link to each other via `possiblySameAs` rather than being combined.
- **Positions say how they are known.** Roster positions are `basis: "stated"`;
  positions derived only from payment years are `basis: "inferred"` and show
  their reasoning in the UI.
- **Party is a property of a position, not of a person.** Six independents
  crossed to PNC within four days of the 2024 election, so an undated party
  label would be wrong.

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
src/data/parts/     one partial graph per ingest
src/data/graph.json merged graph, committed so data changes are reviewable
docs/               data source survey and the identity review queue
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
