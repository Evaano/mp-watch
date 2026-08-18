"use client";

import { useId, useState } from "react";
import { fiscalYearShort, money, moneyCompact } from "@/lib/format";

export interface YearDatum {
  year: string;
  value: number;
}

/**
 * One series of magnitude over time, so: columns, one hue, no legend. The
 * chart carries the shape; the table under it carries the numbers.
 *
 * Built from HTML rather than SVG on purpose. In an SVG the labels scale with
 * the viewBox, so a chart that is legible on a laptop renders 4px text on a
 * phone. Here the labels are real text at a real size at every width.
 *
 * The columns are not reversed for Dhivehi: the flex row follows the
 * document's dir, so the earliest year lands on the reading-start edge in both
 * languages.
 *
 * Each column is a real button. That gets keyboard access and screen-reader
 * labelling for free, and makes the exact figure reachable by tap on a phone,
 * where there is no hover at all.
 */
export function YearColumns({
  data,
  ariaLabel,
  emptyLabel,
}: {
  data: YearDatum[];
  ariaLabel: string;
  emptyLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();

  const max = Math.max(...data.map((d) => d.value), 1);
  const peakYear = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])
    .year;
  const shown = active === null ? null : data[active];

  return (
    <figure className="m-0" aria-label={ariaLabel}>
      <div className="flex items-stretch gap-2">
        {/* Scale gutter, on the reading-start edge in both directions. */}
        <div className="relative h-40 w-9 shrink-0 sm:h-52 sm:w-12">
          <span className="numeral absolute end-0 top-0 -translate-y-1/2 text-[11px] text-ink-muted">
            {moneyCompact(max)}
          </span>
          <span className="numeral absolute end-0 top-1/2 -translate-y-1/2 text-[11px] text-ink-muted">
            {moneyCompact(Math.round(max / 2))}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-40 sm:h-52">
            <div className="absolute inset-x-0 top-0 border-t border-line" />
            <div className="absolute inset-x-0 top-1/2 border-t border-line" />
            <div className="absolute inset-x-0 bottom-0 border-t border-line-strong" />

            <ol
              className="absolute inset-0 flex items-end gap-[3px] sm:gap-2"
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => {
                const pct =
                  d.value === 0 ? 0 : Math.max((d.value / max) * 100, 1.5);
                const isPeak = d.year === peakYear && d.value > 0;
                const isActive = active === i;

                return (
                  <li key={d.year} className="flex h-full min-w-0 flex-1">
                    <button
                      type="button"
                      // A bare figure would read as "24,000" with no context.
                      aria-label={
                        d.value > 0
                          ? `${d.year}: MVR ${money(d.value)}`
                          : `${d.year}: ${emptyLabel}`
                      }
                      aria-describedby={isActive ? tooltipId : undefined}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      // Set, never toggle. Toggling reads as broken on a
                      // mouse, where hover has already selected the column and
                      // the click then appears to switch the readout off.
                      onClick={() => setActive(i)}
                      className="group relative flex h-full w-full min-w-0 items-end rounded-t-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {/* Full-height hit area so the target is reachable even
                          where the column itself is only a few pixels tall. */}
                      <span
                        aria-hidden
                        className={`absolute inset-0 rounded-t-[4px] ${isActive ? "bg-accent-wash" : ""}`}
                      />
                      <span
                        aria-hidden
                        className={`relative w-full rounded-t-[4px] bg-accent transition-opacity ${
                          isActive ? "opacity-100" : isPeak ? "opacity-100" : "opacity-80"
                        } ${d.value === 0 ? "border-t border-line-strong" : ""}`}
                        style={{ height: `${pct}%` }}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <ol className="mt-2 flex gap-[3px] sm:gap-2">
            {data.map((d, i) => (
              <li
                key={d.year}
                className={`numeral min-w-0 flex-1 text-center text-[10px] sm:text-[11px] ${
                  active === i ? "font-semibold text-ink" : "text-ink-muted"
                }`}
              >
                {/* Alternate ticks only on the narrowest screens. */}
                <span
                  className={
                    i % 2 === 1 && active !== i ? "hidden min-[420px]:inline" : ""
                  }
                >
                  {fiscalYearShort(d.year)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* A fixed-height readout rather than a floating tooltip: it cannot be
          clipped, cannot overflow a phone's viewport, and does not move the
          layout when it appears. */}
      <figcaption
        id={tooltipId}
        role="status"
        className="mt-3 flex min-h-9 items-center gap-3 rounded-card border border-line bg-surface-raised px-3 py-2 text-sm"
      >
        {shown ? (
          <>
            <span className="numeral text-ink-muted">{shown.year}</span>
            <span className="numeral font-semibold">
              {shown.value > 0 ? `MVR ${money(shown.value)}` : emptyLabel}
            </span>
          </>
        ) : (
          <span className="text-ink-muted">{ariaLabel}</span>
        )}
      </figcaption>
    </figure>
  );
}
