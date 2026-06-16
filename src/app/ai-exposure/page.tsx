import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemandBadge } from "@/components/metrics/demand-badge";
import { getOccupations } from "@/lib/data";
import { aiImpact } from "@/lib/metrics";
import { formatCompact, formatCurrency } from "@/lib/format";
import type { ExposureBand, Occupation } from "@/lib/types";

export const metadata: Metadata = {
  title: "AI Impact",
  description: "US occupations grouped by AI impact, showing where AI assists workers and where it may automate tasks. AI impact is not a job-loss forecast.",
};

const BANDS: {
  band: ExposureBand;
  title: string;
  blurb: string;
  variant: "low" | "moderate" | "high";
}[] = [
  {
    band: "high",
    title: "High AI Impact",
    blurb: "AI is likely to significantly change how work is performed, often by assisting workers in knowledge-heavy tasks.",
    variant: "high",
  },
  {
    band: "moderate",
    title: "Medium AI Impact",
    blurb: "AI may automate or assist some tasks, mixed with hands-on or in-person work.",
    variant: "moderate",
  },
  {
    band: "low",
    title: "Low AI Impact",
    blurb: "Current AI systems are less likely to affect most daily tasks, which are mostly physical, in-person, or judgment-heavy.",
    variant: "low",
  },
];

export default function AiImpactPage() {
  const occ = getOccupations();
  const byBand = (b: ExposureBand) =>
    occ.filter((o) => o.exposure_band === b).sort((a, c) => c.ai_exposure_score - a.ai_exposure_score);

  return (
    <div className="container py-8">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">AI Impact</h1>
        <p className="mt-2 text-muted-foreground">
          Occupations grouped by how much of their day-to-day work overlaps with
          what AI can do today. For each role we also show where AI is more
          likely to <span className="font-medium text-foreground">assist</span>{" "}
          workers versus <span className="font-medium text-foreground">automate</span>{" "}
          some tasks.
        </p>
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm">
          <strong>Important:</strong> AI impact describes how the work may
          change. It is not a prediction of job loss. Many high-impact fields
          also have high pay and strong demand, where AI mostly assists workers.
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {BANDS.map(({ band, title, blurb, variant }) => {
          const items = byBand(band);
          return (
            <Card key={band} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <Badge variant={variant}>{items.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{blurb}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {items.map((o) => (
                  <ImpactRow key={o.soc_code} o={o} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ImpactRow({ o }: { o: Occupation }) {
  const assistPct = (o.ai_augmentation_score / o.ai_exposure_score) * 100;
  const impact = aiImpact(o);
  return (
    <Link
      href={`/occupation/${o.soc_code}`}
      className="block rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{o.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          AI Impact: {impact.level}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{formatCompact(o.employment)} jobs</span>
        <span>·</span>
        <span>{formatCurrency(o.median_wage)}</span>
        <DemandBadge occ={o} />
      </div>
      {/* assist vs automate split bar */}
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted" title="Where AI is more likely to assist workers versus automate some tasks">
        <div className="bg-blue-500" style={{ width: `${assistPct}%` }} />
        <div className="bg-amber-500" style={{ width: `${100 - assistPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>AI assists {o.ai_augmentation_score.toFixed(2)}</span>
        <span>AI automates {o.ai_automation_score.toFixed(2)}</span>
      </div>
    </Link>
  );
}
