import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConstituencyName, MemberName } from "@/components/MemberName";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { YearColumns } from "@/components/YearColumns";
import { YearTable } from "@/components/YearTable";
import { allowances } from "@/lib/allowances";
import { href } from "@/lib/format";
import { getDict, isLang, LANGS } from "@/lib/i18n";

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    allowances.all().map((record) => ({ lang, id: record.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const record = allowances.byId(id);
  if (!record || !isLang(lang)) return {};
  return {
    title: lang === "dv" ? record.name : record.nameLatin,
    description: `${record.nameLatin} (${record.constituencyLatin}) - MVR ${record.total.toLocaleString("en-US")}`,
  };
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const record = allowances.byId(id);
  if (!record) notFound();

  const dict = getDict(lang);
  const rank = allowances.rankOf(record.id);
  const series = allowances.fiscalYears.map((year) => ({
    year,
    value: record.byYear[year] ?? 0,
  }));
  const terms = allowances.termLabelFor(record);

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
            <MemberName member={record} lang={lang} size="lg" />
          </h1>
          <p className="mt-2 text-ink-muted">
            <ConstituencyName member={record} lang={lang} />
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {terms.map((term) => (
              <li
                key={term.number}
                className="rounded-card bg-accent-wash px-2.5 py-1 text-sm text-accent-ink"
              >
                {dict.termLabel(term.number)}
              </li>
            ))}
          </ul>
        </header>
      </div>

      <StatRow>
        <StatTile
          label={dict.profileTotal}
          value={<Numeral value={record.total} currency />}
          note={
            <>
              #<Numeral value={rank} /> / <Numeral value={allowances.totals.records} />
            </>
          }
        />
        <StatTile
          label={dict.profileYears}
          value={<Numeral value={record.yearsPaid} />}
          note={<span className="numeral">{`/ ${allowances.fiscalYears.length}`}</span>}
        />
        <StatTile
          label={dict.profileTerms}
          value={<Numeral value={record.terms.length} />}
          note={<span className="numeral">{terms.map((t) => t.number).join(", ")}</span>}
        />
        <StatTile
          label={dict.sourceHeading}
          value={
            <span className="text-lg font-medium">
              PDF p.<Numeral value={record.sourcePage} />
            </span>
          }
        />
      </StatRow>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {dict.profileBreakdown}
        </h2>
        <div className="mt-6">
          <YearColumns
            data={series}
            ariaLabel={`${dict.profileBreakdown} - ${record.nameLatin}`}
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

      {record.sameNameAs?.length ? (
        <section className="border-s-2 border-line-strong ps-4">
          <h2 className="font-medium">{dict.profileSameName}</h2>
          <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">
            {dict.profileSameNameNote}
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {record.sameNameAs.map((otherId) => {
              const other = allowances.byId(otherId);
              if (!other) return null;
              return (
                <li key={otherId}>
                  <Link
                    href={href(lang, `/mp/${otherId}`)}
                    className="text-sm text-accent-ink underline underline-offset-4"
                  >
                    <ConstituencyName member={other} lang={lang} />
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
