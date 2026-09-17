import { PartyMark } from "./PartyMark";
import type { Dict } from "@/lib/i18n";
import type { Position } from "@/lib/schema";

/**
 * Public positions on a time axis. Right now every entry comes from the
 * premium disclosure, which records payments rather than terms of service, so
 * each one is labelled as inferred and says why. As dated claims are added
 * (pledges, allegations, appointments) they join this same list.
 */
export function PositionList({
  positions,
  dict,
}: {
  positions: Position[];
  dict: Dict;
}) {
  if (!positions.length) return null;

  return (
    <ol className="flex flex-col border-s border-line ps-4">
      {positions.map((position) => (
        <li key={position.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden
            // Not the accent: a party mark sits a line below this, and PNC's
            // turquoise and the accent teal are near neighbours. This is
            // decoration, so it gives up the hue rather than the party doing so.
            className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-line-strong"
          />
          <p className="font-medium">
            {position.kind === "speaker"
              ? dict.speakerLabel
              : position.constituency
                ? capitalise(
                    position.constituency.replace(/ dhaaira?$/i, "").trim(),
                  )
                : // An appointed post names an organisation where an elected
                  // seat names a constituency.
                  (position.organisation ?? "")}
          </p>
          {position.party ? (
            <span className="label-eyebrow mt-1 inline-flex rounded-card bg-surface-sunken px-1.5 py-0.5 text-ink-muted">
              <PartyMark code={position.party} />
            </span>
          ) : null}
          <p className="numeral mt-0.5 text-sm text-ink-muted">
            {position.start.slice(0, 4)} - {position.end?.slice(0, 4) ?? ""}
            {position.end === null ? ` ${dict.stillServing}` : ""}
          </p>
          {position.basis === "inferred" ? (
            <p className="label-note mt-1.5 max-w-[58ch] text-ink-muted">
              <span className="rounded-card bg-surface-sunken px-1.5 py-0.5">
                {dict.inferredLabel}
              </span>{" "}
              {position.basisNote}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function capitalise(text: string) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
