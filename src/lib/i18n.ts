export const LANGS = ["en", "dv"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function dirOf(lang: Lang) {
  return lang === "dv" ? "rtl" : "ltr";
}

/** The other language, for the toggle. */
export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "dv" : "en";
}

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  dv: "ދިވެހި",
};

/** Every visible string lives here so no component hardcodes copy. */
const dictionaries = {
  en: {
    siteName: "MP Watch",
    siteTagline: "The public record of Maldivian public figures",
    navMembers: "Members",
    navParties: "Parties",
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

    termLabel: (n: number) => `${ordinal(n)} Majlis`,
    sourceHeading: "Source",
    sourceNote:
      "Extracted directly from the Majlis PDF by a script in this repository. Every figure on this page traces to a cell in that document.",
    viewSource: "View the original PDF",
    currencyNote: "All figures in Maldivian rufiyaa (MVR).",
  },

  dv: {
    siteName: "އެމްޕީ ވޮޗް",
    siteTagline: "ދިވެހިރާއްޖޭގެ އާންމު ޝަޚްޞިއްޔަތުތަކުގެ ރެކޯޑް",
    navMembers: "މެންބަރުން",
    navParties: "ޕާޓީތައް",
    navMenu: "މެނޫ",
    navSpending: "ޚަރަދު",
    navAbout: "މަޢުލޫމާތު",

    homeHeading: "މަޖިލީހުން މެންބަރުންނަށް ކުރި ޚަރަދު",
    homeIntro:
      "ރައްޔިތުންގެ މަޖިލީހުގެ މެންބަރުންނާއި އެ ބޭފުޅުންގެ ޑިޕެންޑެންޓުންގެ ހެލްތު އިންޝުއަރެންސް ޕްރީމިއަމަށް 11 އަހަރު ދުވަހުގެ ތެރޭގައި ހިނގާފައިވާ ޚަރަދު. ޕްރީމިއަމް ދައްކަނީ ބޮލަކަށް ކަމުން، މެންބަރެއްގެ ޢަދަދު ބޮޑުވަނީ ކަވަރު ކުރެވޭ މީހުން ގިނަވުމުން.",
    findYourMp: "ތިޔަބޭފުޅާގެ މެންބަރު",
    searchPlaceholder: "ނަން ނުވަތަ ދާއިރާ ލިޔުއްވާ",
    searchEmpty: "އެއްވެސް މެންބަރެއް ނުފެނުނު.",
    searchCountTemplate: "{n} މެންބަރުން",

    statTotalPaid: "ޖުމްލަ ޚަރަދު",
    statMembers: "މެންބަރުންގެ ރެކޯޑް",
    statYears: "މާލީ އަހަރު",
    statHighest: "އެއް ޕޮލިސީއަކަށް 11 އަހަރުން ދެއްކި އެންމެ ބޮޑު ޖުމްލަ",

    perYearHeading: "ކޮންމެ މާލީ އަހަރަކު ކުރި ޚަރަދު",
    perYearNote:
      "ކޮންމެ މާލީ އަހަރެއް ފެށެނީ މޭ 28 ގައި، ނިމެނީ މޭ 27 ގައި. 2016-2017 ގައި ބޮޑުވީ މީހުން ގިނަވެގެންނެއް ނޫން، ބޮލަކަށް ދައްކާ ޕްރީމިއަމް 12,500 ރުފިޔާއިން 24,000 ރުފިޔާއަށް ބޮޑުވުމުން.",

    colMember: "މެންބަރު",
    colConstituency: "ދާއިރާ",
    colYears: "އަހަރު",
    colTotal: "ޖުމްލަ",
    showTable: "ޢަދަދުތައް ދައްކާ",
    afterOfficeHeading: "މެންބަރުކަމުން ވަކިވުމަށްފަހުވެސް ޕްރީމިއަމް ދައްކާފައިވޭ",
    afterOfficeBody: (payments: number, people: number) =>
      `ކުރީގެ ${people} މެންބަރަކަށް ${payments} ފަހަރު ދައްކާފައިވޭ. މިއީ މަޖިލީހުގެ ރެކޯޑުން ދައްކާ ގޮތުގައި އެ ބޭފުޅުން މެންބަރުކަމުގައި ނެތް އަހަރުތަކުގައެވެ. ގިނަ ފަހަރު އަހަރަކު 24,000 ރުފިޔާ.`,
    afterOfficeCaveat: (unknown: number) =>
      `މިއީ އެންމެ ދަށް ޢަދަދު، ޖުމްލަ ޢަދަދެއް ނޫން. ހިމަނާފައިވަނީ ރަސްމީ ލިސްޓާ ދިމާވި ބޭފުޅުން އެކަނި. އިތުރު ${unknown} ފަހަރެއްގެ މަޢުލޫމާތު ދިމާނުވާތީ ނުހިމަނަމެވެ.`,

    scalePerDay: "11 އަހަރު، ކޮންމެ ދުވަހަކު",
    scalePerDayNote: "ޖުމްލަ ޚަރަދު، ލިޔުމުގައި ހިމެނޭ ދުވަސްތަކުގެ ޢަދަދަށް ބަހާލުމުން.",
    scaleMinWage: "އެންމެ ކުޑަ އުޖޫރައަށްވުރެ ބޮޑު މެންބަރު-އަހަރު",
    scaleMinWageNote: (monthly: number, annual: number) =>
      `އެއް ޕޮލިސީއަކަށް އެއް އަހަރު ${annual.toLocaleString("en-US")} ރުފިޔާއަށްވުރެ ބޮޑުކޮށް ދައްކާފައިވާ ފަހަރު. މިއީ ބޮލަކަށް ދައްކާ ރޭޓުން 4 މީހުންނަށްވުރެ ގިނަ. އަދި މަހަކު ${monthly.toLocaleString("en-US")} ރުފިޔާގެ އެންމެ ކުޑަ އުޖޫރައިގެ އެއް އަހަރަށްވުރެ ބޮޑު.`,
    scaleUsd: "ހަމަ އެ ޖުމްލަ، ޑޮލަރުން",
    scaleUsdNote: (rate: number) =>
      `ރަސްމީ ރޭޓް، ޑޮލަރަކަށް ${rate} ރުފިޔާ.`,

    aasandhaNote:
      "2014 ވަނަ އަހަރުގެ ފެބްރުއަރީން ފެށިގެން ހުރިހާ ދިވެހި ރައްޔިތުންނަށް ޙުސްނުވާ އާސަންދައިގެ ދަށުން ސީލިންގއެއް ނެތި ބޭސްފަރުވާ ލިބެއެވެ. މި ލިޔުމުގައި ހިމެނޭ މުޅި މުއްދަތަކީ އެއީއެވެ. މަޞްދަރު:",
    peakNote:
      "މެންބަރާއި ޑިޕެންޑެންޓުން ހިމެނޭ އެއް ޕޮލިސީއަކަށް އެއް އަހަރު ދައްކާފައިވާ އެންމެ ބޮޑު ޢަދަދަކީ",
    peakNoteHeads: (heads: number) =>
      `. މިއީ ބޮލަކަށް ދައްކާ ރޭޓުން އެ އަހަރު ${heads} މީހެއްގެ ޕްރީމިއަމް.`,
    perHeadNote:
      "ޕްރީމިއަމް ދައްކަނީ ކަވަރު ކުރެވޭ ކޮންމެ މީހަކަށް: 2016-2017 ން ފެށިގެން އަހަރަކު 24,000 ރުފިޔާ، އޭގެ ކުރިން 12,500 ރުފިޔާ. ހުރިހާ ޢަދަދެއް މި ރޭޓުން ބެހިގެންދޭ.",
    scaleSources: "އަޅާކިޔުމަށް ބޭނުންކުރި ޢަދަދުތަކާއި މަޞްދަރު",
    showMore: "އިތުރަށް ދައްކާ",
    showingOf: "{total} ން {shown}",
    backToTop: "މައްޗަށް",
    actTotalKicker: "2014 ން ފެށިގެން ދައުލަތުން ޚަރަދުކޮށްފައިވަނީ",
    actTotalOn: "ރައްޔިތުންގެ މަޖިލީހުގެ މެންބަރުންނާއި އެ ބޭފުޅުންގެ ޢާއިލާތަކުގެ ހެލްތު އިންޝުއަރެންސަށް.",
    actPerHeadKicker: "ޕްރީމިއަމް ދައްކަނީ ބޮލަކަށް",
    actPerHeadLead: (rate: number) =>
      `ކަވަރު ކުރެވޭ ކޮންމެ މީހަކަށް އަހަރަކު ${rate.toLocaleString("en-US")} ރުފިޔާ.`,
    actPerHeadBody:
      "މެންބަރެއްގެ ޢަދަދު ބޮޑުވުމަކީ އެ މެންބަރަށް ބޮޑު ފައިދާއެއް ލިބުމެއް ނޫން. އެއިން ދައްކަނީ ދައުލަތުން ކަވަރު ކުރާ މީހުންގެ ޢަދަދު. މިހާރުގެ މަޖިލީހުގައި 7 މެންބަރަކު ކަވަރު ކުރަނީ ހަމައެކަނި އެ ބޭފުޅުން އަމިއްލައަށް.",
    actRateKicker: "އަދި އަގު ދެގުނަ ވަރު ބޮޑުވި",
    actRateBody:
      "2016-2017 ގައި ބޮލަކަށް ދައްކާ ޕްރީމިއަމް 12,500 ރުފިޔާއިން 24,000 ރުފިޔާއަށް ބޮޑުވި. އެ އަހަރު ކަވަރު ކުރީ އޭގެ ކުރީ އަހަރަށްވުރެ އެއް މެންބަރު މަދުން.",
    actAfterKicker: "މެންބަރުކަމުން ވަކިވުމުންވެސް ހުއްޓައެއް ނުލާ",
    actAfterBody: (payments: number, people: number) =>
      `ކުރީގެ ${people.toLocaleString("en-US")} މެންބަރަކަށް ${payments.toLocaleString("en-US")} ފަހަރު. މިއީ މަޖިލީހުގެ ރެކޯޑުން ދައްކާ ގޮތުގައި އެ ބޭފުޅުން މެންބަރުކަމުގައި ނެތް އަހަރުތަކުގައި. ގިނަ ފަހަރު ސީދާ 24,000 ރުފިޔާ — އެއް މީހެއް، އެއް އަހަރު.`,
    actPartyKicker: "މިއީ އެއް ޕާޓީއެއްގެ ބިލެއް ނޫން",
    actPartyLead: (party: string) =>
      `${party} ގެ ގޮނޑިތަކުގައި ތިއްބެވިއިރު ދެއްކި ފައިސާ — އެއީ ހުރިހާ ޕާޓީއެއްގެ ތެރެއިން އެންމެ ބޮޑު ބައި.`,
    actPartyBody:
      "މަޖިލީހުގެ ގޮނޑިއެއް ލިބުނު ހުރިހާ ޕާޓީއެއް މި ލިސްޓުގައި ހިމެނޭ. ފައިސާ ގުނަނީ އެ ފައިސާ ދެއްކިއިރު އިންނެވި ގޮނޑިއަށް. އެހެންކަމުން ޕާޓީ ބަދަލުކުރެއްވުމުން ކުރީގެ ޚަރަދު އައު ޕާޓީއަކަށް ބަދަލެއް ނުވޭ.",
    seeParties: "ޕާޓީތަކުގެ ތަފްޞީލު",

    partiesHeading: "ކޮންމެ ޕާޓީއެއްގެ ގޮނޑިތަކަށް ކުރި ޚަރަދު",
    partiesIntro:
      "ފައިސާ ދެއްކިއިރު މެންބަރު އިންނެވި ގޮނޑީގެ ޕާޓީއަށް ބަހާލާފައި. މިހާރު ހުންނެވި ޕާޓީއަކަށް ނޫން. ޕާޓީ ބަދަލުކުރެއްވި ބޭފުޅުން ދެ ޕާޓީގައިވެސް ހިމެނޭ، ކޮންމެ އަހަރެއް އެ އަހަރު އިންނެވި ގޮނޑިއަށް.",
    partiesAttributionNote:
      "ޕާޓީ ރެކޯޑްކުރެވެނީ ގޮނޑިއަށް، ބޭފުޅާއަށް ނޫން: 2024 ވަނަ އަހަރުގެ އިންތިޚާބުގެ ހަތަރު ދުވަހުގެ ތެރޭގައި 6 މިނިވަން މެންބަރަކު ޕީއެންސީއަށް ބަދަލުވި. އެއްވެސް ޢަދަދެއް ބައިކޮށްފައެއް ނުވޭ. ވަކި އެއް ޕާޓީއަކަށް ނިސްބަތްނުކުރެވޭ ފައިސާ ޕާޓީތަކުގެ ޢަދަދުތަކުން ބޭރުކޮށް، ތިރީގައި ފުރިހަމައަށް ދައްކާފައި.",
    partiesUnattributed: "ވަކި ޕާޓީއަކަށް ނިސްބަތްނުކުރެވޭ",
    partiesUnattributedBody: (
      payments: number,
      afterOffice: number,
      crossed: number,
      noParty: number,
    ) =>
      `ޖުމްލަ ${payments} ފަހަރު: ${afterOffice} ފަހަރަކީ ރެކޯޑުން ދައްކާ ގޮތުގައި ގޮނޑިއެއް ނެތް މާލީ އަހަރުތަކުގައި، ${crossed} ފަހަރަކީ ދެ ޕާޓީއެއްގެ ގޮނޑިއަށް ފެތޭ މުއްދަތުތަކުގައި، އަދި ${noParty} ފަހަރު ގޮނޑިއަށް ޕާޓީއެއް ރެކޯޑްކޮށްފައެއް ނުވޭ. ފަހު ބަޔަކީ މިނިވަން މެންބަރުންނެއް ނޫން، އަދި އެއާ އެއްކޮށްފައެއްވެސް ނުވޭ.`,
    colParty: "ޕާޓީ",
    colMembers: "މެންބަރުން",
    colPerMemberYear: "މެންބަރު-އަހަރަކަށް",
    colAvgPerMember: "މެންބަރަކަށް ޖެހޭ ޢަދަދު",
    colTenure: "ފުރުއްވި ދައުރު",

    tenureHeading: "ދިގު މުއްދަތެއްގެ އަގު",
    tenureIntro:
      "މެންބަރުން ބަހާލާފައިވަނީ ފުރުއްވި މަޖިލިސް ދައުރުގެ ޢަދަދުން. އެއް ދައުރަކީ 5 އަހަރު.",
    tenureWindowCaveat:
      "ޖުމްލަ ޢަދަދުތައް ސީދާ އަޅާކިޔޭކަށް ނެތް: މި ލިޔުމުގައި ހިމެނެނީ 2014 ން 2025 އަށް. އެއް ދައުރު ފުރުއްވި ބޭފުޅުންނަށް އެ މުއްދަތުގެ ބައެއް އެކަނި ލިބެނީ. އަޅާކިޔަން ރަނގަޅީ މެންބަރު-އަހަރަކަށް ޖެހޭ ޢަދަދު. އެ ޢަދަދުގައިވެސް އަގު ބޮޑުވުމުގެ އަސަރު ހިމެނޭ: 2016-2017 ގެ ކުރިން ބޮލަކަށް ދެއްކީ 12,500 ރުފިޔާ ކަމުން، ކުރީ އަހަރުތައް ގިނަ ބަޔެއްގެ އަހަރަކަށް ޖެހޭ ޢަދަދު ދަށްކޮށް ދައްކާ.",
    tenureCohortLabel: (terms: number) => `${terms} ދައުރު`,

    actFindKicker: "ތިޔަބޭފުޅާގެ މެންބަރު ބައްލަވާ",
    seeAllMembers: (n: number) => `ހުރިހާ ${n} މެންބަރުން ބައްލަވާ`,
    membersHeading: "ރެކޯޑުގައި ހިމެނޭ ހުރިހާ މެންބަރުން",
    membersIntro:
      "18، 19 އަދި 20 ވަނަ މަޖިލީހުގެ ލިޔުންތަކުގައި ހިމެނޭ ހުރިހާ ބޭފުޅުން. ނަން، ދާއިރާ ނުވަތަ ޕާޓީން ހޯއްދަވާ.",
    yearOne: "އަހަރު",
    yearMany: "އަހަރު",

    profileTotal: "މި ޕޮލިސީއަށް ދެއްކި ޖުމްލަ ޕްރީމިއަމް",
    profileYears: "ފައިސާ ދެއްކި މާލީ އަހަރު",
    profileCoverNote:
      "މެންބަރާއި ޑިޕެންޑެންޓުން ހިމެނޭ. ދައްކަނީ ބޮލަކަށް.",
    profileTerms: "މަޖިލިސް ދައުރު",
    profileBreakdown: "މާލީ އަހަރުތަކުގެ ތަފްޞީލު",
    profileNoPayment: "ރެކޯޑެއް ނެތް",
    profileSameName: "މި ނަމުގައި އިތުރު މެންބަރެއް",
    profileSameNameNote:
      "މިއީ އަސްލު ލިޔުމުގައި ވަކި ދެ ސަފުހާ. އެއް ބޭފުޅެއްތޯ ކަށަވަރު ކުރެވެންދެން އެއްކޮށްފައެއް ނުވޭ.",
    backToList: "ހުރިހާ މެންބަރުން",
    profileServing: "މިހާރު މެންބަރުކަމުގައި",
    profileFormer: "ކުރީގެ މެންބަރު",
    profileGlance: "ކުރު ޚުލާޞާ",
    profileYearsInOffice: "މެންބަރުކަމުގައި އަހަރު",
    profileParty: "ޕާޓީ",
    profileCareerHeading: "ސިޔާސީ ޙަޔާތް",
    profileCoverHeading: "ހެލްތު އިންޝުއަރެންސް",
    profileTotalOver: (years: number) => `${years} މާލީ އަހަރުން`,
    profilePeakYear: (heads: number) =>
      `އެންމެ ބޮޑު ޚަރަދު ދިޔަ އަހަރު މި ޕޮލިސީން ކަވަރު ކުރީ ${heads} މީހުން.`,
    profileSourcesHeading: "މި ޞަފްޙާގެ މަޞްދަރުތައް",
    profileSourcesNote:
      "މި ޞަފްޙާގައި ހުރި ހުރިހާ މަޢުލޫމާތެއް ނަގާފައިވަނީ މި ލިޔުންތަކުން.",
    positionsHeading: "ފުރުއްވި މަޤާމުތައް",
    inferredLabel: "ބެލެވޭ ގޮތުގައި",
    stillServing: "މިހާރު",
    speakerLabel: "މަޖިލީހުގެ ރައީސް",
    partyLabel: "ޕާޓީ",

    termLabel: (n: number) => `${n} ވަނަ މަޖިލިސް`,
    sourceHeading: "މަޞްދަރު",
    sourceNote:
      "މި ޞަފްޙާގެ ހުރިހާ ޢަދަދެއް ނަގާފައިވަނީ މަޖިލީހުން އާންމުކުރި ލިޔުމުން.",
    viewSource: "އަސްލު ލިޔުން",
    currencyNote: "ހުރިހާ ޢަދަދެއް ދިވެހި ރުފިޔާއިން.",
  },
} as const;

export type Dict = (typeof dictionaries)["en"];

export function getDict(lang: Lang): Dict {
  return dictionaries[lang] as Dict;
}

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
