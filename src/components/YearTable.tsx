import { Numeral } from "./Numeral";
import type { YearDatum } from "./YearColumns";
import type { Dict } from "@/lib/i18n";

/**
 * The numbers behind the chart. Present on every page that shows a chart, so
 * the data is reachable without reading a graphic.
 */
export function YearTable({
  data,
  dict,
  emptyLabel,
}: {
  data: YearDatum[];
  dict: Dict;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-start">
            <th scope="col" className="py-2 pe-4 text-start font-medium text-ink-muted">
              {dict.colYears}
            </th>
            <th scope="col" className="py-2 text-end font-medium text-ink-muted">
              {dict.colTotal}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.year} className="border-b border-line/60 last:border-0">
              <th scope="row" className="py-2 pe-4 text-start font-normal">
                <span className="numeral">{d.year}</span>
              </th>
              <td className="py-2 text-end">
                {d.value > 0 ? (
                  <Numeral value={d.value} />
                ) : (
                  <span className="text-ink-muted">{emptyLabel}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
