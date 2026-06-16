"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/format";
import type { Occupation } from "@/lib/types";

/** Wage percentile distribution (10th → 90th) for one occupation. */
export function WageDistribution({ occ }: { occ: Occupation }) {
  const data = [
    { label: "10th", value: occ.wage_p10 },
    { label: "25th", value: occ.wage_p25 },
    { label: "Median", value: occ.median_wage },
    { label: "75th", value: occ.wage_p75 },
    { label: "90th", value: occ.wage_p90 },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={48}
        />
        <Tooltip
          formatter={(v: number) => [formatCurrency(v), "Annual wage"]}
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.label === "Median" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
