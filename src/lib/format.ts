import type { Lang } from "./i18n";

/**
 * Figures stay in Latin digits in both languages. Maldivian official
 * publications, including the source document, print them that way.
 */
const LOCALE = "en-US";

export function money(amount: number): string {
  return amount.toLocaleString(LOCALE);
}

/** Short form for axis ticks and dense tables: 2.4M, 168k, 500. */
export function moneyCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(amount);
}

export function count(n: number): string {
  return n.toLocaleString(LOCALE);
}

/** "2014-2015" -> "14/15", for tick labels where space is tight. */
export function fiscalYearShort(year: string): string {
  const [from, to] = year.split("-");
  return `${from.slice(2)}/${to.slice(2)}`;
}

export function href(lang: Lang, path = ""): string {
  return `/${lang}${path}`;
}
