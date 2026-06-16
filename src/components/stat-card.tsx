import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-center gap-4 p-5">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
          {sublabel && (
            <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
