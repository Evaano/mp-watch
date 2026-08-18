import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberSearch } from "@/components/MemberSearch";
import { getDict, isLang, LANGS } from "@/lib/i18n";
import { registry, toSummary } from "@/lib/registry";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const dict = getDict(lang);
  return { title: dict.membersHeading, description: dict.membersIntro };
}

/** The full directory. The home page shows a handful and links here. */
export default async function MembersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDict(lang);
  const ranked = registry.ranked();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.membersHeading}
        </h1>
        <p className="mt-3 max-w-[62ch] text-ink-muted">{dict.membersIntro}</p>
      </header>

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
    </div>
  );
}
