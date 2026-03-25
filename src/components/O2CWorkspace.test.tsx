import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import { O2CWorkspace } from "@/components/O2CWorkspace";

vi.mock("@/components/GraphCanvas", () => ({
  GraphCanvas: () => React.createElement("div", { "data-testid": "graph-canvas" }, "graph"),
}));

describe("O2CWorkspace", () => {
  it("runs a sample question and renders the answer and sql", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/graph/neighborhood")) {
        return {
          json: async () => ({
            node: {
              nodeId: "billing_document:90504248",
              nodeType: "billing_document",
              entityId: "90504248",
              label: "Billing 90504248",
              subtitle: "Billing document",
              metadata: { billingDocumentId: "90504248" },
            },
            nodes: [],
            edges: [],
          }),
        };
      }

      if (input.startsWith("/api/query")) {
        return {
          json: async () => ({
            answer: "Billing document 90504248 traces back to sales order 740552.",
            sql: "select billing_document_id from v_billing_trace limit 20",
            rowsPreview: [{ billing_document_id: "90504248" }],
            relatedNodeIds: ["billing_document:90504248"],
            diagnostics: { mode: "template" },
          }),
        };
      }

      return {
        json: async () => ({ results: [] }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(O2CWorkspace));

    const sampleChip = await screen.findByRole("button", {
      name: /Trace the full flow of billing document 90504248/i,
    });

    fireEvent.click(sampleChip);

    await waitFor(() => {
      expect(screen.getByText(/traces back to sales order 740552/i)).toBeInTheDocument();
      expect(screen.getByText(/select billing_document_id from v_billing_trace/i)).toBeInTheDocument();
    });
  });
});
