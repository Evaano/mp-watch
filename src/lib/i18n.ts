/** Every visible string lives here so no component hardcodes copy. */
export const dict = {
  siteName: "MP Watch",
  siteTagline: "The public record of Maldivian public figures",
  navMembers: "Members",
  navParties: "Parties",
  navAppointees: "Appointees",
  navVip: "Airport VIP",
  navMenu: "Menu",
  navSpending: "Spending",
  navAbout: "About",

  homeHeading: "What the Majlis spent on its own members",
  homeIntro:
    "Eleven years of health insurance premiums paid for members of the People's Majlis and their dependents, taken line by line from the Majlis disclosure. The cover is priced per head, so a member's figure tracks how many people the state is insuring, not how much that member received.",
  findYourMp: "Find your MP",
  searchPlaceholder: "Search by name or constituency",
  searchEmpty: "No member matches that search.",
  searchCountTemplate: "{n} members",

  statTotalPaid: "Total paid",
  statMembers: "Member records",
  statYears: "Fiscal years",
  statHighest: "Largest 11-year total on one policy",

  perYearHeading: "Premiums paid each fiscal year",
  perYearNote:
    "Each fiscal year runs 28 May to 27 May. The 2016-2017 jump is a price rise, not more people: the per-head premium went from MVR 12,500 to MVR 24,000, and that year covered one fewer member than the year before.",

  colMember: "Member",
  colConstituency: "Constituency",
  colYears: "Years",
  colTotal: "Total",
  showTable: "Show the figures",
  afterOfficeHeading: "Premiums kept being paid after members left office",
  afterOfficeBody: (payments: number, people: number) =>
    `Across ${payments} payments to ${people} former members, in fiscal years where the Majlis roster shows they held no seat. Most are exactly MVR 24,000 a year, paid every year after they left.`,
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

  aasandhaNote:
    "Every Maldivian citizen has been covered by Husnuvaa Aasandha with no annual ceiling since February 2014, which is the whole period this disclosure covers. These premiums were paid over the same years. Source:",
  peakNote:
    "The most any one policy cost in a single year, covering that member and their dependents, was",
  peakNoteHeads: (heads: number) =>
    `, which is ${heads} covered people for that year at the per-head rate.`,
  perHeadNote:
    "The premium is set per covered person: MVR 24,000 a year since 2016-2017, and MVR 12,500 before that. Every figure here divides exactly by the rate in force, which is both the check on our extraction and the reason none of it can be read as a payment to a member.",
  scaleSources: "Comparison figures and their sources",
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
    `${payments.toLocaleString("en-US")} payments to ${people.toLocaleString("en-US")} former members, in years the Majlis roster shows they held no seat. Most are exactly MVR 24,000 — one person, one year, at the standard rate.`,
  actPartyKicker: "It is not one party's bill",
  actPartyLead: (party: string) =>
    `Paid while those members sat for ${party} - the largest share of any party.`,
  actPartyBody:
    "Every party that has held a seat is on this list. A premium counts against the seat that was held when it was paid, so crossing the floor does not move a member's past cost onto their new party.",
  seeParties: "See the party breakdown",

  partiesHeading: "What each party's seats cost",
  partiesIntro:
    "Premiums grouped by the party of the seat held when each payment was made, not by where the member sits now. A member who crossed the floor appears under both parties, each year against the seat in force.",
  partiesAttributionNote:
    "Party is recorded against a seat, never against a person: six independents crossed to PNC within four days of the 2024 election. Nothing here is apportioned. A payment that cannot be placed against exactly one party is left out of the party figures and reported in full below.",
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
    "The totals are not a like-for-like comparison: the disclosure covers a fixed window, 2014 to 2025, so a one-term member could only be covered for part of it. The per member-year figure is the one that compares - and even that carries the price rise, because the per-head premium was MVR 12,500 until 2016-2017, so a cohort weighted toward the early years reads lower per year.",
  tenureCohortLabel: (terms: number) =>
    terms === 1 ? "1 term" : `${terms} terms`,

  actFindKicker: "Now look up yours",
  seeAllMembers: (n: number) => `See all ${n} members`,
  membersHeading: "Every member on record",
  membersIntro:
    "Everyone the disclosures name, across the 18th, 19th and 20th Majlis. Search by name, constituency or party.",
  yearOne: "year",
  yearMany: "years",

  profileTotal: "Total premiums on this policy",
  profileYears: "Fiscal years with a payment",
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
  profileParty: "Party",
  profileCareerHeading: "Career",
  profileCoverHeading: "Health insurance cover",
  profileTotalOver: (years: number) => `over ${years} fiscal years`,
  profilePeakYear: (heads: number) =>
    `In its most expensive year this policy covered ${heads} people at the per-head rate.`,
  profileSourcesHeading: "Sources for this page",
  profileSourcesNote:
    "Everything on this page comes from these documents. Nothing here is inferred from anything else.",
  positionsHeading: "Positions held",
  inferredLabel: "Inferred",
  stillServing: "present",
  speakerLabel: "Speaker of the Majlis",
  partyLabel: "Party",

  appointeesHeading: "What a political appointment pays",
  appointeesIntro:
    "These are the terms attached to a post, not money anyone was paid. Six ministries were asked what their political appointees earn; this is what they answered, and what they left out. Every figure is a rate a document states, so nothing here can be read as a sum received - one of these sheets records no-pay leave, another lists posts that are vacant.",
  appointeesLadderHeading: "The same four rates, in ministry after ministry",
  appointeesLadderNote:
    "Each rate here is stated by a document. Reading them as standing rates rather than one ministry's arrangement is our inference, and it rests on separate ministries printing the same figures without reference to each other.",
  appointeesLadderAgreement: (ranks: number, bodies: number) =>
    `${ranks} ranks, each stated identically by up to ${bodies} ministries answering separately.`,
  appointeesLadderExceptions: "Where a ministry pays something else",
  appointeesLadderException: (
    body: string,
    rank: string,
    readings: string,
  ) => `${rank}: ${body} lists ${readings}.`,
  appointeesMinWageNote: (living: number, wage: number) =>
    `The lowest rank on the ladder draws a living allowance of MVR ${living.toLocaleString("en-US")} a month on top of basic pay. The monthly minimum wage for large employers is MVR ${wage.toLocaleString("en-US")}.`,
  appointeesNoTotalNote:
    "There is no total on this page, and that is deliberate. Multiplying posts by a rate would produce a spending figure no document states: it would ignore vacant posts, part-months, the deduction Finance applies, and the ministries that never answered post by post. The count and the rate are shown separately so nothing here has to be taken on trust.",

  appointeesCoverageHeading: "Who answered, and how",
  appointeesCoverageIntro:
    "The honest answer to what political appointments pay begins with who told us. Two ministries gave a row per post; two gave counts and rates; one answered in a scanned table that no machine can read; one is a narrative letter. The gaps are listed here rather than left to be inferred from a short table.",
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
  appointeesBodyPosts: (n: number) =>
    n === 1 ? "1 post" : `${n} posts`,
  colDesignation: "Designation",
  colPosts: "Posts",
  colBasic: "Basic salary",
  colStatedTotal: "Stated total",
  appointeesNilNote:
    "A dash is a nil the document prints, and is not the same as a blank, which is a component the document does not mention.",
  colRange: "Stated range",
  colHolder: "Named holder",
  colFrom: "From",
  colUntil: "Until",
  appointeesForeignNote:
    "This table covers the whole ministry. Only the 125 rows marked Political are political appointments; the rest are the career Foreign Service, shown here because the same document sets both and the contrast is the point.",
  appointeesForeignTotalNote:
    "The stated total is monthly and excludes the yearly dress allowance. It is printed as the document prints it and is never recomputed: the components are rounded to whole rufiyaa while the total carries the cents, so a recalculated figure would disagree with the source by up to a rufiyaa.",
  appointeesHealthOfficeNote:
    "Every row is labelled Ministry of Social and Family Development, the pre-merger name, although the responding body is Health, Family and Welfare. Printed as the document prints it.",
  appointeesFinanceNote:
    "The only one of the six documents that names anybody. A 10 per cent deduction applies to basic salary until 31 December 2026, and is shown where the sheet applies it.",
  appointeesEducationNote:
    "A rotated Thaana scan with no text layer. The pay figures and dates are transcribed by hand; the names, designations and job scopes are not, so each row is labelled by the rank its pay corresponds to rather than by the words on the page.",
  appointeesAggregateHeading: "Ministries that answered with counts",
  appointeesRangeNote:
    "Where a ministry gave a range rather than components, the range is the whole monthly package and is not comparable with a basic salary on its own.",
  appointeesSourcesHeading: "The documents behind this page",
  appointeesReference: "Reference",
  appointeesViewDocument: "Open the document",

  vipHeading: "Airport VIP, member by member",
  vipIntro:
    "The Majlis pays for members to use the VIP terminal at Velana International Airport. Three disclosures cover the 18th and 19th parliaments in full and the 20th to 31 July 2025, and each one counts movements first and prices them at a flat rate, so the count is the fact and the money follows from it.",
  vipTermsHeading: "What each parliament used",
  vipTermsNote:
    "The rate is shown per parliament and never carried across them. The 18th and 19th price a movement at USD 60 and convert at MVR 15.42 to the dollar; the 20th prints a rufiyaa charge and no dollar figure at all. Averaging the two would state a rate no document gives.",
  vipPartialNote: (shown: number, unmatched: number) =>
    `${shown} rows are shown here. A further ${unmatched} could not be matched to exactly one seat - a name printed short, or a constituency spelled differently from the roster - and are left out rather than attached to the nearest plausible member. They are listed in the repository's identity review.`,
  vipRankedHeading: "Members by movements",
  vipRankedNote:
    "Across every parliament a member appears in. A member who sat in two shows the sum of both, which is not comparable with someone who sat in one.",
  colMovements: "Movements",
  colCost: "Cost",
  colTerm: "Parliament",
  colPerMovement: "Per movement",
  vipPassportHeading: "Diplomatic passports",
  vipPassportBody: (holders: number, members: number) =>
    `${holders} of the ${members} members of the 20th Majlis hold a diplomatic passport, named in the same disclosure. It records who holds one, not what it cost.`,
  vipNoneLabel: "No movements recorded",

  profileVipHeading: "Airport VIP",
  profileVipNote:
    "Paid by the Majlis for the member's use of the airport VIP terminal, counted in movements and charged at a flat rate. A parliament with no row is one the disclosures do not cover for this member, not one with nothing to report.",
  profileVipChip: "Diplomatic passport",

  termLabel: (n: number) => `${ordinal(n)} Majlis`,
  sourceHeading: "Source",
  sourceNote:
    "Extracted directly from the Majlis PDF by a script in this repository. Every figure on this page traces to a cell in that document.",
  viewSource: "View the original PDF",
  currencyNote: "All figures in Maldivian rufiyaa (MVR).",
} as const;

export type Dict = typeof dict;

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
