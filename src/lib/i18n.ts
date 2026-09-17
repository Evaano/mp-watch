/** Every visible string lives here so no component hardcodes copy. */
export const dict = {
  siteName: "MP Watch",
  siteTagline: "The public record of Maldivian public figures",
  navMembers: "Members",
  navParties: "Parties",
  navAppointees: "Appointees",
  navVip: "Airport VIP",
  navMenu: "Menu",
  findYourMp: "Find your MP",
  searchPlaceholder: "Search by name or constituency",
  searchEmpty: "No member matches that search.",
  searchCountTemplate: "{n} members",

  statTotalPaid: "Total paid",
  statMembers: "Member records",
  perYearHeading: "Premiums paid each fiscal year",
  colMember: "Member",
  colYears: "Years",
  colTotal: "Total",
  afterOfficeCaveat: (unknown: number) =>
    `This is a floor, not a total. It counts only people we could match to a published roster; a further ${unknown} payments belong to people we could not match, and are left out rather than assumed either way.`,

  scalePerDay: "Every day, for 11 years",
  scalePerDayNote: "Total spend divided by the days the disclosure covers.",
  scaleMinWage: "Member-years above a full minimum wage",
  scaleMinWageNote: (monthly: number, annual: number) =>
    `One member's policy, for one year, costing more than MVR ${annual.toLocaleString("en-US")} - which is over four covered people at the per-head rate, and a full year at the MVR ${monthly.toLocaleString("en-US")} monthly minimum wage for large employers.`,
  scaleUsd: "The same total in dollars",
  scaleUsdNote: (rate: number) =>
    `At the official pegged rate of MVR ${rate} to the US dollar.`,
  vipCostNote: "Three disclosures, two different rates.",

  aasandhaNote:
    "Every Maldivian citizen has been covered by Husnuvaa Aasandha with no annual ceiling since February 2014, which is the whole period this disclosure covers. These premiums were paid over the same years. Source:",
  peakNote:
    "The most any one policy cost in a single year, covering that member and their dependents, was",
  peakNoteHeads: (heads: number) =>
    `, which is ${heads} covered people for that year at the per-head rate.`,
  perHeadNote:
    "The premium is set per covered person: MVR 24,000 a year since 2016-2017, and MVR 12,500 before that. Every figure here divides exactly by the rate in force, which is both the check on our extraction and the reason none of it can be read as a payment to a member.",
  showMore: "Show more",
  showingOf: "Showing {shown} of {total}",
  backToTop: "Back to top",
  actTotalKicker: "Since 2014, the state has spent",
  actTotalOn: "on health insurance for members of the People's Majlis and their families.",
  actPerHeadKicker: "The cover is priced per person",
  actPerHeadLead: (rate: number) =>
    `MVR ${rate.toLocaleString("en-US")} a year, for each person covered.`,
  actPerHeadBody:
    "A member's total does not show a bigger benefit. It shows how many people the state is insuring. Seven members in the current Majlis insure only themselves. One insures enough people to cost eleven times that.",
  actRateKicker: "And the price nearly doubled",
  actRateBody:
    "In 2016-2017 the per-person premium went from MVR 12,500 to MVR 24,000. That year covered one fewer member than the year before.",
  actAfterKicker: "It does not stop when they leave",
  actAfterBody: (payments: number, people: number) =>
    `${payments.toLocaleString("en-US")} payments to ${people.toLocaleString("en-US")} former members, in years the Majlis roster shows they held no seat. Most are exactly MVR 24,000 - one person, one year, at the standard rate.`,
  actPartyKicker: "It is not one party's bill",
  actPartyLead: (party: string) =>
    `Paid while those members sat for ${party} - the largest share of any party.`,
  actPartyBody:
    "Every party that has held a seat is on this list. A premium counts against the seat that was held when it was paid, so crossing the floor does not move a member's past cost onto their new party.",
  seeParties: "See the party breakdown",

  partiesHeading: "What each party's seats cost",
  partiesIntro:
    "Premiums grouped by the party of the seat held when each payment was made, not by where the member sits now.",
  partiesAttributionNote:
    "Party belongs to the seat, not the person: six independents crossed to PNC within four days of the 2024 election. Nothing here is apportioned.",
  partiesUnattributed: "Not attributed to any party",
  partiesUnattributedBody: (
    payments: number,
    afterOffice: number,
    crossed: number,
    noParty: number,
  ) =>
    `Across ${payments} payments: ${afterOffice} in fiscal years where the roster shows no seat was held, ${crossed} in periods spanning seats sat for different parties, and ${noParty} where the roster records no party for the seat. That last group is not the same as Independent and is never merged into it.`,
  colParty: "Party",
  colMembers: "Members",
  colPerMemberYear: "Per member-year",
  colAvgPerMember: "Average per member",
  colTenure: "Served",

  tenureHeading: "What a longer career costs",
  tenureIntro:
    "Members grouped by how many Majlis terms they have served. One term is five years.",
  tenureWindowCaveat:
    "Not a like-for-like comparison: the window is fixed at 2014-2025, so a one-term member could only be covered for part of it. Per member-year is the figure that compares, and even that carries the 2016-2017 price rise.",
  tenureCohortLabel: (terms: number) =>
    terms === 1 ? "1 term" : `${terms} terms`,

  actFindKicker: "Now look up yours",
  seeAllMembers: (n: number) => `See all ${n} members`,
  membersHeading: "Every member on record",
  membersIntro:
    "Everyone the disclosures name, across the 18th, 19th and 20th Majlis. Search by name, constituency or party.",
  yearOne: "year",
  yearMany: "years",

  profileCoverNote:
    "Covers the member and their dependents, priced per covered person.",
  profileTerms: "Majlis terms",
  profileBreakdown: "Payments by fiscal year",
  profileNoPayment: "No payment recorded",
  profileSameName: "Another member shares this name",
  profileSameNameNote:
    "These are separate rows in the source document. We do not merge them, because deciding whether they are one person needs a human check.",
  backToList: "All members",
  profileServing: "Currently serving",
  profileFormer: "Former member",
  profileAppointee: "Political appointee",
  profileAppointeeNote:
    "Named in a ministry's own list of political appointees. This person has not sat in the Majlis, so there is no premium record and no ranking here.",
  profilePayHeading: "What the post pays",
  profilePayNote:
    "The terms attached to the post, as the ministry states them. Not a record of money received: the same sheet records no-pay leave and end dates.",
  profilePayDeduction: (after: number) =>
    `A 10 per cent deduction applies to basic salary until 31 December 2026, bringing it to MVR ${after.toLocaleString("en-US")}.`,
  profileGlance: "At a glance",
  profileYearsInOffice: "Years in office",
  profileCareerHeading: "Career",
  profileCoverHeading: "Health insurance cover",
  profileTotalOver: (years: number) => `over ${years} fiscal years`,
  profilePeakYear: (heads: number) =>
    `In its most expensive year this policy covered ${heads} people at the per-head rate.`,
  profileSourcesHeading: "Sources for this page",
  profileSourcesNote:
    "Everything on this page comes from these documents. Nothing here is inferred from anything else.",
  inferredLabel: "Inferred",
  stillServing: "present",
  speakerLabel: "Speaker of the Majlis",
  appointeesHeading: "What a political appointment pays",
  appointeesIntro:
    "What a post pays, as six ministries stated it. These are entitlements attached to posts, never money anyone received.",
  appointeesLadderHeading: "The same four rates, in ministry after ministry",
  appointeesLadderNote:
    "Every rate here is stated by a document. Reading them as standing rates rather than one ministry's arrangement is ours.",
  appointeesLadderExceptions: "Where a ministry pays something else",
  appointeesLadderException: (
    body: string,
    rank: string,
    readings: string,
  ) => `${rank}: ${body} lists ${readings}.`,
  appointeesMinWageNote: (living: number, wage: number) =>
    `The lowest rank draws MVR ${living.toLocaleString("en-US")} a month in living allowance on top of basic pay. The minimum wage for large employers is MVR ${wage.toLocaleString("en-US")} a month.`,
  appointeesNoTotalNote:
    "No total, deliberately. Posts multiplied by a rate would state a figure no document gives: it would ignore vacant posts, part-months, the Finance deduction, and the ministries that never answered post by post.",
  appointeesCoverageHeading: "Who answered, and how",
  colBody: "Ministry",
  colAsOf: "As at",
  colAnswer: "Answer",
  colPostsStated: "Posts stated",
  colPostsItemised: "Posts itemised",
  answerPerPost: "Row per post",
  answerAggregate: "Counts and rates",
  answerUnreadable: "Scan, not readable",
  notStated: "Not stated",

  appointeesBodiesHeading: "What each ministry disclosed",
  colDesignation: "Designation",
  colPosts: "Posts",
  colBasic: "Basic salary (monthly)",
  colStatedTotal: "Stated total (monthly)",
  appointeesNilNote:
    "A dash is a nil the document prints. A blank is a component it does not mention.",
  colRange: "Stated range (monthly)",
  colHolder: "Named holder",
  colFrom: "From",
  colUntil: "Until",
  appointeesForeignNote:
    "The whole ministry, 268 posts. Only the 125 marked Political are political appointments; the rest are the career Foreign Service.",
  appointeesForeignTotalNote:
    "Totals are monthly and exclude the yearly dress allowance, printed as the document prints them and never recomputed.",
  appointeesHealthOfficeNote:
    "Rows carry the pre-merger office name, Ministry of Social and Family Development.",
  appointeesFinanceNote:
    "The only document that names anyone. Basic pay carries a 10 per cent deduction until 31 December 2026.",
  appointeesEducationNote:
    "A Thaana scan with no text layer. Figures and dates are transcribed by hand; each row is labelled by the rank its pay matches, not by the words on the page.",
  appointeesAggregateHeading: "Ministries that answered with counts",
  appointeesRangeNote:
    "A stated range is a whole monthly package, not a basic salary.",
  appointeesSourcesHeading: "The documents behind this page",
  appointeesReference: "Reference",
  appointeesViewDocument: "Open the document",

  vipHeading: "Airport VIP, member by member",
  vipIntro:
    "What the Majlis paid for members to use the airport VIP terminal. Three disclosures: the 18th and 19th parliaments in full, the 20th to 31 July 2025.",
  vipTermsHeading: "What each parliament used",
  vipTermsNote:
    "Rates are per parliament and never averaged. The 18th and 19th price a movement at USD 60 converted at 15.42; the 20th prints a rufiyaa charge and no dollar figure.",
  vipPartialNote: (shown: number, unmatched: number) =>
    `${shown} rows shown. ${unmatched} could not be matched to exactly one seat and are left out rather than attached to the nearest plausible member.`,
  vipRankedHeading: "Members by movements",
  vipRankedNote:
    "A member who sat in two parliaments shows the sum of both, which is not comparable with one who sat in a single term.",
  colMovements: "Movements",
  colCost: "Cost",
  perMonth: "a month",
  colTerm: "Parliament",
  colPerMovement: "Per movement",
  vipSourcesHeading: "The documents behind this page",
  vipPassportHeading: "Diplomatic passports",
  vipPassportBody: (holders: number, members: number) =>
    `${holders} of the ${members} members of the 20th Majlis hold a diplomatic passport, named in the same disclosure. It records who holds one, not what it cost.`,
  profileVipHeading: "Airport VIP",
  profileVipNote:
    "Paid by the Majlis for the member's use of the airport VIP terminal, counted in movements and charged at a flat rate. A parliament with no row is one the disclosures do not cover for this member, not one with nothing to report.",
  profileVipChip: "Diplomatic passport",

  termLabel: (n: number) => `${ordinal(n)} Majlis`,
  sourceHeading: "Source",
  sourceNote:
    "Every figure on this site is extracted from a published document by a script in this repository. Each page lists the documents behind it.",
  viewSource: "View the original PDF",
  currencyNote: "All figures in Maldivian rufiyaa (MVR).",
} as const;

export type Dict = typeof dict;

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
