import type { Metadata } from "next";
import { MemberSearch } from "@/components/MemberSearch";
import { dict } from "@/lib/i18n";
import { registry, toSummary } from "@/lib/registry";

export const metadata: Metadata = {
  title: dict.membersHeading,
  description: dict.membersIntro,
};

/** The full directory. The home page shows a handful and links here. */
export default function MembersPage() {
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
