import "server-only";
import { cache } from "react";

import occupationsJson from "../../data/occupations.json";
import statesJson from "../../data/states.json";
import metaJson from "../../data/meta.json";
import type {
  DatasetMeta,
  Occupation,
  OccupationFilters,
  StateRecord,
} from "./types";

// JSON is imported (not fs-read) so the dataset is bundled into the server
// build and is available on Vercel Functions without filesystem assumptions.
const OCCUPATIONS = occupationsJson as unknown as Occupation[];
const STATES = statesJson as unknown as StateRecord[];
const META = metaJson as unknown as DatasetMeta;

/** All occupations. `cache()` dedupes within a single server request. */
export const getOccupations = cache((): Occupation[] => OCCUPATIONS);

export const getMeta = cache((): DatasetMeta => META);

export const getStates = cache((): StateRecord[] => STATES);

export const getOccupationBySoc = cache(
  (soc: string): Occupation | undefined =>
    OCCUPATIONS.find((o) => o.soc_code === soc),
);

export const getStateByAbbr = cache(
  (abbr: string): StateRecord | undefined =>
    STATES.find((s) => s.abbr.toLowerCase() === abbr.toLowerCase()),
);

/** Distinct major groups for filter dropdowns. */
export const getMajorGroups = cache((): { code: string; title: string }[] => {
  const map = new Map<string, string>();
  for (const o of OCCUPATIONS) map.set(o.major_group, o.major_group_title);
  return [...map.entries()]
    .map(([code, title]) => ({ code, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

export const getEducationLevels = cache((): string[] => {
  const seen = new Map<string, number>();
  for (const o of OCCUPATIONS) seen.set(o.education, o.education_rank);
  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([edu]) => edu);
});

/** Apply explorer filters + sorting. Pure and reused by the API route. */
export function filterOccupations(
  filters: OccupationFilters,
  source: Occupation[] = OCCUPATIONS,
): Occupation[] {
  const q = filters.q?.trim().toLowerCase();
  let rows = source.filter((o) => {
    if (q) {
      const hay = `${o.title} ${o.soc_code} ${o.major_group_title}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.majorGroup && o.major_group !== filters.majorGroup) return false;
    if (filters.education && o.education !== filters.education) return false;
    if (filters.exposureBand && o.exposure_band !== filters.exposureBand)
      return false;
    if (filters.minWage != null && o.median_wage < filters.minWage) return false;
    if (filters.maxWage != null && o.median_wage > filters.maxWage) return false;
    if (filters.minEmployment != null && o.employment < filters.minEmployment)
      return false;
    if (filters.minGrowth != null && o.growth_rate < filters.minGrowth)
      return false;
    return true;
  });

  const sort = filters.sort ?? "employment";
  const order = filters.order ?? "desc";
  rows = [...rows].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return order === "asc" ? cmp : -cmp;
  });
  return rows;
}

/** Aggregate stats for the home dashboard. */
export const getSummaryStats = cache(() => {
  const occ = OCCUPATIONS;
  const totalEmployment = occ.reduce((s, o) => s + o.employment, 0);
  const weightedWage =
    occ.reduce((s, o) => s + o.median_wage * o.employment, 0) / totalEmployment;
  const bands = { low: 0, moderate: 0, high: 0 };
  for (const o of occ) bands[o.exposure_band] += o.employment;
  return {
    occupationCount: occ.length,
    totalEmployment,
    weightedMedianWage: Math.round(weightedWage),
    exposureEmployment: bands,
    fastestGrowing: [...occ].sort((a, b) => b.growth_rate - a.growth_rate)[0],
    highestPaid: [...occ].sort((a, b) => b.median_wage - a.median_wage)[0],
  };
});

/** Trend leaderboards for the dashboard. */
export const getTrends = cache((limit = 10) => {
  const occ = OCCUPATIONS;
  const by = (key: keyof Occupation, desc = true) =>
    [...occ]
      .sort((a, b) =>
        desc
          ? (b[key] as number) - (a[key] as number)
          : (a[key] as number) - (b[key] as number),
      )
      .slice(0, limit);
  return {
    fastestGrowing: by("growth_rate"),
    highestPaying: by("median_wage"),
    mostExposed: by("ai_exposure_score"),
    leastExposed: by("ai_exposure_score", false),
    largest: by("employment"),
    mostOpenings: by("annual_openings"),
  };
});
