import { fiscalYearShort, money, moneyCompact } from "@/lib/format";

export interface YearDatum {
  year: string;
  value: number;
}

/**
 * One series of magnitude over time, so: columns, one hue, no legend. The
 * chart carries the shape; the table under it carries the numbers. Both read
 * from the same array, so they can never disagree.
 *
 * Built from HTML rather than SVG on purpose. In an SVG the labels scale with
 * the viewBox, so a chart that is legible on a laptop renders 4px text on a
 * phone. Here the labels are real text at a real size at every width.
 *
 * The columns are not reversed for Dhivehi either: the flex row already
 * follows the document's dir, so the earliest year lands on the reading-start
 * edge in both languages.
 */
export function YearColumns({
  data,
  ariaLabel,
}: {
  data: YearDatum[];
  ariaLabel: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const peakYear = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])
    .year;

  return (
    <figure className="m-0" role="img" aria-label={ariaLabel}>
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

            <ol className="absolute inset-0 flex items-end gap-[3px] sm:gap-2">
              {data.map((d) => {
                const pct =
                  d.value === 0 ? 0 : Math.max((d.value / max) * 100, 1.5);
                const isPeak = d.year === peakYear && d.value > 0;
                return (
                  <li
                    key={d.year}
                    className="relative flex h-full min-w-0 flex-1 items-end"
                    title={`${d.year}: MVR ${money(d.value)}`}
                  >
                    {/* Direct-label the peak only. A number on every column is noise. */}
                    {isPeak ? (
                      <span
                        className="numeral absolute inset-x-0 text-center text-[11px] font-semibold"
                        style={{ bottom: `calc(${pct}% + 4px)` }}
                      >
                        {moneyCompact(d.value)}
                      </span>
                    ) : null}
                    <div
                      className={`w-full rounded-t-[4px] bg-accent ${isPeak ? "" : "opacity-80"}`}
                      style={{ height: `${pct}%` }}
                    />
                  </li>
                );
              })}
            </ol>
          </div>

          <ol className="mt-2 flex gap-[3px] sm:gap-2">
            {data.map((d, i) => (
              <li
                key={d.year}
                className="numeral min-w-0 flex-1 text-center text-[10px] text-ink-muted sm:text-[11px]"
              >
                {/* Alternate ticks only on the narrowest screens. */}
                <span className={i % 2 === 1 ? "hidden min-[420px]:inline" : ""}>
                  {fiscalYearShort(d.year)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  );
}
