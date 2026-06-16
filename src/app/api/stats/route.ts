import { NextResponse } from "next/server";

import { getMeta, getSummaryStats } from "@/lib/data";

/** GET /api/stats - dashboard summary statistics + dataset metadata. */
export function GET() {
  return NextResponse.json({
    stats: getSummaryStats(),
    meta: getMeta(),
  });
}
