import Image from "next/image";
import Link from "next/link";
import { ConstituencyName, MemberName } from "./MemberName";
import { Numeral } from "./Numeral";
import { href } from "@/lib/format";
import type { PersonSummary } from "@/lib/registry";
import type { Lang } from "@/lib/i18n";

/**
 * One member, as a card in the directory grid.
 *
 * The portrait is the point: a name in a list is a row, a face is a person. It
 * is also the first thing that makes this readable to someone who is not going
 * to study a table.
 */
export function MemberCard({
  member,
  lang,
  yearLabel,
}: {
  member: PersonSummary;
  lang: Lang;
  yearLabel: string;
}) {
  return (
    <Link
      href={href(lang, `/mp/${member.id}`)}
      className="group flex flex-col rounded-card border border-line bg-surface-raised p-3 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-4"
    >
      <div className="relative mx-auto aspect-square w-20 overflow-hidden rounded-full border border-line bg-surface-sunken sm:w-24">
        {member.photo ? (
          <Image
            src={member.photo}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center text-2xl text-ink-muted"
          >
            {member.nameLatin.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="mt-3 text-center">
        <MemberName member={member} lang={lang} />
        <p className="label-note mt-1 text-ink-muted">
          <ConstituencyName member={member} lang={lang} />
        </p>
        {member.party ? (
          <p className="label-eyebrow mt-1.5 text-ink-muted">{member.party}</p>
        ) : null}
      </div>

      <div className="mt-3 border-t border-line pt-2 text-center">
        <p className="font-medium">
          <Numeral value={member.total} currency />
        </p>
        <p className="label-note text-ink-muted">
          <Numeral value={member.yearsPaid} /> {yearLabel}
        </p>
      </div>
    </Link>
  );
}
