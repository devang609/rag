import { NextResponse } from "next/server";

import { getGraphNeighborhood, getGraphNode } from "@/lib/graph/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nodeId = url.searchParams.get("nodeId");
  const depth = Number(url.searchParams.get("depth") ?? "1");

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required." }, { status: 400 });
  }

  const [node, neighborhood] = await Promise.all([
    getGraphNode(nodeId),
    getGraphNeighborhood(nodeId, Number.isFinite(depth) ? Math.min(Math.max(depth, 1), 2) : 1),
  ]);

  return NextResponse.json({
    node,
    ...neighborhood,
  });
}
