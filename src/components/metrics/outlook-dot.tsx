import { outlook } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** Small colored dot + optional label encoding the growth outlook. */
export function OutlookDot({
  growthRate,
  showLabel = false,
  className,
}: {
  growthRate: number;
  showLabel?: boolean;
  className?: string;
}) {
  const o = outlook(growthRate);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`${o.label}: ${o.description}`}>
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: o.color }}
        aria-hidden
      />
      {showLabel && <span className="text-xs text-muted-foreground">{o.label}</span>}
    </span>
  );
}
