import type { Metadata } from "next";
import { Numeral } from "@/components/Numeral";
import { dict } from "@/lib/i18n";
import { registry } from "@/lib/registry";

export const metadata: Metadata = {
  title: dict.partiesHeading,
  description: dict.partiesIntro,
};

/**
 * Two comparisons the member pages cannot make on their own: what each party's
 * seats cost, and what a longer career costs.
 *
 * Party codes are printed as the roster prints them. No full party names exist
 * in any source this repo holds, and writing them from memory would be an
 * unsourced assertion on a page whose whole point is attribution.
 */
export default function PartiesPage() {
  const { parties, unattributed } = registry.partyTotals();
  const cohorts = registry.tenureCohorts();


  return (
    <div className="flex flex-col gap-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.partiesHeading}
        </h1>
        <p className="mt-3 max-w-[62ch] text-ink-muted">{dict.partiesIntro}</p>
      </header>

      <section>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pe-2 text-start font-medium sm:pe-4 text-ink-muted">
                  {dict.colParty}
                </th>
                <th scope="col" className="py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted">
                  {dict.colMembers}
                </th>
                <th scope="col" className="py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted">
                  {dict.colTotal}
                </th>
                <th scope="col" className="py-2 text-end font-medium text-ink-muted">
                  {dict.colPerMemberYear}
                </th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr key={party.party} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-2.5 pe-2 text-start font-normal sm:pe-4">
                    <span className="numeral font-medium">{party.party}</span>
                  </th>
                  <td className="py-2.5 pe-2 text-end sm:pe-4">
                    <Numeral value={party.members} />
                  </td>
                  <td className="py-2.5 pe-2 text-end sm:pe-4">
                    <Numeral value={party.amount} />
                  </td>
                  <td className="py-2.5 text-end text-ink-muted">
                    <Numeral value={party.perMemberYear} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="label-note mt-4 max-w-[70ch] text-ink-muted">
          {dict.partiesAttributionNote}
        </p>
      </section>

      {/* The unattributed money sits beside the table, not in a footnote: it is
          part of the same total, and hiding it would make the party figures
          read as a full account of the spend. */}
      <section className="rounded-card border border-line bg-surface-sunken p-5 sm:p-6">
        <h2 className="label-eyebrow text-ink-muted">
          {dict.partiesUnattributed}
        </h2>
        <p className="figure-lead mt-3">
          <Numeral value={unattributed.amount} currency />
        </p>
        <p className="label-note mt-3 max-w-[70ch] text-ink-muted">
          {dict.partiesUnattributedBody(
            unattributed.payments,
            unattributed.afterOffice,
            unattributed.crossed,
            unattributed.noParty,
          )}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.tenureHeading}
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-muted">{dict.tenureIntro}</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pe-2 text-start font-medium sm:pe-4 text-ink-muted">
                  {dict.colTenure}
                </th>
                <th scope="col" className="py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted">
                  {dict.colMembers}
                </th>
                <th scope="col" className="py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted">
                  {dict.colAvgPerMember}
                </th>
                <th scope="col" className="py-2 text-end font-medium text-ink-muted">
                  {dict.colPerMemberYear}
                </th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.terms} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-2.5 pe-2 text-start font-normal sm:pe-4">
                    {dict.tenureCohortLabel(cohort.terms)}
                  </th>
                  <td className="py-2.5 pe-2 text-end sm:pe-4">
                    <Numeral value={cohort.members} />
                  </td>
                  <td className="py-2.5 pe-2 text-end sm:pe-4">
                    <Numeral value={cohort.perMember} />
                  </td>
                  <td className="py-2.5 text-end text-ink-muted">
                    <Numeral value={cohort.perMemberYear} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="label-note mt-4 max-w-[70ch] border-s-2 border-line-strong ps-3 text-ink-muted">
          {dict.tenureWindowCaveat}
        </p>
      </section>
    </div>
  );
}
