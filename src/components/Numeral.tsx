import { money, moneyCompact } from "@/lib/format";

/**
 * Figures anywhere in the app, set in tabular figures so a column of them
 * lines up digit for digit.
 */
export function Numeral({
  value,
  compact = false,
  currency = false,
  className = "",
}: {
  value: number;
  compact?: boolean;
  currency?: boolean;
  className?: string;
}) {
  const text = compact ? moneyCompact(value) : money(value);
  return (
    <span className={`numeral ${className}`}>
      {currency ? `MVR ${text}` : text}
    </span>
  );
}
