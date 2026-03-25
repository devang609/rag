import {
  type GraphNeighborhoodResponse,
  type GraphNodeRecord,
  type GraphNodeType,
  type GraphSearchResult,
} from "@/lib/contracts";
import { env } from "@/lib/env";
import { loadNormalizedDataset } from "@/lib/o2c/dataset";

import { getPool } from "@/db/client";

export async function searchGraph(query: string, limit = 8): Promise<GraphSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  if (env.DATABASE_URL) {
    const pool = getPool();
    const result = await pool.query<{
      nodeId: string;
      nodeType: GraphNodeType;
      entityId: string;
      label: string;
      subtitle: string;
      score: number;
    }>(
      `
      select
        node_id as "nodeId",
        node_type as "nodeType",
        entity_id as "entityId",
        label,
        subtitle,
        case
          when entity_id = $1 then 500
          when label ilike $2 then 300
          when search_text like $3 then 200
          else 100
        end as score
      from v_entity_lookup
      where search_text like $3
      order by score desc, label asc
      limit $4
      `,
      [trimmed, `${trimmed}%`, `%${trimmed}%`, limit],
    );

    return result.rows;
  }

  const dataset = await loadNormalizedDataset();
  return dataset.entityLookup
    .filter((row) => row.searchText.includes(trimmed))
    .map((row) => ({
      nodeId: row.nodeId,
      nodeType: row.nodeType,
      entityId: row.entityId,
      label: row.label,
      subtitle: row.subtitle,
      score: scoreLookupRow(trimmed, row),
    }))
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export async function getGraphNeighborhood(nodeId: string, depth = 1): Promise<GraphNeighborhoodResponse> {
  if (depth < 1) {
    return { nodes: [], edges: [] };
  }

  if (env.DATABASE_URL) {
    return getDatabaseNeighborhood(nodeId, depth);
  }

  const dataset = await loadNormalizedDataset();
  return getMemoryNeighborhood(dataset.graphNodes, dataset.graphEdges, nodeId, depth);
}

export async function getGraphNode(nodeId: string): Promise<GraphNodeRecord | null> {
  if (env.DATABASE_URL) {
    const pool = getPool();
    const result = await pool.query<GraphNodeRecord>(
      `
      select
        node_id as "nodeId",
        node_type as "nodeType",
        entity_id as "entityId",
        label,
        subtitle,
        metadata
      from graph_nodes
      where node_id = $1
      limit 1
      `,
      [nodeId],
    );

    return result.rows[0] ?? null;
  }

  const dataset = await loadNormalizedDataset();
  return dataset.graphNodes.find((node) => node.nodeId === nodeId) ?? null;
}

async function getDatabaseNeighborhood(nodeId: string, depth: number): Promise<GraphNeighborhoodResponse> {
  const pool = getPool();
  const visitedNodes = new Set<string>([nodeId]);
  const visitedEdges = new Set<string>();
  let frontier = [nodeId];

  for (let iteration = 0; iteration < depth; iteration += 1) {
    const edgeResult = await pool.query<{
      edgeId: string;
      sourceNodeId: string;
      targetNodeId: string;
      relation: string;
      metadata: Record<string, unknown>;
    }>(
      `
      select
        edge_id as "edgeId",
        source_node_id as "sourceNodeId",
        target_node_id as "targetNodeId",
        relation,
        metadata
      from graph_edges
      where source_node_id = any($1::text[]) or target_node_id = any($1::text[])
      `,
      [frontier],
    );

    frontier = [];

    for (const edge of edgeResult.rows) {
      visitedEdges.add(edge.edgeId);
      if (!visitedNodes.has(edge.sourceNodeId)) {
        visitedNodes.add(edge.sourceNodeId);
        frontier.push(edge.sourceNodeId);
      }
      if (!visitedNodes.has(edge.targetNodeId)) {
        visitedNodes.add(edge.targetNodeId);
        frontier.push(edge.targetNodeId);
      }
    }
  }

  const nodeResult = await pool.query<GraphNodeRecord>(
    `
    select
      node_id as "nodeId",
      node_type as "nodeType",
      entity_id as "entityId",
      label,
      subtitle,
      metadata
    from graph_nodes
    where node_id = any($1::text[])
    `,
    [[...visitedNodes]],
  );

  const edgeResult = await pool.query<{
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relation: string;
    metadata: Record<string, unknown>;
  }>(
    `
    select
      edge_id as "edgeId",
      source_node_id as "sourceNodeId",
      target_node_id as "targetNodeId",
      relation,
      metadata
    from graph_edges
    where edge_id = any($1::text[])
    `,
    [[...visitedEdges]],
  );

  return {
    nodes: nodeResult.rows.sort((left, right) => left.label.localeCompare(right.label)),
    edges: edgeResult.rows,
  };
}

function getMemoryNeighborhood(
  nodes: GraphNodeRecord[],
  edges: GraphNeighborhoodResponse["edges"],
  nodeId: string,
  depth: number,
): GraphNeighborhoodResponse {
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]));
  const edgeMap = new Map<string, GraphNeighborhoodResponse["edges"][number]>();
  const visitedNodes = new Set<string>([nodeId]);
  let frontier = [nodeId];

  for (let iteration = 0; iteration < depth; iteration += 1) {
    const nextFrontier = new Set<string>();
    for (const edge of edges) {
      if (frontier.includes(edge.sourceNodeId) || frontier.includes(edge.targetNodeId)) {
        edgeMap.set(edge.edgeId, edge);
        visitedNodes.add(edge.sourceNodeId);
        visitedNodes.add(edge.targetNodeId);
        nextFrontier.add(edge.sourceNodeId);
        nextFrontier.add(edge.targetNodeId);
      }
    }
    frontier = [...nextFrontier];
  }

  return {
    nodes: [...visitedNodes]
      .map((id) => nodeMap.get(id))
      .filter((node): node is GraphNodeRecord => Boolean(node))
      .sort((left, right) => left.label.localeCompare(right.label)),
    edges: [...edgeMap.values()],
  };
}

function scoreLookupRow(trimmed: string, row: { entityId: string; label: string; searchText: string }) {
  if (row.entityId.toLowerCase() === trimmed) {
    return 500;
  }
  if (row.label.toLowerCase().startsWith(trimmed)) {
    return 300;
  }
  if (row.searchText.startsWith(trimmed)) {
    return 200;
  }
  return 100;
}
