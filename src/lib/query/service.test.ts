import { validateReadOnlySql } from "@/lib/query/guardrails";
import { prepareGeneratedSql, runNaturalLanguageQuery } from "@/lib/query/service";

describe("query service", () => {
  it("returns the top billed products from the dataset", async () => {
    const response = await runNaturalLanguageQuery(
      "Which products are associated with the highest number of billing documents?",
    );

    expect(response.refusal).toBeUndefined();
    expect(response.rowsPreview[0]?.product_id).toBe("S8907367008620");
    expect(response.rowsPreview[0]?.billing_document_count).toBe(22);
    expect(response.rowsPreview[1]?.product_id).toBe("S8907367039280");
    expect(response.sql).toContain("from v_billing_trace");
  });

  it("traces billing document 90504248", async () => {
    const response = await runNaturalLanguageQuery("Trace the full flow of billing document 90504248.");

    expect(response.rowsPreview[0]?.sales_order_id).toBe("740552");
    expect(response.rowsPreview[0]?.delivery_document_id).toBe("80738072");
    expect(response.rowsPreview[0]?.accounting_document_id).toBe("9400000249");
    expect(response.relatedNodeIds).toContain("billing_document:90504248");
  });

  it("identifies incomplete sales orders", async () => {
    const response = await runNaturalLanguageQuery("Identify sales orders that have broken or incomplete flows.");
    const orderIds = response.rowsPreview.map((row) => row.sales_order_id);

    expect(orderIds).toContain("740506");
    expect(orderIds).toContain("740507");
    expect(orderIds).toContain("740508");
  });

  it("tracks customer growth for Melton Group without hitting the LLM planner", async () => {
    const response = await runNaturalLanguageQuery("Track the growth of Melton Group");

    expect(response.refusal).toBeUndefined();
    expect(response.rowsPreview[0]?.customer_name).toBe("Melton Group");
    expect(response.rowsPreview[0]?.order_date).toBe("2025-04-02");
    expect(response.rowsPreview[0]?.sales_order_count).toBe(7);
    expect(response.rowsPreview[0]?.sales_order_item_count).toBe(11);
    expect(response.rowsPreview[0]?.delivered_item_count).toBe(0);
    expect(response.sql).toContain("from v_customer_growth");
    expect(response.answer).toContain("not enough time-series history");
  });

  it("returns the blocked customer percentage correctly", async () => {
    const response = await runNaturalLanguageQuery("What percentage of customers are currently blocked?");

    expect(response.refusal).toBeUndefined();
    expect(response.rowsPreview[0]?.total_customer_count).toBe(8);
    expect(response.rowsPreview[0]?.blocked_customer_count).toBe(6);
    expect(response.rowsPreview[0]?.active_customer_count).toBe(2);
    expect(response.rowsPreview[0]?.blocked_percentage).toBe(75);
    expect(response.rowsPreview[0]?.blocked_customer_ids).toEqual([
      "320000082",
      "320000083",
      "320000085",
      "320000088",
      "320000107",
      "320000108",
    ]);
    expect(response.relatedNodeIds).toContain("customer:320000108");
    expect(response.sql).toContain("from v_customer_status");
    expect(response.answer).toContain("75.00%");
  });

  it("returns the net weight for a product from product master data", async () => {
    const response = await runNaturalLanguageQuery("What is the net weight of product B8907367002246?");

    expect(response.refusal).toBeUndefined();
    expect(response.rowsPreview[0]?.product_id).toBe("B8907367002246");
    expect(response.rowsPreview[0]?.net_weight).toBe(0.1);
    expect(response.rowsPreview[0]?.weight_unit).toBe("KG");
    expect(response.sql).toContain("from v_product_details");
    expect(response.answer).toBe("0.1 KG");
  });

  it("returns the gross weight for a product from product master data", async () => {
    const response = await runNaturalLanguageQuery("What is the gross weight of product 3001468?");

    expect(response.refusal).toBeUndefined();
    expect(response.rowsPreview[0]?.product_id).toBe("3001468");
    expect(response.rowsPreview[0]?.gross_weight).toBe(0.012);
    expect(response.rowsPreview[0]?.weight_unit).toBe("KG");
    expect(response.sql).toContain("from v_product_details");
    expect(response.answer).toBe("0.012 KG");
  });

  it("refuses unrelated prompts", async () => {
    const response = await runNaturalLanguageQuery("Write a poem about the moon.");

    expect(response.refusal).toBeDefined();
    expect(response.answer).toContain("provided dataset only");
  });

  it("rejects non-read-only sql", () => {
    expect(() => validateReadOnlySql("delete from v_billing_trace where billing_document_id = '1'"))
      .toThrow("Only read-only SELECT queries are allowed.");
  });

  it("allows SQL aliases and CTE aliases when base relations stay allowlisted", () => {
    expect(() =>
      validateReadOnlySql(`
with yearly as (
  select
    order_year as sales_year,
    count(1) as order_count
  from v_customer_growth
  group by sales_year
)
select sales_year, order_count
from yearly
order by sales_year
limit 10
      `),
    ).not.toThrow();
  });

  it("repairs generated SQL by adding a safe LIMIT and normalizing count(*)", () => {
    expect(
      prepareGeneratedSql(`
select count(*) as customer_count
from v_customers
where business_partner_is_blocked = true
      `),
    ).toContain("limit 100");
  });
});
