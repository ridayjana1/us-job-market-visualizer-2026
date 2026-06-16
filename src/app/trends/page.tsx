import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendBar, type ValueFormat } from "@/components/charts/trend-bar";
import { ColorLegend } from "@/components/color-legend";
import { getTrends } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trend Dashboard",
  description: "Fastest-growing, highest-paying, and most/least AI-exposed US occupations.",
};

export default function TrendsPage() {
  const t = getTrends(12);

  const panels: {
    value: string;
    label: string;
    data: typeof t.fastestGrowing;
    metric: "growth_rate" | "median_wage" | "ai_exposure_score" | "employment" | "annual_openings";
    fmt: ValueFormat;
    color: string;
  }[] = [
    { value: "growth", label: "Fastest growing", data: t.fastestGrowing, metric: "growth_rate", fmt: "percent", color: "#22c55e" },
    { value: "pay", label: "Highest paying", data: t.highestPaying, metric: "median_wage", fmt: "currency", color: "hsl(var(--primary))" },
    { value: "exposed", label: "Highest AI Impact", data: t.mostExposed, metric: "ai_exposure_score", fmt: "score", color: "#e11d48" },
    { value: "least", label: "Lowest AI Impact", data: t.leastExposed, metric: "ai_exposure_score", fmt: "score", color: "#10b981" },
    { value: "largest", label: "Largest", data: t.largest, metric: "employment", fmt: "compact", color: "#2563eb" },
    { value: "openings", label: "Most openings", data: t.mostOpenings, metric: "annual_openings", fmt: "compact", color: "#7c3aed" },
  ];

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Trend Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Leaderboards across job growth, pay, AI impact, size, and openings.
          Click any bar to open the occupation.
        </p>
        <ColorLegend className="mt-4" />
      </header>

      <Tabs defaultValue="growth">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {panels.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
          ))}
        </TabsList>

        {panels.map((p) => (
          <TabsContent key={p.value} value={p.value}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendBar data={p.data} metric={p.metric} valueFormat={p.fmt} color={p.color} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
