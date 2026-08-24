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
 * A row of figures: 2x2 on a phone, one row from lg up. Divided by lines rather
 * than wrapped in separate cards, so they read as one block.
 *
 * The class strings are written out in full per column count rather than
 * interpolated: Tailwind reads the source for class names, so a computed
 * `lg:grid-cols-${n}` produces no CSS at all.
 */
export function StatRow({
  children,
  cols = 4,
}: {
  children: ReactNode;
  cols?: 2 | 4;
}) {
  const shell =
    "grid divide-x divide-line overflow-hidden rounded-card border border-line bg-surface-raised";
  return (
    <dl
      className={
        cols === 2
          ? `${shell} grid-cols-2`
          : `${shell} grid-cols-2 divide-y lg:grid-cols-4 lg:divide-y-0`
      }
    >
      {children}
    </dl>
  );
}
