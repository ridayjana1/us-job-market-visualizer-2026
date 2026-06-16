import { NextResponse } from "next/server";

import { filterOccupations } from "@/lib/data";
import type { ExposureBand, Occupation, OccupationFilters } from "@/lib/types";

/**
 * GET /api/occupations
 *
 * Query params (all optional):
 *   q, majorGroup, education, exposureBand,
 *   minWage, maxWage, minEmployment, minGrowth,
 *   sort, order, limit, offset
 *
 * Returns a filtered, sorted, paginated list with a total count. Responses
 * are cacheable (see next.config headers) because they derive from a static
 * dataset.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const num = (k: string) =>
    searchParams.has(k) ? Number(searchParams.get(k)) : undefined;

  const filters: OccupationFilters = {
    q: searchParams.get("q") ?? undefined,
    majorGroup: searchParams.get("majorGroup") ?? undefined,
    education: searchParams.get("education") ?? undefined,
    exposureBand: (searchParams.get("exposureBand") as ExposureBand) ?? undefined,
    minWage: num("minWage"),
    maxWage: num("maxWage"),
    minEmployment: num("minEmployment"),
    minGrowth: num("minGrowth"),
    sort: (searchParams.get("sort") as keyof Occupation) ?? undefined,
    order: (searchParams.get("order") as "asc" | "desc") ?? undefined,
  };

  const all = filterOccupations(filters);
  const limit = Math.min(num("limit") ?? 50, 500);
  const offset = num("offset") ?? 0;
  const page = all.slice(offset, offset + limit);

  return NextResponse.json({
    total: all.length,
    limit,
    offset,
    results: page,
  });
}
