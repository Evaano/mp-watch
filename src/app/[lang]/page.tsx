import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import {
  MINIMUM_WAGE_ANNUAL,
  MINIMUM_WAGE_MONTHLY,
  USD_RATE,
  toUsd,
} from "@/lib/comparators";
import { href, money } from "@/lib/format";
import { getDict, isLang } from "@/lib/i18n";
import { CURRENT_PER_HEAD_RATE } from "@/lib/premium";
import { registry, toSummary } from "@/lib/registry";

/**
 * The home page is a sequence: the total, what it actually buys, the price
 * rise, what continues after members leave, and then the reader's own member.
 *
 * Every figure is read from the registry rather than written into the copy, so
 * a re-ingest cannot leave a stale number in a headline. The caveat travels
 * with the figure it qualifies rather than sitting in a footnote.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDict(lang);

  const source = registry.primarySource();
  const totals = registry.totals();
  const ranked = registry.ranked();
  const afterOffice = registry.afterOffice();
  const days = Math.max(registry.periodDays(), 1);

  const perYear = registry.fiscalYears.map((year) => ({
    year,
    value: totals.byYear[year] ?? 0,
  }));

  const memberYears = ranked.flatMap((p) =>
    registry.expenditure(p.id).map((c) => c.amount),
  );
  const aboveMinimumWage = memberYears.filter(
    (a) => a > MINIMUM_WAGE_ANNUAL,
  ).length;
  const singleYearPeak = Math.max(...memberYears, 0);

  return (
    <div className="flex flex-col gap-24 sm:gap-32">
      {/* Act 1 - the total */}
      <section className="pt-4">
        <div className="reveal">
          <p className="text-lg text-ink-muted sm:text-xl">
            {dict.actTotalKicker}
          </p>
          <p className="figure-hero mt-3">
            <Numeral value={totals.amount} currency />
          </p>
          <p className="numeral mt-2 text-xl text-ink-muted">
            ${money(toUsd(totals.amount))}
          </p>
          <p className="mt-5 max-w-[34ch] text-xl leading-snug sm:text-2xl">
            {dict.actTotalOn}
          </p>
        </div>
      </section>

      {/* Act 2 - what the money buys */}
      <section>
        <div className="reveal">
          <p className="label-eyebrow text-accent-ink">
            {dict.actPerHeadKicker}
          </p>
          <p className="figure-lead mt-3 text-accent-ink">
            {dict.actPerHeadLead(CURRENT_PER_HEAD_RATE)}
          </p>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-ink-muted">
            {dict.actPerHeadBody}
          </p>
        </div>
      </section>

      {/* Act 3 - the price rise, with the chart as the evidence */}
      <section>
        <div className="reveal">
          <p className="label-eyebrow text-ink-muted">{dict.actRateKicker}</p>
          <p className="mt-3 max-w-[58ch] text-lg leading-relaxed">
            {dict.actRateBody}
          </p>
        </div>
        <div className="reveal mt-8">
          <YearColumns
            data={perYear}
            ariaLabel={dict.perYearHeading}
            emptyLabel={dict.profileNoPayment}
          />
          {/* Shown, not hidden behind a disclosure. The figures are the
              evidence for the chart beside them; making a reader ask for them
              implies they are an optional extra. */}
          <div className="mt-8 max-w-md">
            <YearTable
              data={perYear}
              dict={dict}
              emptyLabel={dict.profileNoPayment}
            />
          </div>
        </div>
      </section>

      {/* Act 4 - after office. The one section that uses the flag colour. */}
      <section className="rounded-card border border-flag/30 bg-flag-wash p-5 sm:p-8">
        <div className="reveal">
          <p className="label-eyebrow text-flag">{dict.actAfterKicker}</p>
          <p className="figure-lead mt-3 text-flag">
            <Numeral value={afterOffice.amount} currency />
          </p>
          <p className="numeral mt-1 text-lg text-ink-muted">
            ${money(toUsd(afterOffice.amount))}
          </p>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed">
            {dict.actAfterBody(afterOffice.payments, afterOffice.people)}
          </p>
          {/* The caveat sits with the number, never in a footnote. */}
          <p className="label-note mt-5 max-w-[62ch] border-s-2 border-flag/40 ps-3 text-ink-muted">
            {dict.afterOfficeCaveat(afterOffice.unknownTerm)}
          </p>
        </div>
      </section>

      {/* Supporting figures */}
      <section>
        <div className="reveal">
          <StatRow>
            <StatTile
              label={dict.statTotalPaid}
              value={<Numeral value={totals.amount} currency />}
            />
            <StatTile
              label={dict.scalePerDay}
              value={
                <Numeral value={Math.round(totals.amount / days)} currency />
              }
              note={dict.scalePerDayNote}
            />
            <StatTile
              label={dict.scaleMinWage}
              value={<Numeral value={aboveMinimumWage} />}
              note={dict.scaleMinWageNote(
                MINIMUM_WAGE_MONTHLY.value,
                MINIMUM_WAGE_ANNUAL,
              )}
            />
            <StatTile
              label={dict.scaleUsd}
              value={
                <span className="numeral">${money(toUsd(totals.amount))}</span>
              }
              note={dict.scaleUsdNote(USD_RATE.value)}
            />
          </StatRow>
        </div>

        <div className="reveal">
          <p className="label-note mt-6 max-w-[70ch] text-ink-muted">
            {dict.perHeadNote} {dict.peakNote}{" "}
            <span className="numeral font-medium text-ink">
              MVR {money(singleYearPeak)}
            </span>
            {dict.peakNoteHeads(
              Math.round(singleYearPeak / CURRENT_PER_HEAD_RATE),
            )}
          </p>
          <p className="label-note mt-3 max-w-[70ch] text-ink-muted">
            {dict.aasandhaNote}{" "}
            <a
              href="https://www.aasandha.mv/en/scheme/aasandha-scheme/overview"
              rel="noreferrer"
              className="text-accent-ink underline underline-offset-4"
            >
              Aasandha
            </a>
            {"."}
          </p>
        </div>
      </section>

      {/* Act 5 - a taste of the directory, with the rest on its own page. */}
      <section>
        <p className="label-eyebrow text-ink-muted">{dict.actFindKicker}</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {ranked.slice(0, 8).map((person) => {
            const summary = toSummary(person);
            return (
              <li key={person.id} className="contents">
                <MemberCard
                  member={summary}
                  lang={lang}
                  yearLabel={
                    summary.yearsPaid === 1 ? dict.yearOne : dict.yearMany
                  }
                />
              </li>
            );
          })}
        </ul>
        <Link
          href={href(lang, "/members")}
          className="mt-6 inline-block rounded-card border border-line-strong px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent-ink"
        >
          {dict.seeAllMembers(totals.people)}
        </Link>
      </section>

      <p className="label-note text-ink-muted">
        {source.periodStart?.slice(0, 4)}-{source.periodEnd?.slice(0, 4)}
        {" · "}
        <Numeral value={totals.people} /> {dict.statMembers}
      </p>
    </div>
  );
}
