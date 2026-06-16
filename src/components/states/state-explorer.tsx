"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { USMap, type MapMetric } from "@/components/charts/us-map";
import { ExposureBadge } from "@/components/exposure-badge";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import type { ExposureBand, StateRecord } from "@/lib/types";

const METRICS: { key: MapMetric; label: string }[] = [
  { key: "avg_ai_exposure", label: "AI exposure" },
  { key: "median_wage", label: "Median wage" },
  { key: "avg_growth", label: "Growth" },
  { key: "total_employment", label: "Employment" },
];

function band(score: number): ExposureBand {
  if (score < 0.34) return "low";
  if (score < 0.67) return "moderate";
  return "high";
}

export function StateExplorer({ states }: { states: StateRecord[] }) {
  const [metric, setMetric] = useState<MapMetric>("avg_ai_exposure");
  const [selected, setSelected] = useState<string>("CA");

  const state = useMemo(
    () => states.find((s) => s.abbr === selected) ?? states[0],
    [states, selected],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Colour states by</CardTitle>
          <div className="flex flex-wrap gap-1">
            {METRICS.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={metric === m.key ? "default" : "outline"}
                onClick={() => setMetric(m.key)}
                className="h-7 text-xs"
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <USMap states={states} metric={metric} selected={selected} onSelect={setSelected} />
        </CardContent>
      </Card>

      {/* Detail panel */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader className="pb-3">
          <CardTitle>{state.name}</CardTitle>
          <p className="text-sm text-muted-foreground">State labor snapshot</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Employment" value={formatCompact(state.total_employment)} />
            <Metric label="Median wage" value={formatCurrency(state.median_wage)} />
            <Metric label="Avg growth" value={formatPercent(state.avg_growth)} />
            <Metric label="Avg exposure" value={state.avg_ai_exposure.toFixed(2)} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Top occupations</h3>
            <ul className="space-y-1.5">
              {state.top_occupations.map((o) => (
                <li key={o.soc_code}>
                  <Link
                    href={`/occupation/${o.soc_code}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCompact(o.employment)} · {formatCurrency(o.median_wage)}
                      </span>
                    </span>
                    <ExposureBadge band={band(o.ai_exposure_score)} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
