"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { aiImpact } from "@/lib/metrics";
import type { Occupation } from "@/lib/types";

/** "AI Impact: High/Medium/Low" pill with a plain-language tooltip. */
export function ImpactBadge({
  occ,
  showLabel = true,
}: {
  occ: Occupation;
  showLabel?: boolean;
}) {
  const impact = aiImpact(occ);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Badge variant={impact.variant} className="cursor-help gap-1">
            {showLabel ? "AI Impact: " : ""}
            {impact.level}
            <Info className="h-3 w-3 opacity-60" />
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{impact.tooltip}</TooltipContent>
    </Tooltip>
  );
}
