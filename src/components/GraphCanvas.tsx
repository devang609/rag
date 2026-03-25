"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition, type LayoutOptions } from "cytoscape";

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
            "font-family": '"Aptos", "Segoe UI", sans-serif',
            "font-size": 11,
            "text-wrap": "wrap",
            "text-max-width": "120",
            color: "#07203a",
            "background-color": "#c6eff8",
            "border-color": "#0f4c81",
            "border-width": 2,
            width: 42,
            height: 42,
            "text-valign": "center",
            "text-halign": "center",
            "text-margin-y": -34,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#9bc2dd",
            "target-arrow-color": "#9bc2dd",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(relation)",
            "font-size": 8,
            "font-family": '"Consolas", "Courier New", monospace',
            color: "#28557a",
            "text-background-color": "rgba(255, 255, 255, 0.92)",
            "text-background-opacity": 1,
            "text-background-padding": "2",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: ".selected",
          style: {
            "background-color": "#ff8f3d",
            "border-color": "#8a3d00",
            "border-width": 4,
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
      layout: getLayoutOptions(0, 0),
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

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    cy.resize();

    if (elements.length === 0) {
      return;
    }

    const layout = cy.layout(getLayoutOptions(nodes.length, edges.length));
    layout.run();

    requestAnimationFrame(() => {
      cy.resize();
      cy.fit(cy.elements(), 24);
      cy.center(cy.elements());
    });
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

function getLayoutOptions(nodeCount: number, edgeCount: number): LayoutOptions {
  if (nodeCount <= 16) {
    return {
      name: "breadthfirst",
      fit: true,
      directed: true,
      spacingFactor: 1.45,
      padding: 24,
      animate: false,
    };
  }

  const isLargeGraph = nodeCount >= 80 || edgeCount >= 120;

  return {
    name: "cose",
    fit: true,
    animate: false,
    padding: 28,
    randomize: false,
    componentSpacing: isLargeGraph ? 100 : 72,
    idealEdgeLength: isLargeGraph ? 64 : 78,
    edgeElasticity: 90,
    nodeRepulsion: isLargeGraph ? 180000 : 110000,
    gravity: 1,
    nestingFactor: 0.9,
    numIter: isLargeGraph ? 1200 : 900,
  };
}
