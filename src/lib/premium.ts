/**
 * What the health insurance figures actually measure.
 *
 * This is the single most misreadable property of the dataset, so it lives in
 * one file that everything else refers to.
 *
 * The premium is priced PER HEAD and the policy covers the member AND their
 * dependents. A member's figure therefore tracks how many people the state is
 * insuring, not how much that member personally received. Two members on the
 * same terms differ only by household size.
 */

/** The RTI disclosure that states the rate and the dependent cover outright. */
export const PER_HEAD_SOURCE = {
  title:
    "20th People's Majlis members' insurance expenditure (member and dependents)",
  publisher: "People's Majlis, via the Information Commissioner's Office",
  url:
    "https://icom.sgp1.digitaloceanspaces.com/ID%206732-%20Annex-1_RTI_20th%20Majlis%20till%2027th%20May%202026-1760009635350.pdf",
  periodStart: "2024-05-28",
  periodEnd: "2026-05-27",
};

/**
 * Rate per covered person per 12 months, by fiscal year.
 *
 * 24,000 is *stated* by the RTI disclosure. 12,500 is *inferred*: it is the
 * exact greatest common divisor of every row in those two years, and no row in
 * them is a multiple of 24,000. The distinction is recorded because the app
 * must not present an inference as a quotation.
 */
export const PER_HEAD_RATES: {
  fiscalYears: string[];
  amountPerYear: number;
  basis: "stated" | "inferred";
}[] = [
  {
    fiscalYears: ["2014-2015", "2015-2016"],
    amountPerYear: 12500,
    basis: "inferred",
  },
  {
    fiscalYears: [
      "2016-2017",
      "2017-2018",
      "2018-2019",
      "2019-2020",
      "2020-2021",
      "2021-2022",
      "2022-2023",
      "2023-2024",
      "2024-2025",
    ],
    amountPerYear: 24000,
    basis: "stated",
  },
];

export const CURRENT_PER_HEAD_RATE = 24000;

export function perHeadRate(fiscalYear: string): number | null {
  return (
    PER_HEAD_RATES.find((r) => r.fiscalYears.includes(fiscalYear))
      ?.amountPerYear ?? null
  );
}

/**
 * How many person-years an amount represents in a given fiscal year.
 *
 * Person-years, never people. Across the two-year RTI period, 22 of 93 rows are
 * an *odd* number of units, which a headcount held steady across both years
 * cannot produce. So cover changes within a period, and no whole number of
 * dependents is recoverable for an individual. Decomposing an aggregate is
 * sound; saying "this member covers N dependents" is not, and must not be
 * added later.
 */
export function personYears(amount: number, fiscalYear: string): number | null {
  const rate = perHeadRate(fiscalYear);
  if (!rate || amount % rate !== 0) return null;
  return amount / rate;
}
