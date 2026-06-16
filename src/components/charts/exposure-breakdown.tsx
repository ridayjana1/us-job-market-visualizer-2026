"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { Occupation } from "@/lib/types";

/**
 * Exposure decomposition for one occupation: total exposure split into
 * augmentation vs. automation potential. Intentionally framed so the user
 * sees that exposure ≠ job loss.
 */
export function ExposureBreakdown({ occ }: { occ: Occupation }) {
  const data = [
    { label: "Exposure", value: occ.ai_exposure_score, fill: "#64748b" },
    { label: "Augmentation", value: occ.ai_augmentation_score, fill: "#3b82f6" },
    { label: "Automation", value: occ.ai_automation_score, fill: "#f59e0b" },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
      >
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={92}
          fontSize={12}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: number) => v.toFixed(2)}
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
