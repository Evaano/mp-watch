import type { ReactNode } from "react";

/**
 * A headline figure with its label. No card chrome: the tiles are separated by
 * the grid's own dividing lines, which keeps four of them from reading as four
 * competing boxes.
 */
export function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <dt className="label-eyebrow text-ink-muted">
        {label}
      </dt>
      {/* Figures wrap rather than overflow on a narrow tile. */}
      <dd className="mt-1.5 text-xl font-semibold break-words sm:mt-2 sm:text-3xl">
        {value}
      </dd>
      {note ? (
        <p className="label-note mt-1 text-ink-muted">{note}</p>
      ) : null}
    </div>
  );
}

/**
 * Four figures: 2x2 on a phone, one row from lg up. Divided by lines rather
 * than wrapped in four separate cards, so they read as one block.
 */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-raised lg:grid-cols-4 lg:divide-y-0">
      {children}
    </dl>
  );
}
