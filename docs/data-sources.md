# Data source survey

Findings from an automated multi-agent survey of Maldivian public data, run on
2026-08-18. Six domains were swept in parallel (Majlis official, Elections
Commission, oversight bodies, fiscal/PSIP, civic-tech and Wikidata, news
archives). Every candidate URL was then fetched by a separate verification
pass, so what follows is what was actually opened, not what looked plausible.

**67 sources were confirmed to resolve and to hold real data.** Per-source
detail - exact URLs, real formats, sample content, ingest effort and a
USE/MAYBE/REJECT verdict - is in `data-sources.json` beside this file.

Read the gaps section at the end before promising any feature to anyone.

---

# MP Watch — Ingest Roadmap

## Phase 0 — Spine (do first, everything joins to it)

| # | Source | Effort | What ingest involves |
|---|---|---|---|
| 1 | `majlis.gov.mv/{en,dv}/{18,19,20}-parliament/members` | XS | 6 fetches. Parse the inline `var data = [...]` JS array for id/name/constituency/seat/photo; parse `.xbadge` cards for party. Union the 3 rosters → member table + terms-served. **Ingest /en and /dv to get the Latin+Thaana name pair.** |
| 2 | `mvdevsunion/.../master/parliament_data.json` | XS | 1 fetch. Seat-no → majlis member-id crosswalk. Drop element 0 (PascalCase placeholder). |
| 3 | `elections.gov.mv/en/elections/parliamentary/5/candidates` | S | 37 paged fetches. Sole source of **nicknames** — the join key for news/court entity matching. No party field here. |
| 4 | `budget.gov.mv/en/yearly-psip-islands` | XS | 210 island ids (non-contiguous; id 231 = "Multiple Islands"). Needed as gazetteer. Browser UA mandatory. |

Identity resolution is the whole game: build `person` with {majlis_id, seat_no, latin name, thaana name, nickname, constituency, address (from EC Schema B XLSX), party-by-term}. Everything below is a foreign key into it.

---

## Member / term graph
1. **Member directory (3 parliaments)** — above. Terms served = union of rosters.
2. **EC Stat XLSX endpoint** (`stat.elections.gov.mv/Home/DownloadFile?fileName=…`) — 9 working files. Gives candidate **home address**, the best disambiguator for common Maldivian names. Note ri2018/pe2019 are Schema B (no party column); strip fixed-width space padding before joining.
3. **IPU Parline MV-LC01-E20240421** — 1 fetch, aggregate only. Use purely as a reconciliation check: first-term count 67/93, and the documented 6 independents → PNC floor-crossing within 4 days of the 2024 election. **This will silently corrupt any naive party join from election data** — encode party as time-ranged, not a scalar.
4. Wikidata party items (~21 rows, CC0) — canonical party dimension across the PPM/PNC/MRM/Democrats churn.
5. EveryPolitician term-2014.csv — one historical roster, everything else empty. Ingest once, never again.

## Timeline of positions held (with dates)
1. **`/en/speakers-history`** — 1 fetch, plain table, dated start/end back to 1933. The only source anywhere here with real date ranges. Do it in the first hour.
2. **Majlis Registry** (`/20-parliament/majlis-registry`, ?page=1..21) — ~210 text PDFs. Carries *named, dated committee-membership changes* ("X replaced by Y on committee Z"). This is the only way to get start/end dates on committee seats. Extraction is Thaana prose → regex or LLM over sentences, not table parsing.
3. Member profile pages (~290 fetches across 3 parliaments) — committee memberships, but status is only Ongoing/ended, **no dates**. Use as the current-state snapshot that the Registry deltas are applied to.
4. Committee pages (39 ids) — roles (Chair/Vice-Chair), plus former-members split. Also the crawl entry point for the attendance XLSX.
5. OpenSanctions `wd_peps` — 327 MB download for ~65 executive-branch people with dated Occupancy records. Worth one pass for ministers/president only; **CC-BY-NC 4.0, confirm MP Watch is non-commercial before building on it.**

