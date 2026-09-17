import { party } from "@/lib/parties";

/**
 * A party, as a coloured dot and its code.
 *
 * The dot is the affordance, not the code: a reader scanning a column of
 * seats sees the pattern before they read a single abbreviation. The code
 * stays because it is what the roster prints, and the title carries the full
 * name for anyone who does not know it — MDP and DEM are opaque outside
 * Maldivian politics.
 *
 * Colour is never the only carrier of meaning here. Every place this appears,
 * the code is beside it.
 */
export function PartyMark({
  code,
  className = "",
}: {
  code: string | null | undefined;
  className?: string;
}) {
  if (!code) return null;
  const known = party(code);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}
      title={known ? known.name : undefined}
    >
      <span aria-hidden className="party-dot" data-party={code} />
      {code}
    </span>
  );
}
