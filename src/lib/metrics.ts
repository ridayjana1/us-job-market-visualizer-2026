/**
 * Plain-language metrics derived from the raw occupation data.
 *
 * The underlying dataset uses technical terms (AI exposure, exposure band).
 * This module translates those into audience-friendly concepts for students,
 * parents, and career changers:
 *
 *   AI Impact        – how much AI is likely to change the work (High/Medium/Low)
 *   Demand Strength  – how strongly employers need workers (Very High → Low)
 *   Outlook          – simple growth signal with a consistent color meaning
 *
 * None of these imply job loss. AI Impact describes how work may change, not
 * whether jobs disappear.
 */
import type { Occupation } from "./types";

// ── Semantic colors (identical meaning in light and dark themes) ─────────
// These hex values are intentionally fixed so green/yellow/orange/red keep
// the same meaning regardless of theme.
export const OUTLOOK_COLORS = {
  growing: "#22c55e", // green
  stable: "#eab308", // yellow
  slower: "#f97316", // orange
  declining: "#ef4444", // red
} as const;

export type OutlookKey = keyof typeof OUTLOOK_COLORS;

export interface Outlook {
  key: OutlookKey;
  label: string;
  color: string;
  description: string;
}

/** Map a projected growth rate to a four-bucket outlook with a fixed color. */
export function outlook(growthRate: number): Outlook {
  if (growthRate < 0)
    return { key: "declining", label: "Declining", color: OUTLOOK_COLORS.declining, description: "Employment is projected to shrink." };
  if (growthRate < 3)
    return { key: "slower", label: "Slower growth", color: OUTLOOK_COLORS.slower, description: "Growing, but more slowly than average." };
  if (growthRate < 7)
    return { key: "stable", label: "Stable", color: OUTLOOK_COLORS.stable, description: "Growing at about the national average." };
  return { key: "growing", label: "Growing", color: OUTLOOK_COLORS.growing, description: "Growing faster than the national average." };
}

/** Legend rows used by the shared color-legend component. */
export const OUTLOOK_LEGEND: { color: string; label: string; hint: string }[] = [
  { color: OUTLOOK_COLORS.growing, label: "Growing", hint: "Faster than average" },
  { color: OUTLOOK_COLORS.stable, label: "Stable", hint: "About average" },
  { color: OUTLOOK_COLORS.slower, label: "Slower growth", hint: "Below average" },
  { color: OUTLOOK_COLORS.declining, label: "Declining", hint: "Projected to shrink" },
];

// ── AI Impact (friendly framing of AI exposure) ──────────────────────────
export type ImpactLevel = "High" | "Medium" | "Low";

export interface AiImpact {
  level: ImpactLevel;
  tooltip: string;
  /** Reuse the existing exposure palette variants for badges. */
  variant: "low" | "moderate" | "high";
}

const IMPACT_TOOLTIP: Record<ImpactLevel, string> = {
  High: "AI is likely to significantly change how work is performed in this occupation.",
  Medium: "AI may automate or assist some tasks in this occupation.",
  Low: "Current AI systems are less likely to affect most daily tasks in this occupation.",
};

export function aiImpact(occ: Occupation): AiImpact {
  const level: ImpactLevel =
    occ.exposure_band === "high" ? "High" : occ.exposure_band === "moderate" ? "Medium" : "Low";
  const variant = occ.exposure_band;
  return { level, tooltip: IMPACT_TOOLTIP[level], variant };
}

// ── Demand Strength (how much employers need workers) ────────────────────
export type DemandLevel = "Very High" | "High" | "Moderate" | "Low";

export interface DemandStrength {
  level: DemandLevel;
  score: number; // 0–9 composite, exposed for sorting/debugging
  tooltip: string;
}

/**
 * Composite of employment size, growth rate, and annual openings. Each
 * contributes up to 3 points; the total maps to a four-step strength.
 * High demand alongside high AI impact is the key insight we want users to
 * see: "AI may change this field, but employers still need workers."
 */
export function demandStrength(occ: Occupation): DemandStrength {
  const empPts = occ.employment > 2_000_000 ? 3 : occ.employment > 1_000_000 ? 2 : occ.employment > 300_000 ? 1 : 0;
  const growthPts = occ.growth_rate >= 12 ? 3 : occ.growth_rate >= 5 ? 2 : occ.growth_rate >= 0 ? 1 : 0;
  const openPts = occ.annual_openings > 300_000 ? 3 : occ.annual_openings > 100_000 ? 2 : occ.annual_openings > 40_000 ? 1 : 0;
  const score = empPts + growthPts + openPts;

  const level: DemandLevel =
    score >= 7 ? "Very High" : score >= 5 ? "High" : score >= 3 ? "Moderate" : "Low";

  return {
    level,
    score,
    tooltip:
      "How strongly employers need workers in this field, based on the number " +
      "of jobs, projected growth, and yearly openings.",
  };
}

/** Badge color variant for a demand level. */
export const demandVariant: Record<DemandLevel, "default" | "secondary" | "outline"> = {
  "Very High": "default",
  High: "default",
  Moderate: "secondary",
  Low: "outline",
};

// ── Plain-English career explanation for the snapshot card ───────────────
export function careerExplanation(occ: Occupation): string {
  const out = outlook(occ.growth_rate);
  const impact = aiImpact(occ);
  const demand = demandStrength(occ);
  const NATIONAL_MEDIAN = 48_060; // approx US all-occupations median annual wage

  const growthPhrase =
    out.key === "growing"
      ? "is growing faster than average"
      : out.key === "stable"
        ? "is growing at about the national average"
        : out.key === "slower"
          ? "is growing slowly"
          : "is projected to decline";

  const payPhrase =
    occ.median_wage >= NATIONAL_MEDIAN * 1.25
      ? "pays well above the national median wage"
      : occ.median_wage >= NATIONAL_MEDIAN * 0.9
        ? "pays around the national median wage"
        : "pays below the national median wage";

  const aiPhrase =
    impact.level === "High"
      ? "AI is expected to meaningfully change day-to-day tasks in this field, often by assisting workers rather than replacing them"
      : impact.level === "Medium"
        ? "AI is expected to assist with some tasks in this field"
        : "AI is expected to have a limited effect on daily tasks in this field";

  const demandPhrase =
    demand.level === "Very High" || demand.level === "High"
      ? "labor market data still shows strong employer demand"
      : demand.level === "Moderate"
        ? "labor market data shows steady employer demand"
        : "employer demand is more limited";

  return `This career ${growthPhrase} and ${payPhrase}. ${aiPhrase}, and current ${demandPhrase}.`;
}