## Attendance & voting — *the flagship feature*
1. **Named division / vote-result sheets** (`/storage/action_files/{work_id}/*.pdf`) — highest-value target on the list. Per-MP Yes/No/Abstain/Not Voted/Not Present with seat id, name, party, constituency. Image-only but a flattened 300 dpi digital Latin print, not a camera scan → near-perfect OCR. Build the pipeline as: discover via the "Votes" block on each parliament-work detail page → OCR fixed columns → **validate row tallies against the printed Present/Yes/No/Abstain totals on page 1.** That checksum lets you auto-reject bad OCR, which is why this is tractable at all.
2. **Floor attendance PDFs** — monthly, text-based, 34 fonts. Codes P / ސ / ވނ. `extract_text` runs cells together — use pdfplumber word x-positions. Back series lives on `/en/secretariate/downloads`, so crawl that index for history.
3. **Committee attendance XLSX** — genuine OOXML, openpyxl-readable. Matrix is **transposed** (rows = meetings, columns = members) and contains an `N` code beyond the documented legend. 7 of 8 committees sampled have one. Member match is on the Thaana "constituency + name" string.
4. Parliament-works tracker — the join table (member → bill → sitting → committee meeting → vote sheet). **Completeness is unproven**: no `?page=`, type/1 yields only 26 works behind "View More". Budget time to find a year/term param or enumerate works via sitting pages instead.
5. Sitting pages — 3 PDFs each (agenda / minutes / point_of_order). Enumeration needs per-year/term drilling. Thaana extraction via pypdf drops fili — use coordinate-aware extraction.
6. Session Yaumiyya (DSpace, 1,450 items, 1975+) — has a per-item **member field naming who spoke**, powering "what did my MP actually say". No REST, no OAI (both dead/403), so ~1,450 JSPUI page scrapes. **All rights reserved to the Majlis — cite and link, never redistribute.**
7. maldivesmajlismonitoring.com — the only site already publishing per-MP attendance. Use for **leads only**: derived third-party numbers, anonymous methodology, no licence, and visibly inconsistent ("Parliament Attendance 0/0" vs a site-wide 80.5%; "Party Rank #2 of 75" in a 93-seat chamber). Never present as official.
8. Point-of-order PDFs — ingest incidentally via the sitting crawl; do not build a separate pipeline.

## Constituency project spending (promised vs delivered)
1. **PSIP-by-island pages** (live + 2024/2025 archives, 210 islands × 3 = ~630 fetches) — per-project name, **status**, funding source, ministry, and 5 year-columns of amounts. The best promised-vs-delivered spine that exists. Gotchas: project/status/ministry are nested divs inside one `<td>`; agent fetchers get 403, plain curl + browser UA gets 200; the /dv/ path returns zero data rows so statuses are English-only.
2. **Finance awarded-projects table** (~110 pages) — contractor, amount, duration, award date. Island only in free-text procurement name → fuzzy-match to the 210-island gazetteer. Normalise `TES/2025/W-152` vs `TES2025W-134` before joining.
3. **Audit Office master index** — one 9.4 MB page, 2,092 unique AR links, each 302-ing straight to a PDF. Regex the row text for title/date/sector/type/language; dedupe (~7 duplicate hrefs per row); fetch PDFs lazily.
4. Debarred list — ~6 rows, one fetch, high signal (contractor failure tied to a named island project). Two-row header will misalign naive parsers.
5. PSIP summary JSON (93 embedded `data-update-chart` blobs) — cleanest machine-readable slice on the portal, national/ministry context.
6. 2026 Micro Dataset XLSX (207k × 17) — excellent for ministry/economic classification, but **no island or constituency column**; it cannot substitute for the per-island pages. Resolve its hashed URL from the national-budget page rather than hardcoding.

