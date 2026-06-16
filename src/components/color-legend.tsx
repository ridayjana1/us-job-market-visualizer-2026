import { OUTLOOK_LEGEND } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/**
 * Shared legend explaining the growth colors. Visible on desktop and mobile
 * (wraps on small screens). Colors carry the same meaning in both themes.
 */
export function ColorLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs",
        className,
      )}
      aria-label="Color legend for job outlook"
    >
      <span className="font-medium text-muted-foreground">Job outlook:</span>
      {OUTLOOK_LEGEND.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="font-medium">{item.label}</span>
          <span className="hidden text-muted-foreground sm:inline">({item.hint})</span>
        </span>
      ))}
    </div>
  );
}
