/** Canonical data model shared by the data layer, API routes, and UI. */

export type ExposureBand = "low" | "moderate" | "high";

export interface Occupation {
  soc_code: string;
  title: string;
  major_group: string;
  major_group_title: string;
  description: string;
  employment: number;
  median_wage: number;
  mean_wage: number;
  education: string;
  education_rank: number;
  growth_rate: number;
  skills: string[];
  knowledge: string[];
  wage_p10: number;
  wage_p25: number;
  wage_p75: number;
  wage_p90: number;
  projected_employment: number;
  annual_openings: number;
  ai_exposure_score: number;
  ai_automation_score: number;
  ai_augmentation_score: number;
  exposure_band: ExposureBand;
  ai_summary: string;
}

export interface StateTopOccupation {
  soc_code: string;
  title: string;
  employment: number;
  median_wage: number;
  ai_exposure_score: number;
}

export interface StateRecord {
  fips: string;
  abbr: string;
  name: string;
  total_employment: number;
  median_wage: number;
  avg_growth: number;
  avg_ai_exposure: number;
  top_occupations: StateTopOccupation[];
}

export interface DataSource {
  name: string;
  url: string;
  fields: string[];
}

export interface DatasetMeta {
  generated_on: string;
  reference_year: number;
  dataset_kind: string;
  sources: DataSource[];
  stats: Record<string, number>;
  disclaimer: string;
}

/** Filter state shared between the Explorer UI and the API query layer. */
export interface OccupationFilters {
  q?: string;
  majorGroup?: string;
  education?: string;
  exposureBand?: ExposureBand;
  minWage?: number;
  maxWage?: number;
  minEmployment?: number;
  minGrowth?: number;
  sort?: keyof Occupation;
  order?: "asc" | "desc";
}
