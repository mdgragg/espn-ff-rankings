// app/api/league/route.ts
//
// GET /api/league
// Server-side route — safe place to use ESPN cookies since this code
// never ships to the browser.

import { NextResponse } from "next/server";
import { fetchEspnLeague } from "@/lib/espn";

export async function GET() {
  try {
    const league = await fetchEspnLeague();
    return NextResponse.json(league);
  } catch (err: any) {
    console.error("Failed to fetch ESPN league:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch ESPN league" },
      { status: 500 }
    );
  }
}
