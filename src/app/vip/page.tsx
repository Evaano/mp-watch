import type { Metadata } from "next";
import Link from "next/link";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { USD_RATE, toUsd } from "@/lib/comparators";
import { money } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { registry } from "@/lib/registry";

export const metadata: Metadata = {
  title: dict.vipHeading,
  description: dict.vipIntro,
};

const TH = "py-2 pe-2 text-start font-medium sm:pe-4 text-ink-muted";
const TH_END = "py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted";
const TD = "py-2 pe-2 sm:pe-4";
const TD_END = "py-2 pe-2 text-end sm:pe-4";

/**
 * Airport VIP: the second thing the Majlis pays for on a member's behalf that
 * anyone has obtained a disclosure for.
 *
 * Deliberately its own page rather than a section on the money pages. VIP
 * never joins a premium total anywhere in this app: the two are different
 * payments over different windows, and adding them would produce a figure no
 * document supports.
 */
export default function VipPage() {
  const terms = registry.vipTerms();
  const ranked = registry.vipRanked();
  const passports = registry.diplomaticPassports();
  const twentieth = registry
    .members()
    .filter((p) => registry.termsServed(p.id).includes(20)).length;

  const movements = terms.reduce((sum, t) => sum + t.movements, 0);
  const amount = Math.round(terms.reduce((sum, t) => sum + t.amount, 0));

  return (
    <div className="flex flex-col gap-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.vipHeading}
        </h1>
        <p className="mt-3 max-w-[62ch] text-ink-muted">{dict.vipIntro}</p>
      </header>

      <section>
        <StatRow cols={2}>
          <StatTile
            label={dict.colMovements}
            value={<Numeral value={movements} />}
          />
          <StatTile
            label={dict.colCost}
            value={<Numeral value={amount} currency />}
            note={
              <>
                <span className="numeral">${money(toUsd(amount))}</span>.{" "}
                {dict.scaleUsdNote(USD_RATE.value)} {dict.vipCostNote}
              </>
            }
          />
        </StatRow>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.vipTermsHeading}
        </h2>
        <div
          className="mt-5 overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label={dict.colTerm}
        >
          <table className="w-full border-collapse text-xs sm:text-sm">
            <caption className="sr-only">{dict.vipTermsHeading}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  {dict.colTerm}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colMembers}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colMovements}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colCost}
                </th>
                <th
                  scope="col"
                  className="py-2 text-end font-medium text-ink-muted"
                >
                  {dict.colPerMovement}
                </th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={term.term} className="border-b border-line/60">
                  <td className={TD}>{dict.termLabel(term.term)}</td>
                  <td className={TD_END}>
                    <Numeral value={term.members} />
                  </td>
                  <td className={TD_END}>
                    <Numeral value={term.movements} />
                  </td>
                  <td className={TD_END}>
                    <Numeral value={Math.round(term.amount)} />
                  </td>
                  <td className="py-2 text-end">
                    <Numeral value={Math.round(term.perMovement)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[62ch] border-s-2 border-line-strong ps-4 text-sm text-ink-muted">
          {dict.vipTermsNote}
        </p>
        <p className="mt-3 max-w-[62ch] text-sm text-ink-muted">
          {dict.vipPartialNote(ranked.length, registry.vipRowsUnmatched())}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.vipRankedHeading}
        </h2>
        <p className="label-note max-w-[62ch] text-ink-muted">
          {dict.vipRankedNote}
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <caption className="sr-only">{dict.vipRankedHeading}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  {dict.colMember}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colMovements}
                </th>
                <th
                  scope="col"
                  className="py-2 text-end font-medium text-ink-muted"
                >
                  {dict.colCost}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row) => (
                <tr key={row.person.id} className="border-b border-line/60">
                  <td className={`${TD} capitalize`}>
                    <Link
                      href={`/mp/${row.person.id}`}
                      className="text-accent-ink underline underline-offset-4"
                    >
                      {row.person.name}
                    </Link>
                    {/* Nine names appear twice in these disclosures. The seat
                        is what tells them apart, so it travels with the name
                        rather than living on another page. */}
                    <span className="label-note block text-ink-muted">
                      {registry.seat(row.person.id)?.constituency ?? ""}
                    </span>
                  </td>
                  <td className={TD_END}>
                    <Numeral value={row.movements} />
                  </td>
                  <td className="py-2 text-end">
                    <Numeral value={Math.round(row.amount)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.vipSourcesHeading}
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {terms.map((term) => {
            const source = registry.source(term.sourceId);
            if (!source) return null;
            return (
              <li key={term.sourceId}>
                <span className="font-medium">{source.title}</span>
                <span className="block text-ink-muted">{source.publisher}</span>
                <a
                  href={source.url}
                  className="mt-1 inline-block text-accent-ink underline underline-offset-4"
                  rel="noreferrer"
                >
                  {dict.appointeesViewDocument}
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-s-2 border-line-strong ps-4">
        <h2 className="font-medium">{dict.vipPassportHeading}</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">
          {dict.vipPassportBody(passports.length, twentieth)}
        </p>
      </section>
    </div>
  );
}
