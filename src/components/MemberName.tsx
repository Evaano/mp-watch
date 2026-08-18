import type { Lang } from "@/lib/i18n";

interface NameLike {
  name: string;
  nameLatin: string;
  title: string | null;
  titleDv?: string | null;
  constituency: string;
  constituencyLatin: string;
}

/**
 * Names are printed in Thaana in the source and stay in Thaana in both
 * languages, because that is the member's actual name. In English the
 * transliteration leads and the Thaana sits underneath, so an English reader
 * can still match the spelling on a ballot paper.
 */
export function MemberName({
  member,
  lang,
  size = "base",
}: {
  member: NameLike;
  lang: Lang;
  size?: "base" | "lg";
}) {
  const primaryClass = size === "lg" ? "text-2xl sm:text-3xl" : "text-base";

  // On a Dhivehi page the document is already lang="dv"; re-declaring it here
  // would apply the Thaana size bump a second time.
  if (lang === "dv") {
    return (
      <span className={`block ${primaryClass} font-medium`}>
        {/* The Thaana honorific, never the Latin label: transliterating it back
            would print "Alfaazil" in the middle of a Thaana name. */}
        {member.titleDv ? `${member.titleDv} ` : ""}
        {member.name}
      </span>
    );
  }

  // English mode shows the Latin name only. The Thaana name is the official
  // spelling and stays the primary form on the Dhivehi side, but repeating it
  // under every Latin name doubled the height of each card for readers who did
  // not ask for it.
  return (
    <span className={`block ${primaryClass} font-medium capitalize`}>
      {member.title ? `${member.title} ` : ""}
      {member.nameLatin}
    </span>
  );
}

export function ConstituencyName({
  member,
  lang,
  className = "",
}: {
  member: NameLike;
  lang: Lang;
  className?: string;
}) {
  if (lang === "dv") {
    return <span className={className}>{member.constituency}</span>;
  }
  return (
    <span className={`capitalize ${className}`}>
      {member.constituencyLatin.replace(/ dhaairaa$/, "")}
    </span>
  );
}
