/**
 * Reference points used to give the spending figures a sense of scale.
 *
 * Every value here is external to our dataset, so every value carries its
 * source. Nothing in this file may be an estimate, a remembered figure or a
 * round number chosen because it reads well. If a comparator cannot be cited,
 * it does not belong on the page.
 */

export interface Comparator {
  /** The number itself, in the unit named by `unit`. */
  value: number;
  unit: "MVR" | "people";
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string;
  /** When the figure applies, so a reader can judge whether it is current. */
  asOf: string;
}

/**
 * The national minimum wage for large employers, in force from 1 January 2022.
 * Large employers are those with more than 100 staff and over MVR 20m annual
 * revenue. Applies to Maldivian workers only.
 */
export const MINIMUM_WAGE_MONTHLY: Comparator = {
  value: 8000,
  unit: "MVR",
  sourceTitle:
    "Maldives declares minimum wage: MVR 4,500 for small businesses, MVR 8,000 for large",
  sourcePublisher: "Sun Online",
  sourceUrl: "https://en.sun.mv/70278",
  asOf: "2022-01-01",
};

export const MINIMUM_WAGE_ANNUAL = MINIMUM_WAGE_MONTHLY.value * 12;

/**
 * Resident Maldivian citizens at the 2022 census. Citizens rather than total
 * residents, because Aasandha covers citizens.
 */
export const CITIZENS: Comparator = {
  value: 382639,
  unit: "people",
  sourceTitle: "Population and Housing Census 2022",
  sourcePublisher: "Maldives Bureau of Statistics",
  sourceUrl: "https://census.gov.mv/2022/",
  asOf: "2022-09-01",
};

/**
 * Universal health cover. The original Aasandha scheme capped cover at
 * MVR 100,000 per person per year; Husnuvaa Aasandha removed that ceiling in
 * February 2014.
 *
 * The date matters for how this dataset may be described. The disclosure
 * begins in May 2014, so the whole of it falls *after* the cap was lifted. Any
 * framing that contrasts these premiums with a capped citizen entitlement
 * would be false, and this comment exists so nobody reintroduces that framing.
 */
export const AASANDHA = {
  uncappedSince: "2014-02-01",
  sourceTitle: "Aasandha Scheme overview",
  sourcePublisher: "Aasandha Company Ltd",
  sourceUrl: "https://www.aasandha.mv/en/scheme/aasandha-scheme/overview",
};

export const COMPARATOR_SOURCES = [
  MINIMUM_WAGE_MONTHLY,
  CITIZENS,
] as const;
