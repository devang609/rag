"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { FEATURED_NODE_ID, SAMPLE_QUESTIONS } from "@/lib/constants";
import {
  type GraphEdgeRecord,
  type GraphNodeRecord,
  type GraphSearchResult,
  type QueryResponseBody,
} from "@/lib/contracts";

import { GraphCanvas } from "./GraphCanvas";
import { ResultTable } from "./ResultTable";

interface NeighborhoodPayload {
  node: GraphNodeRecord | null;
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
}

interface ConversationTurn {
  prompt: string;
  response: QueryResponseBody;
}

export function O2CWorkspace() {
  const [graphNodes, setGraphNodes] = useState<GraphNodeRecord[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeRecord[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeRecord | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GraphSearchResult[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [graphResetToken, setGraphResetToken] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const latestResponse = history[0]?.response ?? null;

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      setIsGraphLoading(true);
      try {
        const response = await fetch(
          `/api/graph/neighborhood?nodeId=${encodeURIComponent(FEATURED_NODE_ID)}&depth=1`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch initial graph: ${response.status}`);
        }

        const payload = (await response.json()) as NeighborhoodPayload;

        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setGraphNodes(payload.nodes);
          setGraphEdges(payload.edges);
          setSelectedNode(
            payload.node ?? payload.nodes.find((node) => node.nodeId === FEATURED_NODE_ID) ?? null,
          );
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsGraphLoading(false);
        }
      }
    })().catch(() => {
      if (!controller.signal.aborted) {
        setIsGraphLoading(false);
      }
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = deferredSearchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      const response = await fetch(`/api/graph/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const payload = (await response.json()) as { results: GraphSearchResult[] };
      setSearchResults(payload.results);
    })().catch(() => {
      if (!controller.signal.aborted) {
        setSearchResults([]);
      }
    });

    return () => controller.abort();
  }, [deferredSearchQuery]);

  const selectedMetadata = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    return Object.entries(selectedNode.metadata).filter(([, value]) => value != null && value !== "");
  }, [selectedNode]);

  async function openNode(nodeId: string) {
    await loadFocusedGraph([nodeId], nodeId);
  }

  async function loadFocusedGraph(nodeIds: string[], preferredNodeId: string, signal?: AbortSignal) {
    const uniqueNodeIds = uniqueStrings(nodeIds).slice(0, 3);

    if (uniqueNodeIds.length === 0) {
      startTransition(() => {
        setGraphNodes([]);
        setGraphEdges([]);
        setSelectedNode(null);
      });
      return;
    }

    setIsGraphLoading(true);

    try {
      const payloads = await Promise.all(uniqueNodeIds.map((nodeId) => fetchNeighborhood(nodeId, signal)));

      if (signal?.aborted) {
        return;
      }

      const nodes = mergeById(
        [],
        payloads.flatMap((payload) => payload.nodes),
        "nodeId",
      );
      const edges = mergeById(
        [],
        payloads.flatMap((payload) => payload.edges),
        "edgeId",
      );
      const selected =
        payloads.find((payload) => payload.node?.nodeId === preferredNodeId)?.node ??
        nodes.find((node) => node.nodeId === preferredNodeId) ??
        payloads[0]?.node ??
        nodes[0] ??
        null;

      startTransition(() => {
        setGraphNodes(nodes);
        setGraphEdges(edges);
        setSelectedNode(selected);
      });
    } finally {
      if (!signal?.aborted) {
        setIsGraphLoading(false);
      }
    }
  }

  async function fetchNeighborhood(nodeId: string, signal?: AbortSignal) {
    const response = await fetch(`/api/graph/neighborhood?nodeId=${encodeURIComponent(nodeId)}&depth=1`, {
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch neighborhood: ${response.status}`);
    }

    return (await response.json()) as NeighborhoodPayload;
  }

  async function handleQuerySubmit(message: string) {
    const prompt = message.trim();
    if (!prompt) {
      return;
    }

    setIsQueryLoading(true);
    setDraftMessage("");

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          focusNodeIds: selectedNode ? [selectedNode.nodeId] : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      const payload = (await response.json()) as QueryResponseBody;
      setHistory((current) => [{ prompt, response: payload }, ...current].slice(0, 6));
      setHighlightedNodeIds(payload.relatedNodeIds);

      const nextNodeIds =
        payload.relatedNodeIds.length > 0
          ? payload.relatedNodeIds.slice(0, 3)
          : selectedNode
            ? [selectedNode.nodeId]
            : [FEATURED_NODE_ID];

      await loadFocusedGraph(nextNodeIds, payload.relatedNodeIds[0] ?? selectedNode?.nodeId ?? FEATURED_NODE_ID);
    } finally {
      setIsQueryLoading(false);
    }
  }

  return (
    <main className="workspace">
      <header className="hero">
        <div>
          <p className="eyebrow">Deployable Assignment Build</p>
          <h1>Order-to-Cash Context Graph</h1>
          <p className="heroCopy">
            Explore the SAP O2C flow as a graph, inspect node metadata, and ask grounded natural-language
            questions that resolve to structured queries.
          </p>
        </div>
        <div className="heroCard">
          <span>Current demo node</span>
          <strong>{selectedNode?.label ?? "Loading graph..."}</strong>
          <small>{selectedNode?.subtitle ?? "Hydrating the first neighborhood from the dataset."}</small>
        </div>
      </header>

      <section className="workspaceShell">
        <section className="panel graphPanel">
          <div className="panelHeader">
            <div>
              <p className="panelEyebrow">Graph Explorer</p>
              <h2>Relationships</h2>
            </div>
            <div className="panelActions">
              <button
                className="ghostButton"
                type="button"
                onClick={() => setGraphResetToken((current) => current + 1)}
                disabled={graphNodes.length === 0}
              >
                Reset view
              </button>
              <span className="statusPill">{isGraphLoading ? "Updating graph" : `${graphNodes.length} nodes loaded`}</span>
            </div>
          </div>

          <label className="searchLabel" htmlFor="graph-search">
            Search nodes
          </label>
          <input
            id="graph-search"
            className="searchInput"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Try 90504248, 740506, vitamin c, or Cardenas"
          />

          {searchResults.length > 0 && (
            <div className="searchResults">
              {searchResults.map((result) => (
                <button
                  key={result.nodeId}
                  className="searchResult"
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    void openNode(result.nodeId);
                  }}
                >
                  <strong>{result.label}</strong>
                  <span>{result.subtitle}</span>
                </button>
              ))}
            </div>
          )}

          <GraphCanvas
            nodes={graphNodes}
            edges={graphEdges}
            selectedNodeId={selectedNode?.nodeId ?? null}
            highlightedNodeIds={highlightedNodeIds}
            resetViewToken={graphResetToken}
            onNodeOpen={(nodeId) => {
              void openNode(nodeId);
            }}
          />

          <div className="inspector">
            <div className="inspectorHeader">
              <div>
                <p className="panelEyebrow">Inspector</p>
                <h3>{selectedNode?.label ?? "Select a node"}</h3>
              </div>
              <span className="nodeTag">{selectedNode?.nodeType ?? "none"}</span>
            </div>
            <p className="inspectorSubtitle">{selectedNode?.subtitle ?? "Click any node to inspect its metadata."}</p>

            {selectedMetadata.length === 0 ? (
              <p className="emptyState">No metadata loaded yet.</p>
            ) : (
              <dl className="metadataList">
                {selectedMetadata.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{renderMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        <section className="panel chatPanel">
          <div className="panelHeader">
            <div>
              <p className="panelEyebrow">Conversational Query</p>
              <h2>Grounded Answers</h2>
            </div>
            <span className="statusPill">{isQueryLoading ? "Running query" : "Read-only SQL only"}</span>
          </div>

          <div className="sampleStrip">
            {SAMPLE_QUESTIONS.map((question) => (
              <button key={question} type="button" className="sampleChip" onClick={() => void handleQuerySubmit(question)}>
                {question}
              </button>
            ))}
          </div>

          <form
            className="chatComposer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleQuerySubmit(draftMessage);
            }}
          >
            <label className="searchLabel" htmlFor="chat-input">
              Ask about the dataset
            </label>
            <textarea
              id="chat-input"
              className="chatInput"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Example: Trace the full flow of billing document 90504248."
              rows={4}
            />
            <button className="primaryButton" type="submit" disabled={isQueryLoading}>
              {isQueryLoading ? "Querying..." : "Run grounded query"}
            </button>
          </form>

          <div className="conversation">
            {history.length === 0 ? (
              <p className="emptyState">Run a sample query or ask your own question to populate the chat.</p>
            ) : (
              history.map((turn, index) => (
                <article className="conversationTurn" key={`${turn.prompt}-${index}`}>
                  <div className="messageBubble userBubble">{turn.prompt}</div>
                  <div className="messageBubble assistantBubble">
                    <p>{turn.response.answer}</p>
                    {turn.response.refusal && <p className="refusalText">{turn.response.refusal}</p>}
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="sqlBlock">
            <div className="inspectorHeader">
              <div>
                <p className="panelEyebrow">Generated SQL</p>
                <h3>Execution trace</h3>
              </div>
            </div>
            <pre>{latestResponse?.sql ?? "No SQL yet."}</pre>
          </div>

          <div className="sqlBlock">
            <div className="inspectorHeader">
              <div>
                <p className="panelEyebrow">Rows Preview</p>
                <h3>Returned data</h3>
              </div>
            </div>
            <ResultTable rows={latestResponse?.rowsPreview ?? []} />
          </div>
        </section>
      </section>
    </main>
  );
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function mergeById<T extends Record<TKey, string>, TKey extends keyof T>(
  current: T[],
  incoming: T[],
  key: TKey,
) {
  const merged = new Map(current.map((item) => [item[key], item]));
  incoming.forEach((item) => merged.set(item[key], item));
  return [...merged.values()];
}

function renderMetadataValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}
