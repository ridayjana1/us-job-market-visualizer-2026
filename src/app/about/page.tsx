import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Attribution, INDEPENDENCE_DISCLAIMER } from "@/components/attribution";

export const metadata: Metadata = {
  title: "About",
  description: "About the US Job Market Visualizer 2026, its goals, and its data.",
};

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">About this project</h1>
      <p className="mt-3 text-muted-foreground">
        US Job Market Visualizer 2026 is an open-source, interactive workspace
        for exploring the US labor market - employment, wages, growth,
        education, and AI exposure - inspired by Andrej Karpathy&apos;s Jobs
        project and updated with the latest available data.
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">How AI exposure is framed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We model AI exposure as the overlap between an occupation&apos;s
              tasks and what current AI systems can do, then split it into
              <span className="font-medium text-foreground"> augmentation</span>{" "}
              and <span className="font-medium text-foreground">automation</span>{" "}
              potential, following the Anthropic Economic Index framing.
            </p>
            <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-foreground">
              Exposure is a measure of task overlap - <strong>not</strong> a
              prediction of job loss. High exposure frequently coincides with
              high wages and strong growth, where augmentation tends to lead.
            </p>
            <p>
              See <Link href="/data-sources" className="underline hover:text-foreground">Data Sources &amp; Methodology</Link>{" "}
              for the full pipeline and update cadence.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Data &amp; attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Occupation data draws on the Bureau of Labor Statistics (BLS)
              Occupational Employment &amp; Wage Statistics and Employment
              Projections, and on O*NET for skills, knowledge, and work
              activities.
            </p>
            <Attribution variant="full" />
            <p className="text-xs">{INDEPENDENCE_DISCLAIMER}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Open source</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              The full ETL pipeline, data model, API, and UI are MIT-licensed.
              Contributions, corrections, and new data sources are welcome.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
