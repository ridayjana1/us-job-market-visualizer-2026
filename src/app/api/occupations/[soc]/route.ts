import { NextResponse } from "next/server";

import { getOccupationBySoc, getOccupations } from "@/lib/data";

/** GET /api/occupations/:soc - single occupation with a few related peers. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ soc: string }> },
) {
  const { soc } = await params;
  const occ = getOccupationBySoc(soc);
  if (!occ) {
    return NextResponse.json(
      { error: `No occupation found for SOC ${soc}` },
      { status: 404 },
    );
  }

  // Related = same major group, nearest by employment, excluding self.
  const related = getOccupations()
    .filter((o) => o.major_group === occ.major_group && o.soc_code !== occ.soc_code)
    .sort(
      (a, b) =>
        Math.abs(a.employment - occ.employment) -
        Math.abs(b.employment - occ.employment),
    )
    .slice(0, 4);

  return NextResponse.json({ occupation: occ, related });
}
