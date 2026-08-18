import type { Dict, Lang } from "@/lib/i18n";
import type { Position } from "@/lib/schema";

/**
 * Public positions on a time axis. Right now every entry comes from the
 * premium disclosure, which records payments rather than terms of service, so
 * each one is labelled as inferred and says why. As dated claims are added
 * (pledges, allegations, appointments) they join this same list.
 */
export function PositionList({
  positions,
  lang,
  dict,
}: {
  positions: Position[];
  lang: Lang;
  dict: Dict;
}) {
  if (!positions.length) return null;

  return (
    <ol className="flex flex-col border-s border-line ps-4">
      {positions.map((position) => (
        <li key={position.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden
            className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-accent"
          />
          <p className="font-medium">
            {position.kind === "speaker"
              ? dict.speakerLabel
              : lang === "dv"
                ? position.constituency
                : capitalise(
                    (position.constituencyLatin ?? "")
                      .replace(/ dhaaira?$/i, "")
                      .trim(),
                  )}
          </p>
          {position.party ? (
            <span className="mt-1 inline-block rounded-card bg-surface-sunken px-1.5 py-0.5 label-eyebrow text-ink-muted">
              {position.party}
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
