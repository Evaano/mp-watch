import type { Lang } from "@/lib/i18n";

interface NameLike {
  name: string;
  nameLatin: string;
  title: string | null;
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
  const secondaryClass = size === "lg" ? "text-base" : "text-sm";

  // On a Dhivehi page the document is already lang="dv"; re-declaring it here
  // would apply the Thaana size bump a second time.
  if (lang === "dv") {
    return (
      <span className={`block ${primaryClass} font-medium`}>
        {member.title ? `${member.title} ` : ""}
        {member.name}
      </span>
    );
  }

  return (
    <span className="block">
      <span className={`${primaryClass} font-medium capitalize`}>
        {member.title ? `${member.title} ` : ""}
        {member.nameLatin}
      </span>
      {/* No dir="rtl" here: Thaana is right-to-left under the bidi algorithm
          already, and setting dir on the block would right-align it away from
          the Latin name above it. */}
      <span lang="dv" className={`block ${secondaryClass} text-ink-muted`}>
        {member.name}
      </span>
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
