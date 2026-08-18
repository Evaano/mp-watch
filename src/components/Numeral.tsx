import { money, moneyCompact } from "@/lib/format";

/**
 * Figures anywhere in the app. Isolates the number from surrounding RTL text
 * so "MVR 92,235,000" never reorders inside a Dhivehi sentence.
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
