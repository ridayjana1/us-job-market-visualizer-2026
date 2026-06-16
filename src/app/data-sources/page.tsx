import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Attribution, INDEPENDENCE_DISCLAIMER } from "@/components/attribution";
import { getMeta } from "@/lib/data";

export const metadata: Metadata = {
  title: "Data Sources & Methodology",
  description: "Sources, methodology, and update dates for the US Job Market Visualizer 2026.",
};

export default function DataSourcesPage() {
  const meta = getMeta();

  const sources = [
    {
      name: "Bureau of Labor Statistics - OEWS",
      url: "https://www.bls.gov/oes/",
      desc: "Occupational Employment & Wage Statistics: employment counts and wage percentiles by detailed SOC code.",
      fields: ["Employment", "Median & mean wage", "Wage percentiles"],
    },
    {
      name: "Bureau of Labor Statistics - Employment Projections",
      url: "https://www.bls.gov/emp/",
      desc: "Ten-year employment projections, annual openings, and typical entry-level education by occupation.",
      fields: ["Growth rate", "Annual openings", "Typical education"],
    },
    {
      name: "O*NET Web Services",
      url: "https://services.onetcenter.org/",
      desc: "Skills, knowledge areas, work activities, and abilities by O*NET-SOC occupation.",
      fields: ["Skills", "Knowledge", "Work activities"],
    },
    {
      name: "AI Exposure (Anthropic Economic Index methodology)",
      url: "https://www.anthropic.com/economic-index",
      desc: "Framing for decomposing task overlap into augmentation vs. automation potential. Exposure here is derived from O*NET task composition.",
      fields: ["Exposure score", "Augmentation", "Automation"],
    },
    {
      name: "Standard Occupational Classification (SOC 2018)",
      url: "https://www.bls.gov/soc/",
      desc: "The classification system used to key and join every source in the pipeline.",
      fields: ["SOC codes", "Major groups"],
    },
  ];

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Data Sources &amp; Methodology</h1>
      <p className="mt-3 text-muted-foreground">
        Every figure in this app is derived from public labor-market data,
        normalised on the SOC 2018 classification. The pipeline is reproducible -
        see the <code className="rounded bg-muted px-1 py-0.5 text-xs">scripts/</code> directory in the repository.
      </p>

      {/* Update metadata */}
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Badge variant="secondary">Generated: {meta.generated_on}</Badge>
        <Badge variant="secondary">Reference year: {meta.reference_year}</Badge>
        <Badge variant="secondary">Dataset: {meta.dataset_kind}</Badge>
      </div>

      {/* Sources */}
      <div className="mt-8 space-y-4">
        {sources.map((s) => (
          <Card key={s.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {s.name} ↗
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.fields.map((f) => (
                  <Badge key={f} variant="outline">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Methodology */}
      <Card className="mt-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">AI exposure methodology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Exposure is modelled from four task-composition axes derived from
            O*NET work-activity importance - information work, routineness,
            manual/physical content, and interpersonal content. Exposure rises
            with information and routine content and falls with physical content.
          </p>
          <p>
            Following the <a href="https://www.anthropic.com/economic-index" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Anthropic Economic Index</a>,
            exposure is split into augmentation (human-in-the-loop assistance)
            and automation potential. Non-routine, judgement- and people-heavy
            work skews to augmentation.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-foreground">
            {meta.disclaimer}
          </p>
        </CardContent>
      </Card>

      {/* Attribution - required wherever O*NET data is shown */}
      <Card className="mt-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Attribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Attribution variant="full" />
          <p className="text-xs text-muted-foreground">{INDEPENDENCE_DISCLAIMER}</p>
        </CardContent>
      </Card>
    </div>
  );
}
