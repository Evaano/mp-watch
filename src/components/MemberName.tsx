interface NameLike {
  name: string;
  title: string | null;
  constituency: string;
}

/**
 * The member's name with its honorific. Both come from the source: the Majlis
 * roster prints the official Latin spelling, and the premium disclosure is
 * transliterated by the ingest, so capitalisation is normalised here rather
 * than in the data.
 */
export function MemberName({
  member,
  size = "base",
}: {
  member: NameLike;
  size?: "base" | "lg";
}) {
  const primaryClass = size === "lg" ? "text-2xl sm:text-3xl" : "text-base";

  return (
    <span className={`block ${primaryClass} font-medium capitalize`}>
      {member.title ? `${member.title} ` : ""}
      {member.name}
    </span>
  );
}

export function ConstituencyName({
  member,
  className = "",
}: {
  member: NameLike;
  className?: string;
}) {
  return (
    <span className={`capitalize ${className}`}>
      {member.constituency.replace(/ dhaairaa$/i, "")}
    </span>
  );
}
