<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MP Watch

A public accountability record of Maldivian public figures. Its entire value is
that its claims hold up, so correctness outranks speed and features here.

## Working agreement

- **Work on a branch and open a PR.** Do not push to `main`: it auto-deploys to
  a live public URL.
- Run `pnpm lint` and `pnpm build` before opening a PR. Both must pass.
- Commit messages explain *why*, and name the trap avoided where one exists.

## Commands

```bash
pnpm dev                                        # localhost:3000
pnpm build                                      # prerenders every page, both languages
pnpm lint

pip install -r scripts/ingest/requirements.txt
python scripts/ingest/extract_allowances.py     # -> src/data/parts/allowances.json
python scripts/ingest/majlis_members.py         # -> src/data/parts/majlis-members.json
python scripts/ingest/build_graph.py            # -> src/data/graph.json + docs/identity-review.md
```

Ingests write a *partial graph* to `src/data/parts/`. `build_graph.py` merges
them and resolves identities. Fetched pages and source PDFs are cached under
`scripts/ingest/source/` and committed, so a build reproduces without depending
on a government site being up or unchanged.

## The data model

Everything is the same shape: **a claim about a person, over a period, with a
source**. Spending, income, pledges, delivery, attendance and allegations are
claim *types* in `src/lib/schema.ts`, not separate schemas. A new dataset adds a
variant to `Claim`; it does not add a table.

- `Claim["sources"]` is `[SourceRef, ...SourceRef[]]`, a non-empty tuple. **A
  claim with no source does not compile.** Do not weaken this.
- `AllegationClaim` requires a `status`. Publishing an allegation without its
  current status is how this project causes real harm.
- The timeline is derived in `registry.timeline()`, never stored.
- `src/lib/registry.ts` is the only module that reads the graph.

## What the money is (read before writing any copy about it)

The premium is priced **per covered head** and the policy covers the member
**and their dependents**. `src/lib/premium.ts` holds the rates and the helpers.

- MVR 24,000 per head per year from 2016-2017, **stated** by the RTI disclosure.
- MVR 12,500 for 2014-2016, **inferred** from the exact GCD of every row in
  those years. Never present that one as a quotation.
- Every row divides exactly by the rate in force. Use it as an extraction check.
- **Never state a head count for a named person.** 22 of 93 rows in the RTI
  period are odd multiples, so cover changed within the period and no integer
  dependent count is recoverable. Decompose aggregates only.
- Never roll these figures into a salary or income total, and never describe
  them as money a member received.

## Rules that are not negotiable

1. **Never assert more than the source says.** Positions carry
   `basis: "stated" | "inferred"`, and inferred ones show their reasoning in the
   UI. The premium disclosure records *payments*, not terms of service.
2. **Never auto-merge people on a fuzzy match.** The join needs a folded name
   match *and* an exact constituency match, and merges only when unique.
   Everything else goes to `docs/identity-review.md` for a human. A wrong merge
   attaches one person's spending, votes or allegations to another and nothing
   downstream reveals it.
3. **Every external comparator carries its source** (`src/lib/comparators.ts`).
   No remembered figures, no round numbers chosen because they read well.
4. **Party belongs to a Position, never to a Person.** Six independents crossed
   to PNC within four days of the 2024 election; an undated party label is wrong.

## Traps this codebase has already paid for

Each of these cost real debugging. Do not rediscover them.

### Thaana

- **PDFs store Thaana in visual order**: characters reversed within a word, and
  cell words running left to right. `scripts/ingest/thaana.py` undoes both.
  Beware: naive de-reversal also reverses ASCII digit runs, so a header reading
  `42` may be `24` in the document.
- **Two government documents spell the same name differently.** The roster
  writes Mahloof with `ޙ`, the disclosure with `ޚ`; one ends Muaz in
  sukun, the other in *u*. `fold_for_match()` folds thikijehi letters to plain
  counterparts and drops fili. Use it for matching only, **never for display**.
- **Thaana renders optically smaller and thinner than Latin** at the same size.
  The size bump lives on `html[lang="dv"]` and `[lang="dv"]:not(html)` —
  attribute selectors, which match only elements carrying `lang`, so the scale
  cannot compound on nesting.
- **MV Iyyu is a single-weight font** with its own ASCII glyphs. It is scoped by
  `unicode-range` to the Thaana block so it does not claim the digits, and
  `font-synthesis-weight` is off so the browser cannot smear a fake bold.
- **Figures need `.numeral`**, which isolates direction. Without it `2014-2025`
  renders as `2025-2014` inside a Dhivehi sentence.

### Tailwind v4

- Tokens declared in `@theme inline` are substituted at definition time and are
  **not usable as runtime CSS variables**. `font-family: var(--font-mono)`
  resolved to nothing, became invalid at computed-value time and — being an
  inherited property — silently fell back to the parent font. Reference the
  variable `next/font` actually sets (`--font-mono-latin`).

### The Majlis sources

- **Member ids are reissued every parliament** (18th = 1-85, 19th = 86-174,
  20th = 175-268). The roster arrives as person-*terms*; collapse them before
  anything else joins to them.
- **The Latin constituency name drifts between terms** ("Hithadhoo Uthuru
  Dhaaira" becomes "North Hithadhoo") while the Thaana is stable. Join on Thaana.
- **The member cards, not the seating-chart JSON, are the roster.** The `var
  data` array covers only currently-charted seats and is short for older terms.
  The anchor wraps the card and sits *before* it, so parsing must be
  anchor-scoped or every member gets the next member's party.
- **Number formats vary within one PDF**: `12,500`, `120000.00` and `-` for nil
  all appear. Match amounts on shape, not on a separator. Keying on the comma
  silently classified plain-decimal amounts as name text and lost MVR 216,000.
- **The disclosure's own row numbers are unreliable** — 11 repeat, 5 are
  skipped. Never use them as identity.

### Deployment

- **The first CLI deploy from the production branch goes to production**, with
  or without `--prod`. Use branches and PRs.
- The site is **public but noindex** until launch. Crawling is deliberately
  *allowed*: a `Disallow: /` would stop crawlers reading the noindex, leaving a
  shared URL indexable with no content. One constant, `ALLOW_INDEXING` in
  `src/lib/site.ts`, drives the meta tag, the header and robots.txt together.
- `registry.primarySource()` looks the disclosure up **by kind**, not by index.
  It was `sources[0]`, which broke silently when a second ingest was added.

## Known gaps

Read `docs/data-sources.md` before promising a feature. It records 67 verified
sources and, more importantly, what does not exist:

- **No structured campaign-pledge source anywhere.** Promised-vs-delivered has a
  solved delivered side and no promised side.
- **Asset declarations are unparseable** — 22-page scans of hand-filled Thaana
  with no text layer. Do not promise structured asset or income data. Filed /
  not filed / N filings is honest and is itself a real signal.
- **ACC data stops at 2021.** A four-year hole in the corruption record.
- **No constituency-to-island mapping is published.** It must be built by hand
  and blocks every constituency-level rollup.
