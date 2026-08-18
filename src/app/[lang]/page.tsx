import { notFound } from "next/navigation";
import { ImpactPanel } from "@/components/ImpactPanel";
import { MemberSearch } from "@/components/MemberSearch";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import { MINIMUM_WAGE_ANNUAL } from "@/lib/comparators";
import { registry, toSummary } from "@/lib/registry";
import { getDict, isLang } from "@/lib/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDict(lang);
  const source = registry.primarySource();

  const ranked = registry.ranked();
  const totals = registry.totals();
  const perYear = registry.fiscalYears.map((year) => ({
    year,
    value: totals.byYear[year] ?? 0,
  }));

  const afterOffice = registry.afterOffice();
  const days = registry.periodDays();
  const singleYear = registry
    .people()
    .flatMap((p) => registry.expenditure(p.id).map((c) => c.amount));
  const aboveMinimumWage = singleYear.filter((a) => a > MINIMUM_WAGE_ANNUAL).length;
  const singleYearPeak = Math.max(...singleYear, 0);

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h1 className="max-w-[22ch] text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.homeHeading}
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink-muted">{dict.homeIntro}</p>
      </section>

      <ImpactPanel
        dict={dict}
        total={totals.amount}
        perDay={Math.round(totals.amount / Math.max(days, 1))}
        afterOffice={afterOffice}
        aboveMinimumWage={aboveMinimumWage}
        singleYearPeak={singleYearPeak}
      />

      <section>
        <StatRow>
          <StatTile
            label={dict.statTotalPaid}
            value={<Numeral value={totals.amount} currency />}
          />
          <StatTile
            label={dict.statMembers}
            value={<Numeral value={totals.people} />}
          />
          <StatTile
            label={dict.statYears}
            value={<Numeral value={registry.fiscalYears.length} />}
            note={
              <span className="numeral">
                {`${source.periodStart?.slice(0, 4)}-${source.periodEnd?.slice(0, 4)}`}
              </span>
            }
          />
          <StatTile
            label={dict.statHighest}
            value={<Numeral value={registry.totalSpent(ranked[0].id)} currency />}
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
            emptyLabel={dict.profileNoPayment}
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
            showMore: dict.showMore,
            showingOf: dict.showingOf,
            yearOne: dict.yearOne,
            yearMany: dict.yearMany,
          }}
        />
      </section>
    </div>
  );
}
