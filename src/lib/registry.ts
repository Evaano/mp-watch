import rawGraph from "@/data/graph.json";
import type {
  Claim,
  ExpenditureClaim,
  Graph,
  Person,
  PersonId,
  Position,
  Source,
  TimelineEntry,
} from "./schema";

interface LoadedGraph extends Graph {
  fiscalYears: string[];
  terms: { number: number; start: string; end: string }[];
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

function isExpenditure(claim: Claim): claim is ExpenditureClaim {
  return claim.type === "expenditure";
}

/** Everything the app knows, read through one module. */
export const registry = {
  fiscalYears: graph.fiscalYears,
  terms: graph.terms,
  warnings: graph.warnings,

  source(id: string): Source | undefined {
    return sourcesById.get(id);
  },

  /**
   * The disclosure the spending figures come from. Looked up by kind rather
   * than by position: once a second ingest was added, sources[0] became the
   * member roster, which has no period and silently broke every figure
   * derived from one.
   */
  primarySource(): Source {
    return (
      graph.sources.find((s) => s.kind === "official-disclosure") ??
      graph.sources[0]
    );
  },

  people(): Person[] {
    return graph.persons;
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

  expenditure(id: PersonId): ExpenditureClaim[] {
    return this.claims(id).filter(isExpenditure);
  },

  totalSpent(id: PersonId): number {
    return this.expenditure(id).reduce((sum, c) => sum + c.amount, 0);
  },

  /** Amount per fiscal year, zero-filled across the full range. */
  spendingSeries(id: PersonId): { year: string; value: number }[] {
    const byYear = new Map<string, number>();
    for (const claim of this.expenditure(id)) {
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
      this.expenditure(id)
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
    const expenditure = graph.claims.filter(isExpenditure);
    const byYear: Record<string, number> = {};
    for (const year of graph.fiscalYears) byYear[year] = 0;
    for (const claim of expenditure) {
      if (claim.fiscalYear) byYear[claim.fiscalYear] += claim.amount;
    }
    return {
      people: graph.persons.length,
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
      if (!isExpenditure(claim)) continue;
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

  /** Days covered by the disclosure, for a per-day restatement. */
  periodDays(): number {
    const source = this.primarySource();
    if (!source.periodStart || !source.periodEnd) return 0;
    const ms =
      new Date(source.periodEnd).getTime() - new Date(source.periodStart).getTime();
    return Math.round(ms / 86_400_000);
  },

  /** People ordered by total spent, highest first. */
  ranked(): Person[] {
    return [...graph.persons].sort(
      (a, b) =>
        this.totalSpent(b.id) - this.totalSpent(a.id) ||
        a.nameLatin.localeCompare(b.nameLatin),
    );
  },

  rankOf(id: PersonId): number {
    return this.ranked().findIndex((p) => p.id === id) + 1;
  },
};

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

/** Trimmed payload for the client-side search index. */
export interface PersonSummary {
  id: string;
  name: string;
  nameLatin: string;
  title: string | null;
  titleDv: string | null;
  constituency: string;
  constituencyLatin: string;
  total: number;
  yearsPaid: number;
  party: string | null;
  photoUrl: string | null;
  terms: number[];
}

export function toSummary(person: Person): PersonSummary {
  const seat = registry.seat(person.id);
  return {
    id: person.id,
    name: person.name,
    nameLatin: person.nameLatin,
    title: person.title,
    titleDv: person.titleDv ?? null,
    constituency: seat?.constituency ?? "",
    constituencyLatin: seat?.constituencyLatin ?? "",
    total: registry.totalSpent(person.id),
    yearsPaid: registry.yearsPaid(person.id),
    party: registry.party(person.id),
    photoUrl: person.photoUrl ?? null,
    terms: registry.termsServed(person.id),
  };
}
