import { notFound } from "next/navigation";
import { MemberSearch } from "@/components/MemberSearch";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import { allowances, toSummary } from "@/lib/allowances";
import { getDict, isLang } from "@/lib/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDict(lang);

  const ranked = allowances.ranked();
  const perYear = allowances.fiscalYears.map((year) => ({
    year,
    value: allowances.totals.byYear[year] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h1 className="max-w-[22ch] text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.homeHeading}
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink-muted">{dict.homeIntro}</p>
      </section>

      <section>
        <StatRow>
          <StatTile
            label={dict.statTotalPaid}
            value={<Numeral value={allowances.totals.amount} currency />}
          />
          <StatTile
            label={dict.statMembers}
            value={<Numeral value={allowances.totals.records} />}
          />
          <StatTile
            label={dict.statYears}
            value={<Numeral value={allowances.fiscalYears.length} />}
            note={
              <span className="numeral">
                {`${allowances.source.periodStart.slice(0, 4)}-${allowances.source.periodEnd.slice(0, 4)}`}
              </span>
            }
          />
          <StatTile
            label={dict.statHighest}
            value={<Numeral value={ranked[0].total} currency />}
            note={lang === "dv" ? ranked[0].name : ranked[0].nameLatin}
          />
        </StatRow>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.perYearHeading}
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">
          {dict.perYearNote}
        </p>
        <div className="mt-6">
          <YearColumns
            data={perYear}
            ariaLabel={dict.perYearHeading}
          />
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-accent-ink">
            {dict.showTable}
          </summary>
          <div className="mt-3">
            <YearTable
              data={perYear}
              dict={dict}
              emptyLabel={dict.profileNoPayment}
            />
          </div>
        </details>
      </section>

      <section>
        <MemberSearch
          members={ranked.map(toSummary)}
          lang={lang}
          labels={{
            heading: dict.findYourMp,
            placeholder: dict.searchPlaceholder,
            empty: dict.searchEmpty,
            countTemplate: dict.searchCountTemplate,
            years: dict.colYears,
          }}
        />
      </section>
    </div>
  );
}
