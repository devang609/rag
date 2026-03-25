import { NextResponse } from "next/server";

import { searchGraph } from "@/lib/graph/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "8");

  const results = await searchGraph(query, Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 8);
  return NextResponse.json({ results });
}
