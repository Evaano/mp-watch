import { Numeral } from "./Numeral";
import {
  AASANDHA,
  CITIZENS,
  MINIMUM_WAGE_ANNUAL,
  MINIMUM_WAGE_MONTHLY,
} from "@/lib/comparators";
import type { Dict } from "@/lib/i18n";
import { CURRENT_PER_HEAD_RATE } from "@/lib/premium";

/**
 * Gives the totals a sense of scale.
 *
 * Everything here is either arithmetic on our own data or a cited external
 * figure. The framing is comparison, not adjectives: a reader who disputes
 * "excessive" has nothing to check, while a reader who disputes "more than a
 * year of the minimum wage" can go and check it, and will find it holds.
 */
export function ImpactPanel({
  dict,
  total,
  perDay,
  afterOffice,
  aboveMinimumWage,
  singleYearPeak,
}: {
  dict: Dict;
  total: number;
  perDay: number;
  afterOffice: { payments: number; amount: number; people: number; unknownTerm: number };
  aboveMinimumWage: number;
  singleYearPeak: number;
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-card border border-line bg-surface-raised p-5 sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          {dict.afterOfficeHeading}
        </h2>

        <p className="mt-4 text-3xl font-semibold sm:text-4xl">
          <Numeral value={afterOffice.amount} currency />
        </p>
        <p className="mt-2 max-w-[62ch] text-ink-muted">
          {dict.afterOfficeBody(
            afterOffice.payments,
            afterOffice.people,
          )}
        </p>

        {/* The caveat sits with the number, not in a footnote. A floor that is
            presented as a total is the thing an opponent goes after first. */}
        <p className="mt-4 max-w-[62ch] border-s-2 border-line-strong ps-3 text-sm text-ink-muted">
          {dict.afterOfficeCaveat(afterOffice.unknownTerm)}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <Fact
          label={dict.scalePerDay}
          value={<Numeral value={perDay} currency />}
          note={dict.scalePerDayNote}
        />
        <Fact
          label={dict.scaleMinWage}
          value={<Numeral value={aboveMinimumWage} />}
          note={dict.scaleMinWageNote(MINIMUM_WAGE_MONTHLY.value, MINIMUM_WAGE_ANNUAL)}
        />
        <Fact
          label={dict.scalePerCitizen}
          value={<Numeral value={Math.round(total / CITIZENS.value)} currency />}
          note={dict.scalePerCitizenNote(CITIZENS.value)}
        />
      </dl>

      <p className="max-w-[70ch] text-sm text-ink-muted">
        {dict.aasandhaNote}{" "}
        <a
          href={AASANDHA.sourceUrl}
          rel="noreferrer"
          className="text-accent-ink underline underline-offset-4"
        >
          {AASANDHA.sourcePublisher}
        </a>
        {". "}
        {dict.peakNote}{" "}
        <span className="numeral font-medium text-ink">
          MVR {singleYearPeak.toLocaleString("en-US")}
        </span>
        {dict.peakNoteHeads(Math.round(singleYearPeak / CURRENT_PER_HEAD_RATE))}
      </p>

      <p className="max-w-[70ch] text-sm text-ink-muted">{dict.perHeadNote}</p>
    </section>
  );
}

function Fact({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="bg-surface-raised px-5 py-5">
      <dt className="label-eyebrow text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl font-semibold">{value}</dd>
      <p className="label-note mt-1 text-ink-muted">{note}</p>
    </div>
  );
}
