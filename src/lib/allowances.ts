import raw from "@/data/allowances.json";

/** Shapes mirror what scripts/ingest/extract_allowances.py writes. */
export interface AllowanceRecord {
  id: string;
  /** Member name in Thaana, as printed in the source document. */
  name: string;
  /** Approximate Latin transliteration, used for search and slugs. */
  nameLatin: string;
  /** Honorific printed before the name, separated out for display. */
  title: string | null;
  constituency: string;
  constituencyLatin: string;
  sourcePage: number;
  sourceRowNo: number;
  byYear: Record<string, number>;
  total: number;
  yearsPaid: number;
  terms: number[];
  /** Ids of other records printed under the same name. Never auto-merged. */
  sameNameAs?: string[];
}

export interface MajlisTerm {
  number: number;
  start: string;
  end: string;
}

interface Dataset {
  source: {
    title: string;
    titleDv: string;
    publisher: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    pdfUrl: string;
    landingUrl: string;
  };
  terms: MajlisTerm[];
  fiscalYears: string[];
  totals: {
    records: number;
    amount: number;
    byYear: Record<string, number>;
  };
  warnings: string[];
  records: AllowanceRecord[];
}

const dataset = raw as Dataset;

/**
 * Single access point for the dataset. Components never import the JSON, so
 * moving this to a database later is a change to this file alone.
 */
export const allowances = {
  source: dataset.source,
  terms: dataset.terms,
  fiscalYears: dataset.fiscalYears,
  totals: dataset.totals,

  all(): AllowanceRecord[] {
    return dataset.records;
  },

  byId(id: string): AllowanceRecord | undefined {
    return dataset.records.find((r) => r.id === id);
  },

  /** Records ordered by total paid, highest first. */
  ranked(): AllowanceRecord[] {
    return [...dataset.records].sort((a, b) => b.total - a.total);
  },

  /** 1-based position in the ranking, for "Nth highest" context. */
  rankOf(id: string): number {
    return this.ranked().findIndex((r) => r.id === id) + 1;
  },

  termLabelFor(record: AllowanceRecord): MajlisTerm[] {
    return dataset.terms.filter((t) => record.terms.includes(t.number));
  },
};

/** Trimmed payload for the client-side search index. */
export interface MemberSummary {
  id: string;
  name: string;
  nameLatin: string;
  title: string | null;
  constituency: string;
  constituencyLatin: string;
  total: number;
  yearsPaid: number;
}

export function toSummary(record: AllowanceRecord): MemberSummary {
  return {
    id: record.id,
    name: record.name,
    nameLatin: record.nameLatin,
    title: record.title,
    constituency: record.constituency,
    constituencyLatin: record.constituencyLatin,
    total: record.total,
    yearsPaid: record.yearsPaid,
  };
}
