"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";

import { type GraphEdgeRecord, type GraphNodeRecord } from "@/lib/contracts";

interface GraphCanvasProps {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  onNodeOpen: (nodeId: string) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds,
  onNodeOpen,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const onNodeOpenRef = useRef(onNodeOpen);

  useEffect(() => {
    onNodeOpenRef.current = onNodeOpen;
  }, [onNodeOpen]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-family": "var(--font-heading)",
            "font-size": "11",
            "text-wrap": "wrap",
            "text-max-width": "120",
            color: "#07203a",
            "background-color": "#c6eff8",
            "border-color": "#0f4c81",
            "border-width": "2",
            width: "42",
            height: "42",
          },
        },
        {
          selector: "edge",
          style: {
            width: "2",
            "line-color": "#9bc2dd",
            "target-arrow-color": "#9bc2dd",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(relation)",
            "font-size": "8",
            "font-family": "var(--font-mono)",
            color: "#28557a",
          },
        },
        {
          selector: ".selected",
          style: {
            "background-color": "#ff8f3d",
            "border-color": "#8a3d00",
            "border-width": "4",
          },
        },
        {
          selector: ".highlighted",
          style: {
            "background-color": "#fff0a6",
            "border-color": "#9a7800",
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.3,
          },
        },
      ],
      layout: {
        name: "breadthfirst",
        fit: true,
        directed: true,
        spacingFactor: 1.35,
        padding: 24,
        animate: false,
      },
    });

    cy.on("tap", "node", (event) => {
      onNodeOpenRef.current(event.target.id());
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    const elements: ElementDefinition[] = [
      ...nodes.map((node) => ({
        data: {
          id: node.nodeId,
          label: node.label,
          subtitle: node.subtitle,
          type: node.nodeType,
        },
      })),
      ...edges.map((edge) => ({
        data: {
          id: edge.edgeId,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          relation: edge.relation,
        },
      })),
    ];

    cy.elements().remove();
    cy.add(elements);
    cy.layout({
      name: "breadthfirst",
      fit: true,
      directed: true,
      spacingFactor: 1.35,
      padding: 24,
      animate: false,
    }).run();
  }, [edges, nodes]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.nodes().removeClass("selected highlighted dimmed");

    if (highlightedNodeIds.length > 0) {
      cy.nodes().addClass("dimmed");
      highlightedNodeIds.forEach((nodeId) => {
        cy.getElementById(nodeId).removeClass("dimmed").addClass("highlighted");
      });
    }

    if (selectedNodeId) {
      cy.getElementById(selectedNodeId).removeClass("dimmed").addClass("selected");
    }
  }, [highlightedNodeIds, selectedNodeId]);

  return <div className="graphCanvas" ref={containerRef} />;
}
