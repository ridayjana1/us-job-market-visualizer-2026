import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { ScatterPlot } from "@/components/charts/scatter-plot";
import { ColorLegend } from "@/components/color-legend";
import { getOccupations } from "@/lib/data";

export const metadata: Metadata = {
  title: "AI Impact vs. Pay",
  description: "AI impact compared with median pay, sized by number of jobs and colored by job growth.",
};

export default function ScatterPage() {
  const occupations = getOccupations();

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Impact vs. Median Pay</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Each bubble is an occupation. Position shows AI impact (left to right)
          against median pay (bottom to top). Bubble size is the number of jobs,
          and color shows the job-growth outlook. Click a bubble for full detail.
        </p>
      </header>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <ScatterPlot data={occupations} />

          {/* Legend */}
          <div className="mt-6 space-y-3 border-t pt-4">
            <ColorLegend />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Bubble size:</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> fewer jobs</span>
              <span className="flex items-center gap-1"><span className="h-4 w-4 rounded-full bg-muted-foreground" /> more jobs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        High AI impact often goes together with high pay and strong growth (for
        example, software and data roles), where AI tends to assist workers
        rather than replace them. AI impact describes how much the work may
        change. It is not a prediction of job loss.
      </p>
    </div>
  );
}
