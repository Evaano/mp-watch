import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConstituencyName, MemberName } from "@/components/MemberName";
import { Numeral } from "@/components/Numeral";
import { PositionList } from "@/components/PositionList";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import { href } from "@/lib/format";
import { getDict, isLang, LANGS } from "@/lib/i18n";
import { registry } from "@/lib/registry";
import type { Person } from "@/lib/schema";

/** MemberName and ConstituencyName take a person plus their seat. */
function nameProps(person: Person) {
  const seat = registry.seat(person.id);
  return {
    name: person.name,
    nameLatin: person.nameLatin,
    title: person.title,
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
  const seatSource = registry.primarySource();

  return (
    <div className="flex flex-col gap-12">
      <div>
        <Link
          href={href(lang)}
          className="text-sm text-accent-ink underline underline-offset-4"
        >
          {dict.backToList}
        </Link>

        <header className="mt-5">
          <h1>
            <MemberName member={nameProps(person)} lang={lang} size="lg" />
          </h1>
          <p className="mt-2 text-ink-muted">
            <ConstituencyName member={nameProps(person)} lang={lang} />
            {party ? (
              <span className="ms-2 rounded-card bg-surface-sunken px-2 py-0.5 text-sm">
                {party}
              </span>
            ) : null}
          </p>
          {terms.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {terms.map((term) => (
                <li
                  key={term}
                  className="rounded-card bg-accent-wash px-2.5 py-1 text-sm text-accent-ink"
                >
                  {dict.termLabel(term)}
                </li>
              ))}
            </ul>
          ) : null}
        </header>
      </div>

      <StatRow>
        <StatTile
          label={dict.profileTotal}
          value={<Numeral value={registry.totalSpent(person.id)} currency />}
          note={
            <>
              <span className="numeral">
                #{rank} / {totals.people}
              </span>
              <span className="mt-1 block">{dict.profileCoverNote}</span>
            </>
          }
        />
        <StatTile
          label={dict.profileYears}
          value={<Numeral value={registry.yearsPaid(person.id)} />}
          note={
            <span className="numeral">{`/ ${registry.fiscalYears.length}`}</span>
          }
        />
        <StatTile
          label={dict.profileTerms}
          value={<Numeral value={terms.length} />}
          note={<span className="numeral">{terms.join(", ")}</span>}
        />
        <StatTile
          label={dict.sourceHeading}
          value={
            <a
              href={seatSource.url}
              rel="noreferrer"
              className="text-base font-medium text-accent-ink underline underline-offset-4"
            >
              PDF
            </a>
          }
        />
      </StatRow>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.positionsHeading}
        </h2>
        <div className="mt-4">
          <PositionList positions={positions} lang={lang} dict={dict} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileBreakdown}
        </h2>
        <div className="mt-6">
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
          <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">
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
    </div>
  );
}
