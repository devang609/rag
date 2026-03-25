import { getGraphNeighborhood, searchGraph } from "@/lib/graph/service";

describe("graph service", () => {
  it("finds billing document 90504248 by search", async () => {
    const results = await searchGraph("90504248");

    expect(results[0]?.nodeId).toBe("billing_document:90504248");
  });

  it("returns a one-hop neighborhood for the featured billing document", async () => {
    const neighborhood = await getGraphNeighborhood("billing_document:90504248", 1);

    expect(neighborhood.nodes.some((node) => node.nodeId === "billing_document:90504248")).toBe(true);
    expect(
      neighborhood.edges.some(
        (edge) =>
          edge.sourceNodeId === "billing_document:90504248" || edge.targetNodeId === "billing_document:90504248",
      ),
    ).toBe(true);
  });
});
