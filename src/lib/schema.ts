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
  /**
   * The issuing body's own reference for the document. RTI responses are
   * identified by this rather than by a URL, and it is what lets someone who
   * was not sent the file request it themselves.
   */
  reference?: string;
  /**
   * The grand total the document prints for itself, where it prints one. An
   * extraction checksum, never a figure to publish. Absent means the document
   * states no total: do not compute one.
   */
  checksumTotal?: number;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface Person {
  id: PersonId;
  /** Majlis member ids. One per parliament: the Majlis reissues them. */
  majlisId?: number;
  majlisIds?: number[];
  /** The display name, Latin. Official spelling where a roster gives one. */
  name: string;
  /**
   * The name in Thaana, as printed in the source. Not displayed, but it is the
   * identity join key: the Latin spelling drifts between documents and between
   * terms, and `fold_for_match` reconciles the Thaana. Absent for a person
   * whose only source prints no Thaana.
   */
  nameDv?: string;
  /** Honorific printed before the name. Display metadata, not identity. */
  title: string | null;
  titleDv?: string | null;
  /** Official portrait, served from the Majlis site. */
  photoUrl?: string | null;
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
  /** The constituency in Thaana. Stable across terms where the Latin is not,
   *  so this is what the roster join keys on. */
  constituencyDv?: string;
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

// ---------------------------------------------------------------------------
// Political posts
//
// These are pay ENTITLEMENTS attached to posts. They are the mirror image of
// an ExpenditureClaim, which records money actually paid to a named person,
// and the two must never be added, compared, or presented as one figure.
//
// They are deliberately NOT a Claim variant. A Claim is a claim about a person
// and is keyed on a personId; all but 34 of these rows name nobody, and a
// vacant post still carries an entitlement. Minting a personId to fit the
// uniform shape would assert a link no source states, which is the exact
// failure the uniform shape exists to prevent. So this is the one place the
// "everything is the same shape" rule stops, and it stops for the reason the
// rule exists.
// ---------------------------------------------------------------------------

/** The ladder, as far as the documents state it. */
export type PostRank =
  | "minister"
  | "state-minister"
  | "deputy-minister"
  | "senior-political-director"
  | "political-director";

/**
 * One pay component, carrying the source's own column heading.
 *
 * The heading stays verbatim rather than mapped to a canonical name because
 * the bodies disagree: Foreign Affairs, Finance and Education print "Living
 * Allowance" where Health prints "Housing". Reading those as one slot is an
 * inference, and it is made in exactly one place - registry.rankLadder() -
 * where the page can label it as one.
 */
export interface PayComponent {
  label: string;
  amount: number;
  period: "monthly" | "yearly";
}

export interface PoliticalPost {
  id: string;
  /** Vocabulary defined by the coverage table, not by a union: a union would
   *  be a second place to edit. The ingest validator enforces membership. */
  bodyId: string;
  /**
   * Always "entitlement". Present so that no value of this type can be read as
   * money received: an ExpenditureClaim has `type: "expenditure"` and an
   * amount that was disbursed; this has a rate attached to a post.
   */
  measure: "entitlement";
  /** The office as the row labels it, which can differ from the responding
   *  body. Health's rows still read "Ministry of Social and Family
   *  Development", the pre-merger name. Printed as-is, never corrected. */
  office: string;
  /** The designation exactly as printed, typos included. */
  designation: string;
  /** The designation placed on the ladder, for grouping only. `null` where the
   *  designation sits outside it, as every diplomatic rank does. */
  rank: PostRank | null;
  /** Foreign Affairs splits its list into "Political" and "Foreign Service".
   *  Only the first are political appointments. */
  jobType?: string;
  /**
   * How many posts this row describes: 1 for a per-post row, the stated count
   * for an aggregate one. Never inferred, and never multiplied by a rate.
   */
  posts: number;
  /** Monthly basic salary. Hoisted out of `components` because every body
   *  prints it under that name and the ladder is stated in basic terms. */
  basic?: number;
  /** Every other component the source prints, in the source's own order. A
   *  component printed as nil is 0; one the source does not print is absent.
   *  Those are different facts and are never merged. */
  components: PayComponent[];
  /**
   * The total the source prints for itself. Never recomputed: Foreign Affairs
   * prints components rounded to whole rufiyaa and a total carrying unrounded
   * cents, so a recomputed total disagrees with the document by up to a
   * rufiyaa - and the document is the record.
   */
  statedTotal?: number;
  /** A pay band, where the source states a range instead of components. Never
   *  averaged, and never compared with a `basic`: these are whole packages. */
  statedTotalRange?: { min: number; max: number };
  /** The named holder, where the source names one. Finance is the only body
   *  that does. */
  holderName?: string;
  /**
   * The person minted from this same sheet, where it names one.
   *
   * Never a roster person. These rows carry no constituency, so the "folded
   * name plus exact constituency, unique match" rule cannot be satisfied and
   * nothing looser is permitted. Rows are collapsed into a person within one
   * document only, on an exact name match, because one ministry listing its
   * own staff is one authority. An appointee whose name also appears on the
   * Majlis roster is written to docs/identity-review.md and left unmerged.
   */
  personId?: PersonId;
  /** Dates the source states for the holder, not for the post. */
  occupiedFrom?: string;
  terminatedOn?: string;
  rejoinedOn?: string;
  /** The 10 per cent deduction Finance applies to serving appointees until
   *  31 December 2026, as the sheet prints it. */
  basicAfterDeduction?: number;
  locator?: { page?: number; row?: number; section?: string };
  note?: string;
  sources: Cited;
}

/** What each body actually answered, published so the gaps are as visible as
 *  the figures. */
export interface PostCoverage {
  bodyId: string;
  bodyName: string;
  /** ISO date the response says it is accurate as at, where it says one. */
  asOf?: string;
  answerKind: "per-post" | "aggregate" | "unreadable";
  /** Posts the response says exist. */
  postsStated?: number;
  /** Posts it actually itemises. Homeland states 57 and itemises 27. */
  postsItemised: number;
  note?: string;
  sources: Cited;
}

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
  politicalPosts: PoliticalPost[];
  politicalPostCoverage: PostCoverage[];
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
