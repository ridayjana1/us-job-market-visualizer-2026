import { NextResponse } from "next/server";

import { getStateByAbbr, getStates } from "@/lib/data";

/**
 * GET /api/states            - all state aggregates
 * GET /api/states?abbr=CA    - a single state
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const abbr = searchParams.get("abbr");
  if (abbr) {
    const state = getStateByAbbr(abbr);
    if (!state) {
      return NextResponse.json(
        { error: `No state found for ${abbr}` },
        { status: 404 },
      );
    }
    return NextResponse.json(state);
  }
  return NextResponse.json({ states: getStates() });
}
