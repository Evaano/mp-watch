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
import { href, money } from "@/lib/format";
import { getDict, isLang, LANGS } from "@/lib/i18n";
import { CURRENT_PER_HEAD_RATE } from "@/lib/premium";
import { photo, registry } from "@/lib/registry";
import type { Person } from "@/lib/schema";

/** MemberName and ConstituencyName take a person plus their seat. */
function nameProps(person: Person) {
  const seat = registry.seat(person.id);
  return {
    name: person.name,
    nameLatin: person.nameLatin,
    title: person.title,
    titleDv: person.titleDv ?? null,
    constituency: seat?.constituency ?? "",
    constituencyLatin: seat?.constituencyLatin ?? "",
  };
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    registry.people().map((person) => ({ lang, id: person.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const person = registry.person(id);
  if (!person || !isLang(lang)) return {};
  const seat = registry.seat(id);
  return {
    title: lang === "dv" ? person.name : person.nameLatin,
    // Travels into search snippets and link previews with no page context to
    // correct it, so it must not read as a payment to the member.
    description: `${person.nameLatin} (${seat?.constituencyLatin ?? ""}) - MVR ${registry
      .totalSpent(id)
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
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const person = registry.person(id);
  if (!person) notFound();

  const dict = getDict(lang);
  const totals = registry.totals();
  const rank = registry.rankOf(person.id);
  const series = registry.spendingSeries(person.id);
  const positions = registry.positions(person.id);
  const terms = registry.termsServed(person.id);
  const party = registry.party(person.id);
  const serving = registry.isServing(person.id);
  const total = registry.totalSpent(person.id);
  const sources = registry.sourcesFor(person.id);
  const portrait = photo(person.id);

  return (
    <div className="flex flex-col gap-14">
      <div>
        <Link
          href={href(lang, "/members")}
          className="text-sm text-accent-ink underline underline-offset-4"
        >
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
                {person.nameLatin.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h1>
              <MemberName member={nameProps(person)} lang={lang} size="lg" />
            </h1>
            <p className="mt-2 text-lg text-ink-muted">
              <ConstituencyName member={nameProps(person)} lang={lang} />
            </p>

            <ul className="mt-4 flex flex-wrap items-center gap-2">
              <li
                className={`label-eyebrow rounded-card px-2.5 py-1 ${
                  serving
                    ? "bg-accent-wash text-accent-ink"
                    : "bg-surface-sunken text-ink-muted"
                }`}
              >
                {serving ? dict.profileServing : dict.profileFormer}
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
          </div>
        </header>
      </div>

      <section>
        <h2 className="label-eyebrow mb-3 text-ink-muted">
          {dict.profileGlance}
        </h2>
        <StatRow>
          <StatTile
            label={dict.profileTerms}
            value={<Numeral value={terms.length} />}
            note={<span className="numeral">{terms.join(", ")}</span>}
          />
          <StatTile
            label={dict.profileYearsInOffice}
            value={<Numeral value={registry.yearsInOffice(person.id)} />}
          />
          <StatTile
            label={dict.profileParty}
            value={<span className="text-2xl">{party ?? "-"}</span>}
          />
          <StatTile
            label={dict.profileTotal}
            value={<Numeral value={total} currency />}
            note={
              <>
                <span className="numeral">
                  #{rank} / {totals.people}
                </span>
                <span className="mt-1 block">{dict.profileCoverNote}</span>
              </>
            }
          />
        </StatRow>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileCareerHeading}
        </h2>
        <div className="mt-5">
          <PositionList positions={positions} lang={lang} dict={dict} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileCoverHeading}
        </h2>
        <p className="label-note mt-2 max-w-[62ch] text-ink-muted">
          {dict.perHeadNote}
        </p>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="figure-lead">
            <Numeral value={total} currency />
          </p>
          <p className="numeral text-lg text-ink-muted">${money(toUsd(total))}</p>
          <p className="label-note text-ink-muted">
            {dict.profileTotalOver(registry.yearsPaid(person.id))}
          </p>
        </div>
        {/* The head count belongs to the peak year, not to the multi-year
            total, and saying so avoids implying the total bought 11 people. */}
        <p className="label-note mt-2 text-ink-muted">
          {dict.profilePeakYear(
            Math.round(
              Math.max(...series.map((s) => s.value), 0) / CURRENT_PER_HEAD_RATE,
            ),
          )}
        </p>

        <div className="mt-7">
          <YearColumns
            data={series}
            ariaLabel={`${dict.profileBreakdown} - ${person.nameLatin}`}
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
                    href={href(lang, `/mp/${otherId}`)}
                    className="text-sm text-accent-ink underline underline-offset-4"
                  >
                    <ConstituencyName member={nameProps(other)} lang={lang} />
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
