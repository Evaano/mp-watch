import photoManifest from "@/data/photo-manifest.json";
import rawGraph from "@/data/graph.json";
import type {
  Claim,
  ExpenditureClaim,
  Graph,
  Person,
  PersonId,
  DiplomaticPassport,
  PoliticalPost,
  Position,
  PostCoverage,
  PostRank,
  Source,
  TimelineEntry,
} from "./schema";

interface LoadedGraph extends Graph {
  fiscalYears: string[];
  terms: { number: number; start: string; end: string }[];
  meta: Graph["meta"] & { vipRowsUnmatched: number };
}

const graph = rawGraph as unknown as LoadedGraph;

// Indexed once at module load rather than scanned per lookup: with 266 people
// and 1,769 claims, a linear find per page would be 500-odd scans per build.
const personsById = new Map<PersonId, Person>(
  graph.persons.map((p) => [p.id, p]),
);
const positionsByPerson = new Map<PersonId, Position[]>();
const claimsByPerson = new Map<PersonId, Claim[]>();
const sourcesById = new Map<string, Source>(graph.sources.map((s) => [s.id, s]));

for (const position of graph.positions) {
  const list = positionsByPerson.get(position.personId) ?? [];
  list.push(position);
  positionsByPerson.set(position.personId, list);
}
for (const claim of graph.claims) {
  const list = claimsByPerson.get(claim.personId) ?? [];
  list.push(claim);
  claimsByPerson.set(claim.personId, list);
}

/**
 * A health insurance premium, and nothing else.
 *
 * This deliberately narrows on `subtype`, not on `type`. Every spending
 * figure on this site - the home page total, each member's lead figure, the
 * party and tenure tables - runs through here, and "expenditure" is a family:
 * the moment a second kind of expenditure claim lands, matching on type alone
 * would fold it into all of them silently, with no figure looking wrong.
 */
function isPremium(claim: Claim): claim is ExpenditureClaim {
  return (
    claim.type === "expenditure" && claim.subtype === "health-insurance-premium"
  );
}

function isVip(claim: Claim): claim is ExpenditureClaim {
  return claim.type === "expenditure" && claim.subtype === "airport-vip";
}

/** Everything the app knows, read through one module. */
/** The 2014-2025 premium disclosure: every spending figure on the site. */
const PRIMARY_SOURCE_ID = "majlis-health-insurance-2014-2025";

