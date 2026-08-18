/**
 * The data model everything else is built on.
 *
 * The shape is deliberately uniform: this project's content is a set of claims
 * about people, each over a period, each with a source. Spending, income,
 * pledges, delivery, attendance and allegations are all that same shape, so
 * they are claim *types* rather than separate schemas. New datasets add a
 * variant to `Claim`, not a new table, and the timeline falls out of dated
 * positions and claims without being assembled per feature.
 */

/** At least one source. This is a type error, not a lint rule, on purpose. */
export type Cited = [SourceRef, ...SourceRef[]];
export type SourceRef = string;

export type PersonId = string;
export type ClaimId = string;

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type SourceKind =
  | "official-disclosure"
  | "official-register"
  | "court-record"
  | "audit-report"
  | "news"
  | "manifesto"
  | "reference";

export interface Source {
  id: SourceRef;
  title: string;
  titleDv?: string;
  publisher: string;
  url: string;
  kind: SourceKind;
  /** ISO dates bounding what the source covers, when it covers a period. */
  periodStart?: string;
  periodEnd?: string;
  /** ISO date the copy in this repo was taken. */
  retrieved?: string;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface Person {
  id: PersonId;
  /** Majlis member ids. One per parliament: the Majlis reissues them. */
  majlisId?: number;
  majlisIds?: number[];
  /** Name in Thaana, as printed in the source. */
  name: string;
  /** Approximate Latin transliteration, for slugs and Latin search. */
  nameLatin: string;
  /** Honorific printed before the name. Display metadata, not identity. */
  title: string | null;
  /**
   * Other person records printed under the same name. Deliberately not
   * merged: separating one redistricted member from two people who share a
   * name needs a human, and guessing wrong misattributes someone's record.
   */
  possiblySameAs?: PersonId[];
  sources: Cited;
}

// ---------------------------------------------------------------------------
// Positions held (this is what makes a timeline possible)
// ---------------------------------------------------------------------------

export type PositionKind =
  | "majlis-member"
  | "speaker"
  | "minister"
  | "council-member"
  | "party-office"
  | "other";

export interface Position {
  id: string;
  personId: PersonId;
  kind: PositionKind;
  /** Constituency for an elected seat, organisation for an appointed one. */
  constituency?: string;
  constituencyLatin?: string;
  organisation?: string;
  /** Majlis terms this position spans, where known. */
  termNumbers?: number[];
  /** ISO dates. `end: null` means still serving. */
  start: string;
  end: string | null;
  /**
   * How we know. `inferred` matters: the premium disclosure tells us a payment
   * was made in a fiscal year, which strongly implies membership but does not
   * state it. Recording that distinction keeps the app from asserting more
   * than its sources do.
   */
  basis: "stated" | "inferred";
  basisNote?: string;
  /**
   * Party at the time of this position, not of the person. Six independents
   * crossed to PNC within four days of the 2024 election, so party only means
   * anything when it is bounded by dates.
   */
  party?: string | null;
  seatNo?: number | null;
  sources: Cited;
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export interface ClaimBase {
  id: ClaimId;
  personId: PersonId;
  /** ISO dates, or a fiscal-year label where the source works in those. */
  periodStart?: string;
  periodEnd?: string;
  fiscalYear?: string;
  sources: Cited;
  /** Where in the source, so a reader can check the exact cell or page. */
  locator?: { page?: number; row?: number; section?: string };
  note?: string;
}

/** Money spent by the state on, or paid to, this person. */
export interface ExpenditureClaim extends ClaimBase {
  type: "expenditure";
  subtype: "health-insurance-premium" | "salary" | "allowance" | "other";
  amount: number;
  currency: "MVR" | "USD";
}

/** Money received from outside the public purse. */
export interface IncomeClaim extends ClaimBase {
  type: "income";
  subtype: "business" | "employment" | "rent" | "shareholding" | "other";
  description: string;
  amount?: number;
  currency?: "MVR" | "USD";
}

/** Something the person publicly committed to doing. */
export interface PledgeClaim extends ClaimBase {
  type: "pledge";
  description: string;
  /** Set once delivery has been assessed, and only against evidence. */
  outcome?: {
    status: "delivered" | "partial" | "not-delivered" | "blocked" | "unverified";
    assessedOn: string;
    evidence: Cited;
    reasoning: string;
  };
}

/**
 * An allegation, charge or finding. `status` is required, because publishing
 * an allegation without its current status is how this kind of project causes
 * real harm and loses its standing.
 */
export interface AllegationClaim extends ClaimBase {
  type: "allegation";
  description: string;
  status:
    | "alleged"
    | "under-investigation"
    | "charged"
    | "convicted"
    | "acquitted"
    | "dismissed"
    | "withdrawn";
  body?: string;
  /** Response from the person or their representative, where given. */
  rightOfReply?: { text: string; receivedOn: string };
}

/** Presence at sittings, for the attendance component of the record. */
export interface AttendanceClaim extends ClaimBase {
  type: "attendance";
  sittingsHeld: number;
  sittingsAttended: number;
}

export type Claim =
  | ExpenditureClaim
  | IncomeClaim
  | PledgeClaim
  | AllegationClaim
  | AttendanceClaim;

export type ClaimType = Claim["type"];

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------

export interface Graph {
  /** Which ingest produced this file, and when. */
  meta: {
    generatedBy: string;
    datasets: string[];
  };
  sources: Source[];
  persons: Person[];
  positions: Position[];
  claims: Claim[];
  /** Anything the ingest could not parse cleanly. Should stay empty. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Timeline, derived rather than stored
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  date: string;
  endDate?: string | null;
  kind: "position" | "claim";
  claimType?: ClaimType;
  title: string;
  detail?: string;
  sources: Cited;
}
