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
    navSpending: "Spending",
    navAbout: "About",

    homeHeading: "What the Majlis spent on its own members",
    homeIntro:
      "Eleven years of health insurance premiums paid for members of the People's Majlis, taken line by line from the Majlis disclosure.",
    findYourMp: "Find your MP",
    searchPlaceholder: "Search by name or constituency",
    searchEmpty: "No member matches that search.",
    searchCountTemplate: "{n} members",

    statTotalPaid: "Total paid",
    statMembers: "Member records",
    statYears: "Fiscal years",
    statHighest: "Highest single record",

    perYearHeading: "Premiums paid each fiscal year",
    perYearNote:
      "Each fiscal year runs 28 May to 27 May. The rise in 2016-2017 and again in 2024-2025 follows a change in the number of members covered.",

    colMember: "Member",
    colConstituency: "Constituency",
    colYears: "Years",
    colTotal: "Total",
    showTable: "Show the figures",
    yearOne: "year",
    yearMany: "years",

    profileTotal: "Total premiums paid",
    profileYears: "Fiscal years with a payment",
    profileTerms: "Majlis terms",
    profileBreakdown: "Payments by fiscal year",
    profileNoPayment: "No payment recorded",
    profileSameName: "Another member shares this name",
    profileSameNameNote:
      "These are separate rows in the source document. We do not merge them, because deciding whether they are one person needs a human check.",
    backToList: "All members",
    positionsHeading: "Positions held",
    inferredLabel: "Inferred",
    stillServing: "present",

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
    navSpending: "ޚަރަދު",
    navAbout: "މަޢުލޫމާތު",

    homeHeading: "މަޖިލީހުން މެންބަރުންނަށް ކުރި ޚަރަދު",
    homeIntro:
      "ރައްޔިތުންގެ މަޖިލީހުގެ މެންބަރުންނަށް ހެލްތު އިންޝުއަރެންސް ޕްރީމިއަމަށް 11 އަހަރު ދުވަހުގެ ތެރޭގައި ހިނގާފައިވާ ޚަރަދު.",
    findYourMp: "ތިޔަބޭފުޅާގެ މެންބަރު",
    searchPlaceholder: "ނަން ނުވަތަ ދާއިރާ ލިޔުއްވާ",
    searchEmpty: "އެއްވެސް މެންބަރެއް ނުފެނުނު.",
    searchCountTemplate: "{n} މެންބަރުން",

    statTotalPaid: "ޖުމްލަ ޚަރަދު",
    statMembers: "މެންބަރުންގެ ރެކޯޑް",
    statYears: "މާލީ އަހަރު",
    statHighest: "އެންމެ ބޮޑު ރެކޯޑް",

    perYearHeading: "ކޮންމެ މާލީ އަހަރަކު ކުރި ޚަރަދު",
    perYearNote:
      "ކޮންމެ މާލީ އަހަރެއް ފެށެނީ މޭ 28 ގައި، ނިމެނީ މޭ 27 ގައި.",

    colMember: "މެންބަރު",
    colConstituency: "ދާއިރާ",
    colYears: "އަހަރު",
    colTotal: "ޖުމްލަ",
    showTable: "ޢަދަދުތައް ދައްކާ",
    yearOne: "އަހަރު",
    yearMany: "އަހަރު",

    profileTotal: "ޖުމްލަ ޕްރީމިއަމް",
    profileYears: "ފައިސާ ދެއްކި މާލީ އަހަރު",
    profileTerms: "މަޖިލިސް ދައުރު",
    profileBreakdown: "މާލީ އަހަރުތަކުގެ ތަފްޞީލު",
    profileNoPayment: "ރެކޯޑެއް ނެތް",
    profileSameName: "މި ނަމުގައި އިތުރު މެންބަރެއް",
    profileSameNameNote:
      "މިއީ އަސްލު ލިޔުމުގައި ވަކި ދެ ސަފުހާ. އެއް ބޭފުޅެއްތޯ ކަށަވަރު ކުރެވެންދެން އެއްކޮށްފައެއް ނުވޭ.",
    backToList: "ހުރިހާ މެންބަރުން",
    positionsHeading: "ފުރުއްވި މަޤާމުތައް",
    inferredLabel: "ބެލެވޭ ގޮތުގައި",
    stillServing: "މިހާރު",

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
