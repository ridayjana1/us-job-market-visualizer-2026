"use client";

import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { demandStrength, demandVariant } from "@/lib/metrics";
import type { Occupation } from "@/lib/types";

/** Compact demand pill with a plain-language tooltip. */
export function DemandBadge({
  occ,
  showLabel = false,
}: {
  occ: Occupation;
  showLabel?: boolean;
}) {
  const demand = demandStrength(occ);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-fit max-w-[8.5rem]" aria-label={`Demand: ${demand.level}`}>
          <Badge
            variant={demandVariant[demand.level]}
            className="h-7 w-fit max-w-full cursor-help gap-1 rounded-full px-2 py-0 text-[12px] leading-none"
          >
            <span className="truncate">{showLabel ? `Demand: ${demand.level}` : demand.level}</span>
            <Info className="h-3 w-3 shrink-0 opacity-55" aria-hidden="true" />
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{demand.tooltip}</TooltipContent>
    </Tooltip>
  );
}
