import { Badge } from "@/components/ui/badge";
import { exposureLabel } from "@/lib/format";
import type { ExposureBand } from "@/lib/types";

/** Consistent low/moderate/high exposure pill used across the app. */
export function ExposureBadge({
  band,
  score,
}: {
  band: ExposureBand;
  score?: number;
}) {
  return (
    <Badge variant={band}>
      {exposureLabel[band]}
      {score != null && <span className="ml-1 opacity-70">· {score.toFixed(2)}</span>}
    </Badge>
  );
}
