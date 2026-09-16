import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConstituencyName, MemberName } from "@/components/MemberName";
import { Numeral } from "@/components/Numeral";
import { PositionList } from "@/components/PositionList";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import { toUsd } from "@/lib/comparators";
import { money } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { CURRENT_PER_HEAD_RATE } from "@/lib/premium";
import { photo, registry } from "@/lib/registry";
import type { Person } from "@/lib/schema";

/** MemberName and ConstituencyName take a person plus their seat. */
function nameProps(person: Person) {
  const seat = registry.seat(person.id);
  return {
    name: person.name,
    title: person.title,
    constituency: seat?.constituency ?? "",
  };
}

export function generateStaticParams() {
  return registry.people().map((person) => ({ id: person.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const person = registry.person(id);
  if (!person) return {};
  const seat = registry.seat(id);
  if (!seat) {
    // A political appointee: no seat, and no premium figure to describe.
    return { title: person.name, description: dict.profileAppointeeNote };
  }
  return {
    title: person.name,
    // Travels into search snippets and link previews with no page context to
    // correct it, so it must not read as a payment to the member.
    description: `${person.name} (${seat.constituency ?? ""}) - MVR ${registry
      .totalPremium(id)
      .toLocaleString("en-US")} in health insurance premiums covering this member and their dependents, 2014-2025.`,
  };
}

/**
 * A member's page, shaped as a record of a person rather than a spending
 * report. The portrait and career come first; the money is one section within
 * the record, not the whole of it.
 *
 * The section order is the order new claim types should slot into: who they
 * are, what they held, then what is on the record about them. Pledges,
 * attendance and allegations belong between Career and Cover when they land.
 */
export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = registry.person(id);
  if (!person) notFound();

  const totals = registry.totals();
  const rank = registry.rankOf(person.id);
  const series = registry.spendingSeries(person.id);
  const positions = registry.positions(person.id);
  const terms = registry.termsServed(person.id);
  const party = registry.party(person.id);
  const serving = registry.isServing(person.id);
  const total = registry.totalPremium(person.id);
  const sources = registry.sourcesFor(person.id);
  const portrait = photo(person.id);
  // A political appointee named in a ministry pay sheet is a person on this
  // site, but never sat in the Majlis: no seat, no premium, no rank among
  // members. Rendering the member furniture for them would print "MVR 0" as
  // a headline figure and a rank out of 278 they were never in.
  const isMember = registry.seats(person.id).length > 0;
  const posts = registry
    .politicalPosts()
    .filter((post) => post.personId === person.id);

  return (
    <div className="flex flex-col gap-14">
      <div>
        {/* The way back is a control, not a sentence, and it names where it
            goes: someone arriving from a shared link has no history for a
            generic "back" to use. */}
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 rounded-card border border-line-strong px-3 py-2 text-sm font-medium hover:border-accent hover:text-accent-ink"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {dict.backToList}
        </Link>

        <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
          {/* alt is empty on purpose: the name follows immediately as an h1, so
              a described portrait would just repeat it to a screen reader. */}
          <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-card border border-line bg-surface-sunken sm:w-36">
            {portrait ? (
              <Image
                src={portrait}
                alt=""
                fill
                sizes="144px"
                priority
                className="object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-full w-full items-center justify-center text-4xl text-ink-muted"
              >
                {person.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h1>
              <MemberName member={nameProps(person)} size="lg" />
            </h1>
            {isMember ? (
              <p className="mt-2 text-lg text-ink-muted">
                <ConstituencyName member={nameProps(person)} />
              </p>
            ) : (
              <p className="mt-2 text-lg text-ink-muted">
                {posts[0]?.office ?? ""}
              </p>
            )}

            <ul className="mt-4 flex flex-wrap items-center gap-2">
              <li
                className={`label-eyebrow rounded-card px-2.5 py-1 ${
                  serving
                    ? "bg-accent-wash text-accent-ink"
                    : "bg-surface-sunken text-ink-muted"
                }`}
              >
                {isMember
                  ? serving
                    ? dict.profileServing
                    : dict.profileFormer
                  : dict.profileAppointee}
              </li>
              {party ? (
                <li className="label-eyebrow rounded-card bg-surface-sunken px-2.5 py-1 text-ink-muted">
                  {party}
                </li>
              ) : null}
              {terms.map((term) => (
                <li
                  key={term}
                  className="label-eyebrow rounded-card bg-surface-sunken px-2.5 py-1 text-ink-muted"
                >
                  {dict.termLabel(term)}
                </li>
              ))}
            </ul>

            {/* The figure sits with the identity rather than further down the
                page: a phone screenshot of this header is how the page travels,
                and the qualifier has to travel with the number or it reads as
                money the member was paid. */}
            {isMember ? (
              <>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {/* Held on one line: at this size a wrap after "MVR" reads as
                  two separate figures. The narrow stat tiles need the opposite
                  and are left to wrap. */}
              <p className="figure-lead whitespace-nowrap">
                <Numeral value={total} currency />
              </p>
              <p className="numeral text-lg text-ink-muted">
                ${money(toUsd(total))}
              </p>
              <p className="label-note text-ink-muted">
                {dict.profileTotalOver(registry.yearsPaid(person.id))}
              </p>
            </div>
            <p className="label-note mt-1 max-w-[52ch] text-ink-muted">
              <span className="numeral">
                #{rank} / {totals.people}
              </span>
              {" · "}
              {dict.profileCoverNote}
            </p>
              </>
            ) : (
              <p className="label-note mt-6 max-w-[52ch] text-ink-muted">
                {dict.profileAppointeeNote}
              </p>
            )}
          </div>
        </header>
      </div>

      {isMember ? (
      <section>
        <h2 className="label-eyebrow mb-3 text-ink-muted">
          {dict.profileGlance}
        </h2>
        {/* Party is not a tile: it is already the second chip in the header,
            and the total now leads the header. */}
        <StatRow cols={2}>
          <StatTile
            label={dict.profileTerms}
            value={<Numeral value={terms.length} />}
            note={<span className="numeral">{terms.join(", ")}</span>}
          />
          <StatTile
            label={dict.profileYearsInOffice}
            value={<Numeral value={registry.yearsInOffice(person.id)} />}
          />
        </StatRow>
      </section>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileCareerHeading}
        </h2>
        <div className="mt-5">
          <PositionList positions={positions} dict={dict} />
        </div>
      </section>

      {!isMember && posts.length ? (
        <section>
          <h2 className="text-xl font-semibold tracking-tight">
            {dict.profilePayHeading}
          </h2>
          <p className="mt-3 max-w-[62ch] text-sm text-ink-muted">
            {dict.profilePayNote}
          </p>
          <dl className="mt-5 flex flex-col gap-5">
            {posts.map((post) => (
              <div key={post.id} className="border-s-2 border-line-strong ps-4">
                <dt className="font-medium">{post.designation}</dt>
                <dd className="mt-1 text-sm text-ink-muted">
                  <span className="numeral">
                    {post.occupiedFrom ?? ""}
                    {post.terminatedOn ? ` - ${post.terminatedOn}` : ""}
                  </span>
                </dd>
                <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {post.basic !== undefined ? (
                    <span>
                      {dict.colBasic}{" "}
                      <Numeral value={post.basic} currency />
                    </span>
                  ) : null}
                  {post.components.map((component) => (
                    <span key={component.label}>
                      {component.label}{" "}
                      <Numeral value={component.amount} currency />
                    </span>
                  ))}
                </dd>
                {post.basicAfterDeduction !== undefined ? (
                  <dd className="label-note mt-1 text-ink-muted">
                    {dict.profilePayDeduction(post.basicAfterDeduction)}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {isMember ? (
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileCoverHeading}
        </h2>
        <p className="label-note mt-2 max-w-[62ch] text-ink-muted">
          {dict.perHeadNote}
        </p>

        {/* The head count belongs to the peak year, not to the multi-year
            total, and saying so avoids implying the total bought 11 people. */}
        <p className="label-note mt-4 text-ink-muted">
          {dict.profilePeakYear(
            Math.round(
              Math.max(...series.map((s) => s.value), 0) / CURRENT_PER_HEAD_RATE,
            ),
          )}
        </p>

        <div className="mt-7">
          <YearColumns
            data={series}
            ariaLabel={`${dict.profileBreakdown} - ${person.name}`}
            emptyLabel={dict.profileNoPayment}
          />
        </div>
        <div className="mt-8 max-w-md">
          <YearTable
            data={series}
            dict={dict}
            emptyLabel={dict.profileNoPayment}
          />
        </div>
      </section>
      ) : null}

      {person.possiblySameAs?.length ? (
        <section className="border-s-2 border-line-strong ps-4">
          <h2 className="font-medium">{dict.profileSameName}</h2>
          <p className="label-note mt-2 max-w-[62ch] text-ink-muted">
            {dict.profileSameNameNote}
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {person.possiblySameAs.map((otherId) => {
              const other = registry.person(otherId);
              if (!other) return null;
              return (
                <li key={otherId}>
                  <Link
                    href={`/mp/${otherId}`}
                    className="text-sm text-accent-ink underline underline-offset-4"
                  >
                    <ConstituencyName member={nameProps(other)} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-line pt-6">
        <h2 className="label-eyebrow text-ink-muted">
          {dict.profileSourcesHeading}
        </h2>
        <p className="label-note mt-2 max-w-[62ch] text-ink-muted">
          {dict.profileSourcesNote}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {sources.map((source) => (
            <li key={source.id} className="label-note">
              <a
                href={source.url}
                rel="noreferrer"
                className="text-accent-ink underline underline-offset-4"
              >
                {source.title}
              </a>
              <span className="text-ink-muted"> - {source.publisher}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
