import { loadNormalizedDataset } from "@/lib/o2c/dataset";

describe("normalized dataset", () => {
  it("links sales order 740552/10 through delivery, billing, and accounting", async () => {
    const dataset = await loadNormalizedDataset();

    const flowRow = dataset.o2cFlowItems.find(
      (row) => row.salesOrderId === "740552" && row.salesOrderItemId === "10",
    );

    expect(flowRow).toBeDefined();
    expect(flowRow?.firstDeliveryDocumentId).toBe("80738072");
    expect(flowRow?.firstBillingDocumentId).toBe("90504248");
    expect(flowRow?.accountingDocumentId).toBe("9400000249");
  });

  it("computes the expected incomplete sales orders from the dataset", async () => {
    const dataset = await loadNormalizedDataset();
    const incompleteOrderIds = new Set(
      dataset.o2cFlowItems.filter((row) => row.flowStatus !== "complete").map((row) => row.salesOrderId),
    );

    expect(incompleteOrderIds.has("740506")).toBe(true);
    expect(incompleteOrderIds.has("740507")).toBe(true);
    expect(incompleteOrderIds.has("740508")).toBe(true);
  });
});