## Allegations with status
1. **High Court JSON** (`/dv/connects/getmydecisionsfull.php`) — 6,904 records, 1980→2026, one 11 MB GET. Named parties with full addresses → directly matchable to MP profiles. Send a browser UA (403 otherwise). PDFs at `https://www.highcourt.gov.mv/dhi/mediamanager/<pdffile>`.
2. **ACC status=1 (referred to PGO) + status=3 (completed)** — pair them on case number so a referral and its outcome resolve to one record. This pairing is what lets you say "alleged **and** dismissed/prosecuted" rather than leaving a bare accusation on a profile. Text-extractable but genuinely hard: Thaana bidi with reordered numerals, 4 interleaved columns → needs `pdftotext -layout` / pdfplumber positional extraction plus bidi normalisation. **Coverage stops at 2021** — historical corpus, not a live feed.
3. Lethun/PGO (213 curated judgments) — small, cheap, adds Supreme Court coverage the High Court endpoint lacks. Low hit rate against MPs (curated for doctrine, not defendant).
4. News as lead generation: Maldives Independent sitemap (186 monthly urlsets, 1999+, and **robots explicitly grants ai-train=yes and name-allows ClaudeBot**) + RSS for incremental. Edition.mv and Adhadhu give **person-level tag archives**, the right shape for a per-figure timeline — but both serve `Content-Signal: ai-train=no, use=reference`: **cite-and-link only, no full-text storage or training.** Dhauru is the cleanest Dhivehi ingest (real canonical `/post/{cat}/{id}`, 50-item RSS with summaries, fully permissive robots). Avas has permissive robots and English person tags, but `/en/{id}` and `/{id}` are separate id namespaces. Deprioritise Mihaaru main site, Raajje, Sun, PSM — no usable sitemap/feed, brute-force id walking only.

