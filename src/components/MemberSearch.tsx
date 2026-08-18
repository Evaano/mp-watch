"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { ConstituencyName, MemberName } from "./MemberName";
import { Numeral } from "./Numeral";
import type { MemberSummary } from "@/lib/allowances";
import { href } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/** Only serializable strings cross into the client bundle. */
export interface SearchLabels {
  heading: string;
  placeholder: string;
  empty: string;
  countTemplate: string;
  /** Dhivehi does not inflect the noun, so both slots may hold one word. */
  yearOne: string;
  yearMany: string;
}

/**
 * 266 records is small enough to filter in the browser, so search stays
 * instant and works without a round trip. Matching runs over both scripts, so
 * "Qasim", "qaasim" and "ޤާސިމް" all find the same member.
 */
export function MemberSearch({
  members,
  lang,
  labels,
}: {
  members: MemberSummary[];
  lang: Lang;
  labels: SearchLabels;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const inputId = useId();

  const results = useMemo(() => {
    const term = deferred.trim();
    if (!term) return members;
    const lower = term.toLowerCase();
    return members.filter(
      (m) =>
        m.nameLatin.toLowerCase().includes(lower) ||
        m.constituencyLatin.toLowerCase().includes(lower) ||
        m.name.includes(term) ||
        m.constituency.includes(term),
    );
  }, [members, deferred]);

  return (
    <div>
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {labels.heading}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.placeholder}
          autoComplete="off"
          className="w-full rounded-card border border-line-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
        <p className="text-sm text-ink-muted" aria-live="polite">
          {labels.countTemplate.replace("{n}", String(results.length))}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-ink-muted">
          {labels.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {results.map((m) => (
            <li key={m.id}>
              <Link
                href={href(lang, `/mp/${m.id}`)}
                className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="min-w-0">
                  <MemberName member={m} lang={lang} />
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    <ConstituencyName member={m} lang={lang} />
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <Numeral value={m.total} currency className="font-medium" />
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    <Numeral value={m.yearsPaid} />{" "}
                    {m.yearsPaid === 1 ? labels.yearOne : labels.yearMany}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
