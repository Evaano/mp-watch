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

  /** The disclosure the spending figures come from. */
  primarySource(): Source {
    return graph.sources[0];
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

  /** The seat a person is listed against. */
  seat(id: PersonId): Position | undefined {
    return this.positions(id).find((p) => p.kind === "majlis-member");
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

  termsServed(id: PersonId): number[] {
    return this.seat(id)?.termNumbers ?? [];
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
      amount: expenditure.reduce((sum, c) => sum + c.amount, 0),
      byYear,
    };
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
  constituency: string;
  constituencyLatin: string;
  total: number;
  yearsPaid: number;
}

export function toSummary(person: Person): PersonSummary {
  const seat = registry.seat(person.id);
  return {
    id: person.id,
    name: person.name,
    nameLatin: person.nameLatin,
    title: person.title,
    constituency: seat?.constituency ?? "",
    constituencyLatin: seat?.constituencyLatin ?? "",
    total: registry.totalSpent(person.id),
    yearsPaid: registry.yearsPaid(person.id),
  };
}
