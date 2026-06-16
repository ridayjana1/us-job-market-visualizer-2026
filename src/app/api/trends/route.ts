import { NextResponse } from "next/server";

import { getTrends } from "@/lib/data";

/** GET /api/trends?limit=10 - leaderboard slices for the trend dashboard. */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);
  return NextResponse.json(getTrends(limit));
}