export const registry = {
  fiscalYears: graph.fiscalYears,
  terms: graph.terms,
  warnings: graph.warnings,

  source(id: string): Source | undefined {
    return sourcesById.get(id);
  },

  /**
   * The disclosure the spending figures come from, looked up by id.
   *
   * It was sources[0] once, until a second ingest made that the member roster
   * - which has no period, and silently broke every figure derived from one.
   * Then it was the first source of kind "official-disclosure", until the
   * 20th-Majlis RTI disclosure was registered and became a second one. The id
   * is the only key that cannot acquire a rival.
   */
  primarySource(): Source {
    return (
      graph.sources.find((s) => s.id === PRIMARY_SOURCE_ID) ?? graph.sources[0]
    );
  },

  people(): Person[] {
    return graph.persons;
  },

  /**
   * People who have held a Majlis seat.
   *
   * graph.persons also holds the political appointees named in a ministry pay
   * sheet, who never sat in the Majlis. Every MP-shaped figure on the site -
   * the directory, the ranking, the party and tenure tables - runs off this
   * rather than off people(), so an appointee cannot appear in a member count
   * with a spending total of zero, or silently join a party's row.
   */
  members(): Person[] {
    return graph.persons.filter((p) => this.seats(p.id).length > 0);
  },

  person(id: PersonId): Person | undefined {
    return personsById.get(id);
  },

  positions(id: PersonId): Position[] {
    return positionsByPerson.get(id) ?? [];
  },

  claims(id: PersonId): Claim[] {
    return claimsByPerson.get(id) ?? [];
  },

  /** Every seat held, earliest first. A member may hold several over terms. */
  seats(id: PersonId): Position[] {
    return this.positions(id)
      .filter((p) => p.kind === "majlis-member")
      .sort((a, b) => a.start.localeCompare(b.start));
  },

  /** The most recent seat, which is what a profile header should show. */
  seat(id: PersonId): Position | undefined {
    const seats = this.seats(id);
    return seats[seats.length - 1];
  },

  /** Party at the most recent seat. Never treated as a property of a person. */
  party(id: PersonId): string | null {
    return this.seat(id)?.party ?? null;
  },

  premium(id: PersonId): ExpenditureClaim[] {
    return this.claims(id).filter(isPremium);
  },

  totalPremium(id: PersonId): number {
    return this.premium(id).reduce((sum, c) => sum + c.amount, 0);
  },

  /** Airport VIP charges, one claim per member per Majlis term. */
  vip(id: PersonId): ExpenditureClaim[] {
    return this.claims(id).filter(isVip);
  },

  totalVip(id: PersonId): number {
    return this.vip(id).reduce((sum, c) => sum + c.amount, 0);
  },

  /** VIP movements, which is the count the disclosure leads with. */
  vipMovements(id: PersonId): number {
    return this.vip(id).reduce((sum, c) => sum + (c.units ?? 0), 0);
  },

  /**
   * VIP use by Majlis term, in term order.
   *
   * One claim per member per term, because that is how the disclosures are
   * cut: two of them cover a whole parliament and the third a fixed window
   * inside the current one. A member with no row in a term is absent from
   * this list rather than present with a zero - the documents cover different
   * windows, and a zero would assert that nothing was spent where in fact
   * nothing was asked.
   */
  vipByTerm(id: PersonId): { term: number; claim: ExpenditureClaim }[] {
    return this.vip(id)
      .map((claim) => ({
        claim,
        term: TERM_OF_VIP_SOURCE[claim.sources[0]] ?? 0,
      }))
      .sort((a, b) => a.term - b.term);
  },

  /** VIP rows left out because no single seat could be identified. */
  vipRowsUnmatched(): number {
    return graph.meta.vipRowsUnmatched;
  },

  holdsDiplomaticPassport(id: PersonId): boolean {
    return graph.diplomaticPassports.some((p) => p.personId === id);
  },

  diplomaticPassports(): DiplomaticPassport[] {
    return graph.diplomaticPassports;
  },

  /**
   * VIP use per term: how many members the document names, what it cost, and
   * the charge per movement it implies.
   *
   * The rate is reported per term and never carried across them. The 18th and
   * 19th price a movement at USD 60 converted at 15.42; the 20th prints a
   * rufiyaa figure and no dollar amount at all. Averaging those into one
   * number would state a rate no document gives.
   */
  vipTerms(): {
    term: number;
    sourceId: string;
    members: number;
    movements: number;
    amount: number;
    perMovement: number;
  }[] {
    const byTerm = new Map<
      number,
      { sourceId: string; members: number; movements: number; amount: number }
    >();
    for (const claim of graph.claims) {
      if (!isVip(claim)) continue;
      const term = TERM_OF_VIP_SOURCE[claim.sources[0]] ?? 0;
      const bucket = byTerm.get(term) ?? {
        sourceId: claim.sources[0],
        members: 0,
        movements: 0,
        amount: 0,
      };
      bucket.members += 1;
      bucket.movements += claim.units ?? 0;
      bucket.amount += claim.amount;
      byTerm.set(term, bucket);
    }
    return [...byTerm.entries()]
      .map(([term, b]) => ({
        term,
        ...b,
        perMovement: b.movements ? b.amount / b.movements : 0,
      }))
      .sort((a, b) => a.term - b.term);
  },

  /** Members ordered by VIP movements, most first. */
  vipRanked(): { person: Person; movements: number; amount: number }[] {
    return this.members()
      .map((person) => ({
        person,
        movements: this.vipMovements(person.id),
        amount: this.totalVip(person.id),
      }))
      .filter((row) => row.movements > 0)
      .sort((a, b) => b.movements - a.movements);
  },

  /** Amount per fiscal year, zero-filled across the full range. */
  spendingSeries(id: PersonId): { year: string; value: number }[] {
    const byYear = new Map<string, number>();
    for (const claim of this.premium(id)) {
      if (!claim.fiscalYear) continue;
      byYear.set(claim.fiscalYear, (byYear.get(claim.fiscalYear) ?? 0) + claim.amount);
    }
    return graph.fiscalYears.map((year) => ({
      year,
      value: byYear.get(year) ?? 0,
    }));
  },

  yearsPaid(id: PersonId): number {
    return new Set(
      this.premium(id)
        .map((c) => c.fiscalYear)
        .filter(Boolean),
    ).size;
  },

  /**
   * Whether the most recent seat is still open. `end: null` means serving.
   * Roster positions carry the term's own bounds, so a member who left
   * mid-term still reads as having served to the end of it - which is what the
   * source says, and no more.
   */
  isServing(id: PersonId): boolean {
    return this.seat(id)?.end === null;
  },

  /** Whole years between the first seat starting and the last one ending. */
  yearsInOffice(id: PersonId): number {
    const seats = this.seats(id);
    if (!seats.length) return 0;
    let total = 0;
    for (const seat of seats) {
      const from = new Date(seat.start).getTime();
      const to = new Date(seat.end ?? new Date().toISOString()).getTime();
      total += Math.max(to - from, 0);
    }
    return Math.round(total / (365.25 * 86_400_000));
  },

  /** Every source backing anything we hold about this person. */
  sourcesFor(id: PersonId): Source[] {
    const ids = new Set<string>();
    const person = this.person(id);
    for (const s of person?.sources ?? []) ids.add(s);
    for (const p of this.positions(id)) for (const s of p.sources) ids.add(s);
    for (const c of this.claims(id)) for (const s of c.sources) ids.add(s);
    return [...ids].map((s) => sourcesById.get(s)).filter(Boolean) as Source[];
  },

  /** Majlis terms served, unioned across every seat held. */
  termsServed(id: PersonId): number[] {
    const numbers = new Set<number>();
    for (const seat of this.seats(id)) {
      for (const term of seat.termNumbers ?? []) numbers.add(term);
    }
    return [...numbers].sort((a, b) => a - b);
  },

  /**
   * Positions and dated claims on one axis. This is the payoff of the shared
   * claim shape: adding pledges or allegations puts them on the timeline with
   * no change here.
   */
  timeline(id: PersonId): TimelineEntry[] {
    const entries: TimelineEntry[] = [];

    for (const position of this.positions(id)) {
      entries.push({
        date: position.start,
        endDate: position.end,
        kind: "position",
        title: position.constituency ?? position.organisation ?? position.kind,
        detail: position.basis === "inferred" ? position.basisNote : undefined,
        sources: position.sources,
      });
    }

    for (const claim of this.claims(id)) {
      // Expenditure is charted year by year rather than listed as events.
      if (claim.type === "expenditure") continue;
      const date = claim.periodStart;
      if (!date) continue;
      entries.push({
        date,
        endDate: claim.periodEnd ?? null,
        kind: "claim",
        claimType: claim.type,
        title: describe(claim),
        sources: claim.sources,
      });
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  },

  // -- aggregates ---------------------------------------------------------

  totals() {
    const expenditure = graph.claims.filter(isPremium);
    const byYear: Record<string, number> = {};
    for (const year of graph.fiscalYears) byYear[year] = 0;
    for (const claim of expenditure) {
      if (claim.fiscalYear) byYear[claim.fiscalYear] += claim.amount;
    }
    return {
      people: this.members().length,
      peopleWithSpending: new Set(expenditure.map((c) => c.personId)).size,
      amount: expenditure.reduce((sum, c) => sum + c.amount, 0),
      byYear,
    };
  },

  /**
   * Premiums paid in fiscal years when the roster shows no seat was held.
   *
   * This is a floor, not a total. It counts only claims belonging to someone
   * with at least one *stated* roster position; claims for people we could not
   * join to a roster are excluded rather than assumed either way, and their
   * number is reported so the gap is visible.
   */
  afterOffice() {
    const spans = new Map<PersonId, { start: string; end: string }[]>();
    for (const position of graph.positions) {
      if (position.kind !== "majlis-member" || position.basis !== "stated") continue;
      const list = spans.get(position.personId) ?? [];
      list.push({ start: position.start, end: position.end ?? "9999-12-31" });
      spans.set(position.personId, list);
    }

    let payments = 0;
    let amount = 0;
    let unknownTerm = 0;
    const people = new Set<PersonId>();

    for (const claim of graph.claims) {
      if (!isPremium(claim)) continue;
      const held = spans.get(claim.personId);
      if (!held) {
        unknownTerm += 1;
        continue;
      }
      const from = claim.periodStart ?? "";
      const to = claim.periodEnd ?? "";
      const serving = held.some((s) => s.start <= to && s.end >= from);
      if (!serving) {
        payments += 1;
        amount += claim.amount;
        people.add(claim.personId);
      }
    }

    return { payments, amount, people: people.size, unknownTerm };
  },

  /**
   * Premiums grouped by the party of the seat that was held while they were
   * paid - never by the member's current party.
   *
   * Party belongs to a position, not to a person: six independents crossed to
   * PNC within four days of the 2024 election, so a member's eleven-year total
   * does not belong to whichever party they sit for now. A member who crossed
   * contributes to both parties, each year to the seat in force.
   *
   * Nothing is apportioned. A payment that cannot be placed against exactly one
   * party is reported unattributed, with the reason, rather than guessed:
   *   - afterOffice: no seat was held in that period at all.
   *   - crossed:     the period spans seats sat for different parties, and no
   *                  source states how to split a year between them.
   *   - noParty:     a seat was held but the roster records no party for it.
   *                  This is not the same thing as Independent, and is never
   *                  merged into it.
   * Every party total plus the unattributed amount equals totals().amount.
   */
  partyTotals() {
    const seatsByPerson = new Map<PersonId, Position[]>();
    for (const position of graph.positions) {
      if (position.kind !== "majlis-member") continue;
      const list = seatsByPerson.get(position.personId) ?? [];
      list.push(position);
      seatsByPerson.set(position.personId, list);
    }

    const buckets = new Map<
      string,
      { amount: number; memberYears: number; members: Set<PersonId> }
    >();
    const unattributed = {
      amount: 0,
      payments: 0,
      afterOffice: 0,
      crossed: 0,
      noParty: 0,
    };

    for (const claim of graph.claims) {
      if (!isPremium(claim)) continue;
      const from = claim.periodStart ?? "";
      const to = claim.periodEnd ?? "";
      const overlapping = (seatsByPerson.get(claim.personId) ?? []).filter(
        (seat) => seat.start <= to && (seat.end ?? "9999-12-31") >= from,
      );
      const parties = new Set(overlapping.map((seat) => seat.party ?? ""));

      let reason: keyof typeof unattributed | null = null;
      if (!overlapping.length) reason = "afterOffice";
      else if (parties.size > 1) reason = "crossed";
      else if (parties.has("")) reason = "noParty";

      if (reason) {
        unattributed.amount += claim.amount;
        unattributed.payments += 1;
        unattributed[reason] += 1;
        continue;
      }

      const party = [...parties][0];
      const bucket = buckets.get(party) ?? {
        amount: 0,
        memberYears: 0,
        members: new Set<PersonId>(),
      };
      bucket.amount += claim.amount;
      // Each expenditure claim is one member's premium for one fiscal year, so
      // counting claims counts member-years.
      bucket.memberYears += 1;
      bucket.members.add(claim.personId);
      buckets.set(party, bucket);
    }

    const parties = [...buckets.entries()]
      .map(([party, b]) => ({
        party,
        amount: b.amount,
        members: b.members.size,
        memberYears: b.memberYears,
        perMemberYear: b.memberYears ? Math.round(b.amount / b.memberYears) : 0,
      }))
      .sort((a, b) => b.amount - a.amount || a.party.localeCompare(b.party));

    return { parties, unattributed };
  },

  /**
   * What a member costs by how long they served, in Majlis terms.
   *
   * The totals are not comparable on their own: the disclosure covers a fixed
   * window (2014-2025), so a one-term member's total is capped by the window
   * rather than by their cover. perMemberYear is the figure that compares.
   * People with no roster seat are left out; there is no tenure to bucket them
   * by.
   */
  tenureCohorts() {
    const byTerms = new Map<
      number,
      { members: number; amount: number; memberYears: number }
    >();

    for (const person of this.members()) {
      const terms = this.termsServed(person.id).length;
      if (!terms) continue;
      const bucket = byTerms.get(terms) ?? {
        members: 0,
        amount: 0,
        memberYears: 0,
      };
      bucket.members += 1;
      bucket.amount += this.totalPremium(person.id);
      bucket.memberYears += this.yearsPaid(person.id);
      byTerms.set(terms, bucket);
    }

    return [...byTerms.entries()]
      .map(([terms, b]) => ({
        terms,
        members: b.members,
        amount: b.amount,
        perMember: b.members ? Math.round(b.amount / b.members) : 0,
        perMemberYear: b.memberYears ? Math.round(b.amount / b.memberYears) : 0,
      }))
      .sort((a, b) => a.terms - b.terms);
  },

  /** Days covered by the disclosure, for a per-day restatement. */
  periodDays(): number {
    const source = this.primarySource();
    if (!source.periodStart || !source.periodEnd) return 0;
    const ms =
      new Date(source.periodEnd).getTime() - new Date(source.periodStart).getTime();
    return Math.round(ms / 86_400_000);
  },

  /** Members ordered by total spent, highest first. */
  ranked(): Person[] {
    return [...this.members()].sort(
      (a, b) =>
        this.totalPremium(b.id) - this.totalPremium(a.id) ||
        a.name.localeCompare(b.name),
    );
  },

  rankOf(id: PersonId): number {
    return this.ranked().findIndex((p) => p.id === id) + 1;
  },

  // -- political posts ----------------------------------------------------
  //
  // Entitlements attached to posts, never money anyone received. Kept out of
  // every accessor above: nothing here passes through claims(), premium()
  // or totals(), so no spending figure on the site can pick it up.

  politicalPosts(): PoliticalPost[] {
    return graph.politicalPosts;
  },

  politicalPostCoverage(): PostCoverage[] {
    return graph.politicalPostCoverage;
  },

  /** The posts one body disclosed, in the order its document lists them. */
  postsByBody(bodyId: string): PoliticalPost[] {
    return graph.politicalPosts.filter((p) => p.bodyId === bodyId);
  },

  /**
   * The rates that hold across ministries, rank by rank.
   *
   * Each individual rate is stated by a document. Reading them as standing
   * rates rather than one ministry's arrangement is an inference, and it rests
   * on three independently-sourced bodies printing the same figures. That is
   * why `agreeing` and `differing` are both returned: a ministry paying a rank
   * differently is a finding, not an error, and hiding it would make the
   * generalisation look stronger than it is.
   *
   * `livingLabels` names the headings read as one slot - Health prints
   * "Housing" where the others print "Living Allowance". That inference is
   * made here and nowhere else.
   */
  rankLadder(): {
    rank: PostRank;
    basic: number;
    living: number;
    livingLabels: string[];
    agreeing: string[];
    differing: { bodyId: string; readings: string[] }[];
  }[] {
    // rank -> body -> the distinct "basic|living" readings that body prints.
    const byRank = new Map<PostRank, Map<string, Map<string, number>>>();
    const labels = new Map<PostRank, Set<string>>();

    for (const post of graph.politicalPosts) {
      if (!post.rank) continue;
      const living = post.components.find((c) => LIVING_LABELS.includes(c.label));
      // A post the document prints nothing against is a vacancy, not evidence
      // about the rate for its rank.
      if (!post.basic) continue;
      const bodies = byRank.get(post.rank) ?? new Map();
      const readings = bodies.get(post.bodyId) ?? new Map<string, number>();
      const key = `${post.basic ?? ""}|${living?.amount ?? ""}`;
      readings.set(key, (readings.get(key) ?? 0) + post.posts);
      bodies.set(post.bodyId, readings);
      byRank.set(post.rank, bodies);
      if (living?.label) {
        labels.set(post.rank, (labels.get(post.rank) ?? new Set()).add(living.label));
      }
    }

    return RANK_ORDER.flatMap((rank) => {
      const bodies = byRank.get(rank);
      if (!bodies) return [];

      // The ladder rate is the one the most bodies print. A body votes once
      // however many posts it lists: a ministry with 44 senior political
      // directors is one ministry stating one rate, not 44 votes for it.
      const votes = new Map<string, number>();
      for (const readings of bodies.values()) {
        for (const key of readings.keys()) {
          votes.set(key, (votes.get(key) ?? 0) + 1);
        }
      }
      let top = "";
      let best = 0;
      for (const [key, n] of votes) {
        if (n > best) {
          top = key;
          best = n;
        }
      }

      const [basic, living] = top.split("|");
      const agreeing: string[] = [];
      const differing: { bodyId: string; readings: string[] }[] = [];
      for (const [bodyId, readings] of bodies) {
        // A body agrees only if every post it lists at this rank carries the
        // ladder rate. Foreign Affairs pays 37 of its senior political
        // directors no living allowance at all, and reporting it as agreeing
        // because one row happens to match would make the generalisation look
        // firmer than the documents support.
        const keys = [...readings.keys()];
        if (keys.length === 1 && keys[0] === top) {
          agreeing.push(bodyId);
        } else {
          differing.push({
            bodyId,
            readings: keys
              .filter((k) => k !== top)
              .map((k) => {
                const [b, l] = k.split("|");
                const basicPart = b
                  ? `MVR ${Number(b).toLocaleString("en-US")} basic`
                  : "no basic salary";
                const livingPart =
                  l === "0"
                    ? "no living allowance"
                    : l
                      ? `MVR ${Number(l).toLocaleString("en-US")}`
                      : "none stated";
                return `${readings.get(k)} on ${basicPart} and ${livingPart}`;
              }),
          });
        }
      }

      return [
        {
          rank,
          basic: Number(basic),
          living: Number(living),
          livingLabels: [...(labels.get(rank) ?? [])],
          agreeing,
          differing,
        },
      ];
    });
  },
};

/**
 * Which parliament each VIP disclosure covers.
 *
 * Read off the source rather than off the claim's dates, because the 20th's
 * window closes at 31 July 2025 - part-way through the term - and inferring
 * the term from that would make it look like a completed one.
 */
const TERM_OF_VIP_SOURCE: Record<string, number> = {
  "rti-majlis-vip-18th": 18,
  "rti-majlis-vip-19th": 19,
  "rti-majlis-vip-passports-20th": 20,
};

/** The headings the bodies use for the same slot. See rankLadder(). */
const LIVING_LABELS = ["Living Allowance", "Housing"];

const RANK_ORDER: PostRank[] = [
  "minister",
  "state-minister",
  "deputy-minister",
  "senior-political-director",
  "political-director",
];

function describe(claim: Claim): string {
  switch (claim.type) {
    case "pledge":
      return claim.description;
    case "allegation":
      return claim.description;
    case "income":
      return claim.description;
    case "attendance":
      return `${claim.sittingsAttended}/${claim.sittingsHeld}`;
    default:
      return claim.type;
  }
}

/**
 * The mirrored portrait for a person, or null to fall back to the initial.
 *
 * Never person.photoUrl: that points at the Majlis site, whose Cloudflare
 * answers 403 to Vercel's image optimiser. The URL stays in the graph as
 * provenance; scripts/ingest/mirror_photos.py turns it into a local file.
 */
export function photo(id: PersonId): string | null {
  return (photoManifest as Record<string, string>)[id] ?? null;
}

/**
 * Trimmed payload for the client-side search index.
 *
 * The Thaana name and constituency ride along although nothing renders them:
 * a reader who knows a member's name knows it in Thaana, and matching what
 * they type costs two fields rather than a second index.
 */
export interface PersonSummary {
  id: string;
  name: string;
  nameDv: string;
  title: string | null;
  constituency: string;
  constituencyDv: string;
  total: number;
  yearsPaid: number;
  party: string | null;
  photo: string | null;
  terms: number[];
}

export function toSummary(person: Person): PersonSummary {
  const seat = registry.seat(person.id);
  return {
    id: person.id,
    name: person.name,
    nameDv: person.nameDv ?? "",
    title: person.title,
    constituency: seat?.constituency ?? "",
    constituencyDv: seat?.constituencyDv ?? "",
    total: registry.totalPremium(person.id),
    yearsPaid: registry.yearsPaid(person.id),
    party: registry.party(person.id),
    photo: photo(person.id),
    terms: registry.termsServed(person.id),
  };
}