## Election results
1. **EC Stat XLSX** — box × candidate vote rows, 9 files. Highest-value machine-readable asset on the list after the vote sheets. Schema B is a cartesian product padded with zeros (lce2020 = 161,939 rows); no `Elected` flag anywhere; note the misspelt `Consitituency`/`Consit` headers.
2. **EC Stat HTML portal** — candidate-level rows with `Elected` for PE2014/2019/2024, RI2013+, LCE2014+. PE2009/LCE2011 are aggregate-only. On the PE2024 root the winner is marked **only by a CSS party-colour class**, not the word "Elected" — derive from max votes or the class attribute. Bonus: `/Party/Grant` = ~16 years of state grants per party, in Thaana. Browser UA mandatory across the whole elections.gov.mv estate.
3. **Mihaaru 2023 API** (`mvelections-api.mnoc.workers.dev/api/elections-3/rounds-{3,4}/…`) — clean paginated JSON, both rounds, down to ballot box, with parallel Latin/Thaana names. **rounds-3 = round 1, rounds-4 = round 2.** Undocumented, unversioned, on a workers.dev subdomain that could vanish — **snapshot it now.** Press tally, cite as such.
4. **Sun majlis2024 microsite** — ~93 constituency + ~600 box pages. Richest 2024 Majlis detail, but the constituency-level aggregate counters are **broken** (Hoarafushi shows 698.98% turnout and lists other constituencies' boxes). Trust only the candidates block and box-detail pages; recompute totals. It's a 551/602 live-night snapshot, not the certified result.
5. EC political parties registry — chairperson, address, website, bylaw and **manifesto** downloads. Store membership counts with their as-of date (30 Jun 2026 registry vs 31 Dec 2025 news figures are different snapshots, not a contradiction).
6. EC statistics reports (text PDFs, bilingual) cover LCE2020/LCE2014/PE2019/PE2014/RI2013/2007 — including years where the XLSX 404s.

## Income & assets — weakest area by far
1. **Salary structure PDF** — 1 fetch, text-based. Official MP remuneration baseline (91 MPs at 20,000 living allowance; three-tier Speaker/Deputy/member). Wide table collapses under naive extraction — use pdfplumber column positions. Confirms committee allowance is pro-rated by committee attendance, which makes your XLSX attendance data *financially* meaningful — a strong, defensible story: "MP missed N committee meetings; allowance is pro-rated by attendance."
2. **Asset declarations** — filing metadata only. See gaps.
3. `/Party/Grant` (above) for party-level money in politics.

---

## (1) The single highest-value source to ingest next

**Named division / vote-result sheets** (`majlis.gov.mv/storage/action_files/{work_id}/*.pdf`), immediately after the Phase 0 roster.

Reasons: per-MP roll-call voting is the hardest requirement in the brief and exists in **no other source** — the third-party monitoring site doesn't have it, the OCR repo has no committed output, Wikidata has 10 MPs. It is the single most defensible accountability claim you can publish ("your MP voted Yes on X"). And unlike every other OCR proposition here, it is de-risked: fixed column geometry, clean Latin Arial at 300 dpi, plus printed Yes/No/Abstain tallies on page 1 that act as a per-document checksum, so bad OCR fails loudly instead of silently publishing a false vote. Only real unknown is enumerating all work_ids — solve that alongside it.

Runners-up if you want breadth before depth: `/en/speakers-history` (one hour, only dated position data in existence) and the High Court JSON (one GET, 6,904 cases).

## (2) Needs human/editorial process, not a scraper

- **Allegation → status linkage.** ACC referral and outcome registers must be paired by case number, and neither names individuals consistently (the 2021 first entry names a ministry and a council, not a person). Attaching an allegation to a named MP is an editorial judgement with a verification step, not a regex. Publishing an unresolved allegation against a named person is the project's main legal and ethical exposure — this needs a written standard: named-source requirement, right of reply, explicit status labels (alleged / referred / charged / dismissed / convicted / acquitted), and a takedown path.
- **Pledges.** No structured pledge source exists anywhere (see gap 1). Extracting pledges from party manifestos and campaign coverage, then judging delivery against PSIP status, is inherently editorial. Rubric must be written and applied by humans; "Ongoing" in PSIP ≠ delivered.
- **Entity resolution on common names.** Maldivian naming plus nicknames plus transliteration variance means fuzzy matching will produce false positives that libel real people. Any auto-match linking a court case or ACC entry to an MP needs human confirmation before publication.
- **Third-party derived numbers.** maldivesmajlismonitoring's Performance Score and the Sun/Mihaaru press tallies need an editorial policy on labelling and reconciliation. Never restate as official.
- **Licence triage.** Edition and Adhadhu reserve rights against AI training; DSpace is all-rights-reserved; OpenSanctions is non-commercial; IPU asserts copyright; Sun serves a soft-404 for robots.txt so permission is *unstated*, not granted. This is a legal review, not a config file.
- **Asset declaration reading.** If asset values matter, humans must read the scans (see gap 2).

## (3) Real gaps — no good source exists

1. **Campaign pledges.** Nothing structured. Closest are party manifesto PDFs on the EC party registry and the Budget Speech. The promised-vs-delivered feature currently has a *delivered* side (PSIP + awards + audits) and **no promised side.** This is the biggest hole relative to the stated product, and it must be built by hand.
2. **Asset, income and business interests.** The declarations are 22-page scans of hand-filled Thaana forms with zero text layer. No Thaana handwriting OCR of usable accuracy exists. **Do not promise structured asset data.** What you *can* ship honestly today: filed / not filed / N filings, with a link to the original — and that is itself a real signal, since at least one member (268) has filed none. A compliance-rate leaderboard across all 93 is achievable now and is a genuine story. Structured values require manual transcription.
3. **Party and campaign finance.** The only published party-finance documents are the EC audit/annual reports, and every one tested is a pure image scan of Thaana accounting tables — a research project, not a parser. The EU EOM report independently documents *why* (expenditure limits unenforced, third-party spending unregulated, EC lacks capacity), so cite it as the explanation for the gap rather than pretending to fill it. `/Party/Grant` gives state grants only, not private donations.
4. **Constituency ↔ island mapping.** No source publishes it. HDX admin boundaries follow atoll/island divisions which do **not** equal the 93 electoral constituencies (Hulhumale' splits into Uthuru/Medhu/Dhekunu). Must be built by hand from the constituency list + island gazetteer, and it is a hard dependency for every constituency-level spending rollup.
5. **Dated party affiliation over time.** Rosters give current party; Wikidata membership dates are sparse; the 2024 floor-crossing is documented only in an IPU prose note. Party-switching history must be reconstructed manually from news.
6. **ACC data 2022–2026.** Nothing published after 2021 under either status filter. A four-year hole in the corruption record, unfillable from this source — news is the only substitute.
7. **Pre-2014 committee proceedings and pre-2013 candidate-level results.** Committee Yaumiyya starts ~2014; PE2009/RI2008/LCE2011 have aggregates only. Historical profiles of long-serving figures will be thin, partially offset by Session Yaumiyya (1975+) and the Special Majlis archive (~280 docs, 2004–2008, text-vs-scan unverified).
8. **A working DSpace API.** REST 302s to a dead :8443, OAI is 403. ~3,000 JSPUI pages must be scraped politely; assume no bulk path will appear.
