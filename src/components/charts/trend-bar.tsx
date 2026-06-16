"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCompact,
  formatCurrency,
  formatPercent,
  formatScore,
} from "@/lib/format";
import type { Occupation } from "@/lib/types";

export type ValueFormat = "percent" | "currency" | "compact" | "score";

const FORMATTERS: Record<ValueFormat, (v: number) => string> = {
  percent: formatPercent,
  currency: formatCurrency,
  compact: formatCompact,
  score: formatScore,
};

/**
 * Horizontal leaderboard bar chart used across the Trends dashboard.
 * Takes a `valueFormat` string (not a function) so it can be rendered from a
 * Server Component without passing non-serializable props.
 */
export function TrendBar({
  data,
  metric,
  valueFormat,
  color = "#0f172a",
}: {
  data: Occupation[];
  metric: keyof Occupation;
  valueFormat: ValueFormat;
  color?: string;
}) {
  const router = useRouter();
  const format = FORMATTERS[valueFormat];
  const barColor = color ?? "hsl(var(--primary))";
  const rows = data.map((d) => ({
    soc: d.soc_code,
    name: d.title.length > 28 ? d.title.slice(0, 27) + "…" : d.title,
    value: d[metric] as number,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={180}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <Tooltip
          formatter={(v: number) => [format(v), ""]}
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={20}
          className="cursor-pointer"
          onClick={(d: { soc?: string }) => d?.soc && router.push(`/occupation/${d.soc}`)}
        >
          {rows.map((r) => (
            <Cell key={r.soc} fill={barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
