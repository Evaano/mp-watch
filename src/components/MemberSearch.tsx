"use client";

import Link from "next/link";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { ConstituencyName, MemberName } from "./MemberName";
import { Numeral } from "./Numeral";
import type { PersonSummary } from "@/lib/registry";
import { href } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/** Only serializable strings cross into the client bundle. */
export interface SearchLabels {
  heading: string;
  placeholder: string;
  empty: string;
  countTemplate: string;
  showMore: string;
  showingOf: string;
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
  members: PersonSummary[];
  lang: Lang;
  labels: SearchLabels;
}) {
  const PAGE = 25;
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const deferred = useDeferredValue(query);
  const inputId = useId();

  // A new search starts from the top of its own results, not part-way down the
  // previous one's. Adjusted during render rather than in an effect: an effect
  // would render the new results at the old offset first, then immediately
  // re-render, which is the cascading update React warns about.
  const [lastQuery, setLastQuery] = useState(deferred);
  if (lastQuery !== deferred) {
    setLastQuery(deferred);
    setVisible(PAGE);
  }

  const results = useMemo(() => {
    const term = deferred.trim();
    if (!term) return members;
    const lower = term.toLowerCase();
    return members.filter(
      (m) =>
        m.nameLatin.toLowerCase().includes(lower) ||
        m.constituencyLatin.toLowerCase().includes(lower) ||
        (m.party ?? "").toLowerCase() === lower ||
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
          {results.slice(0, visible).map((m) => (
            <li key={m.id}>
              <Link
                href={href(lang, `/mp/${m.id}`)}
                className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="min-w-0">
                  <MemberName member={m} lang={lang} />
                  {m.party ? (
                    <span className="mt-1 me-2 inline-block rounded-card bg-surface-sunken px-1.5 py-0.5 text-[11px] text-ink-muted">
                      {m.party}
                    </span>
                  ) : null}
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

      {results.length > visible ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((n) => n + PAGE)}
            className="rounded-card border border-line-strong px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {labels.showMore}
          </button>
          <p className="numeral text-xs text-ink-muted">
            {labels.showingOf
              .replace("{shown}", String(Math.min(visible, results.length)))
              .replace("{total}", String(results.length))}
          </p>
        </div>
      ) : null}
    </div>
  );
}
