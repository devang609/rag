import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { getPool } from "@/db/client";
import { DOMAIN_HINTS } from "@/lib/constants";
import { type QueryResponseBody } from "@/lib/contracts";
import { env } from "@/lib/env";
import { loadNormalizedDataset, type NormalizedDataset } from "@/lib/o2c/dataset";
import { validateReadOnlySql } from "@/lib/query/guardrails";
import { planTemplateQuery, type TemplatePlan } from "@/lib/query/templates";

const REFUSAL_MESSAGE = "This system is designed to answer questions related to the provided dataset only.";

const plannerSchema = z.object({
  sql: z.string(),
  rationale: z.string(),
});

export async function runNaturalLanguageQuery(message: string, focusNodeIds: string[] = []): Promise<QueryResponseBody> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return {
      answer: "Ask a question about orders, deliveries, billing, payments, customers, or products in this dataset.",
      sql: null,
      rowsPreview: [],
      relatedNodeIds: focusNodeIds,
      diagnostics: {
        mode: "empty",
      },
    };
  }

  const dataset = await loadNormalizedDataset();
  const templatePlan = planTemplateQuery(trimmedMessage, dataset);
  const domainDecision = await classifyDomain(trimmedMessage, focusNodeIds, dataset, Boolean(templatePlan));
  if (!domainDecision.inDomain) {
    return {
      answer: REFUSAL_MESSAGE,
      sql: null,
      rowsPreview: [],
      relatedNodeIds: [],
      refusal: REFUSAL_MESSAGE,
      diagnostics: {
        mode: "refusal",
        reason: domainDecision.reason,
      },
    };
  }

  let sqlText: string | null = null;
  let rows: Array<Record<string, unknown>> = [];
  let mode: "template" | "llm" = "template";
  let rationale = domainDecision.reason;

  if (templatePlan) {
    sqlText = validateReadOnlySql(templatePlan.sql);
    rows = await executePlan(templatePlan, dataset);
  } else if (env.DATABASE_URL && env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const llmPlan = await generateSqlPlan(trimmedMessage, focusNodeIds);
    sqlText = validateReadOnlySql(llmPlan.sql);
    rows = await executeSql(sqlText);
    mode = "llm";
    rationale = llmPlan.rationale;
  } else {
    return {
      answer:
        "I can answer the assignment queries now, but broader open-ended querying needs a Postgres database and Gemini API key configured.",
      sql: null,
      rowsPreview: [],
      relatedNodeIds: focusNodeIds,
      refusal: "Open-ended query generation is not configured.",
      diagnostics: {
        mode: "not_configured",
        hasDatabase: Boolean(env.DATABASE_URL),
        hasLlmKey: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
      },
    };
  }

  const rowsPreview = rows.slice(0, 20);
  const relatedNodeIds = unique([...focusNodeIds, ...deriveRelatedNodeIds(rowsPreview)]);

  const answer =
    rows.length === 0
      ? "No matching data was found in the provided O2C dataset for that query."
      : templatePlan
        ? buildTemplateAnswer(templatePlan, rows)
        : await buildGroundedAnswer(trimmedMessage, rowsPreview, rationale);

  return {
    answer,
    sql: sqlText,
    rowsPreview,
    relatedNodeIds,
    diagnostics: {
      mode,
      rowCount: rows.length,
      reason: rationale,
      hasDatabase: Boolean(env.DATABASE_URL),
      hasLlmKey: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
    },
  };
}

async function executePlan(plan: TemplatePlan, dataset: NormalizedDataset) {
  if (env.DATABASE_URL) {
    return executeSql(plan.sql);
  }

  return plan.execute(dataset);
}

async function executeSql(query: string) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("set local statement_timeout = 3000");
    const result = await client.query(query);
    await client.query("commit");
    return result.rows as Array<Record<string, unknown>>;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function generateSqlPlan(message: string, focusNodeIds: string[]) {
  const prompt = `
You translate natural language questions about an SAP order-to-cash dataset into safe Postgres SELECT queries.

Rules:
- Query only from these views: v_o2c_flow_item, v_billing_trace, v_entity_lookup, v_customer_growth, v_customer_status
- Never use *, DML, DDL, comments, or multiple statements
- Always include a LIMIT <= 100
- Use only these columns:
  v_o2c_flow_item: sales_order_id, sales_order_item_id, customer_id, customer_name, product_id, product_description, production_plant_id, storage_location, requested_quantity, order_net_amount, currency, delivery_count, first_delivery_document_id, billing_document_count, first_billing_document_id, accounting_document_id, payment_count, flow_status
  v_billing_trace: billing_document_id, billing_document_item_id, billing_document_type, billing_document_date, billing_document_is_cancelled, company_code, fiscal_year, accounting_document_id, sales_order_id, sales_order_item_id, delivery_document_id, delivery_document_item_id, customer_id, customer_name, product_id, product_description, billing_net_amount, currency, journal_entry_count, payment_count, payment_clearing_documents, flow_status
  v_entity_lookup: node_id, node_type, entity_id, label, subtitle, search_text
  v_customer_growth: customer_id, customer_name, order_date, order_year, order_month, sales_order_count, sales_order_item_count, total_order_amount, delivered_item_count, billed_item_count, posted_item_count, paid_item_count
  v_customer_status: customer_id, customer_name, business_partner_is_blocked, creation_date
- Prefer direct filters and simple aggregates.

Focused nodes: ${focusNodeIds.length > 0 ? focusNodeIds.join(", ") : "none"}
Question: ${message}
  `.trim();

  const result = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: plannerSchema,
    prompt,
  });

  return result.object;
}

async function buildGroundedAnswer(
  message: string,
  rowsPreview: Array<Record<string, unknown>>,
  rationale: string,
) {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return buildGenericAnswer(rowsPreview);
  }

  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    prompt: `
Answer the question using only the returned rows.
If data is partial, say so.
Do not invent facts.

Question: ${message}
Planner rationale: ${rationale}
Rows: ${JSON.stringify(rowsPreview)}
    `.trim(),
  });

  return result.text;
}

async function classifyDomain(
  message: string,
  focusNodeIds: string[],
  dataset: NormalizedDataset,
  hasTemplatePlan: boolean,
) {
  const normalized = message.toLowerCase();

  if (focusNodeIds.length > 0) {
    return { inDomain: true, reason: "Focused graph nodes were supplied." };
  }

  if (hasTemplatePlan) {
    return { inDomain: true, reason: "The message matched a supported dataset-backed query pattern." };
  }

  if (DOMAIN_HINTS.some((hint) => normalized.includes(hint))) {
    return { inDomain: true, reason: "Message contains O2C domain terms." };
  }

  if (dataset.entityLookup.some((row) => normalized.includes(row.label.toLowerCase()))) {
    return { inDomain: true, reason: "The message references a known entity in the dataset." };
  }

  if (/\b(poem|story|weather|capital|recipe|joke|movie|sports|song)\b/i.test(normalized)) {
    return { inDomain: false, reason: "Message is clearly outside the assignment domain." };
  }

  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const result = await generateObject({
      model: google("gemini-2.5-flash-lite"),
      schema: z.object({
        inDomain: z.boolean(),
        reason: z.string(),
      }),
      prompt: `
Decide whether this user message is about the SAP order-to-cash dataset.
In-domain topics include orders, deliveries, billing, invoices, customers, products, payments, journal entries, addresses, plants, and graph exploration.
Out-of-domain topics should be rejected.

Message: ${message}
      `.trim(),
    });

    return result.object;
  }

  return { inDomain: false, reason: "No domain signals were found." };
}

function buildTemplateAnswer(plan: TemplatePlan, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "No matching data was found in the provided O2C dataset for that query.";
  }

  switch (plan.kind) {
    case "top_products_by_billing_docs": {
      const topThree = rows.slice(0, 3).map(
        (row) =>
          `${row.product_description} (${row.product_id}) with ${row.billing_document_count} billing documents`,
      );

      return `The highest-volume billed products are ${topThree.join(", ")}.`;
    }
    case "trace_billing_document": {
      const first = rows[0];
      const itemCount = rows.length;
      const paymentCount = Number(first.payment_count ?? 0);
      const cancelled = Boolean(first.billing_document_is_cancelled);

      return `Billing document ${first.billing_document_id} traces back to sales order ${first.sales_order_id ?? "unknown"} and delivery ${first.delivery_document_id ?? "unknown"}. It has ${itemCount} billing item(s), maps to accounting document ${first.accounting_document_id ?? "unknown"}, and currently shows ${paymentCount} payment record(s).${cancelled ? " The billing document is marked as cancelled." : ""}`;
    }
    case "incomplete_sales_orders": {
      const preview = rows
        .slice(0, 5)
        .map((row) => `${row.sales_order_id} (${row.flow_status}, ${row.affected_item_count} affected items)`);

      return `I found ${rows.length} sales orders with incomplete flows. Examples include ${preview.join(", ")}.`;
    }
    case "customer_growth": {
      const first = rows[0];
      const last = rows.at(-1) ?? first;
      const totalOrders = rows.reduce((sum, row) => sum + Number(row.sales_order_count ?? 0), 0);
      const totalAmount = rows.reduce((sum, row) => sum + Number(row.total_order_amount ?? 0), 0);
      const totalDelivered = rows.reduce((sum, row) => sum + Number(row.delivered_item_count ?? 0), 0);
      const totalBilled = rows.reduce((sum, row) => sum + Number(row.billed_item_count ?? 0), 0);

      if (rows.length === 1) {
        return `${first.customer_name} appears in the dataset on ${formatDateValue(first.order_date)} only, so there is not enough time-series history to show growth across multiple periods. On that date the customer had ${first.sales_order_count} sales order(s), ${first.sales_order_item_count} item(s), and total order amount ${Number(first.total_order_amount ?? 0).toFixed(2)}. Delivered items: ${first.delivered_item_count}; billed items: ${first.billed_item_count}.`;
      }

      return `${first.customer_name} spans ${rows.length} time period(s) from ${formatDateValue(first.order_date)} to ${formatDateValue(last.order_date)}. Across that history the customer generated ${totalOrders} sales order(s) totaling ${totalAmount.toFixed(2)}. Delivered items: ${totalDelivered}; billed items: ${totalBilled}.`;
    }
    case "blocked_customer_percentage": {
      const first = rows[0];
      const blockedCustomerIds = Array.isArray(first.blocked_customer_ids)
        ? first.blocked_customer_ids.map(String)
        : [];
      return `${Number(first.blocked_percentage ?? 0).toFixed(2)}% of customers are currently blocked (${first.blocked_customer_count} of ${first.total_customer_count}). Blocked customer IDs: ${blockedCustomerIds.join(", ")}.`;
    }
    default:
      return buildGenericAnswer(rows);
  }
}

function buildGenericAnswer(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "No matching data was found in the provided O2C dataset for that query.";
  }

  return `I found ${rows.length} matching row(s). The preview contains the highest-signal records returned by the query.`;
}

function deriveRelatedNodeIds(rows: Array<Record<string, unknown>>) {
  const nodeIds = new Set<string>();

  for (const row of rows) {
    const salesOrderId = asString(row.sales_order_id);
    const salesOrderItemId = asString(row.sales_order_item_id);
    const deliveryDocumentId = asString(row.delivery_document_id ?? row.first_delivery_document_id);
    const deliveryDocumentItemId = asString(row.delivery_document_item_id);
    const billingDocumentId = asString(row.billing_document_id ?? row.first_billing_document_id);
    const billingDocumentItemId = asString(row.billing_document_item_id);
    const customerId = asString(row.customer_id);
    const blockedCustomerIds = Array.isArray(row.blocked_customer_ids) ? row.blocked_customer_ids.map(String) : [];
    const activeCustomerIds = Array.isArray(row.active_customer_ids) ? row.active_customer_ids.map(String) : [];
    const productId = asString(row.product_id);

    if (salesOrderId) {
      nodeIds.add(`sales_order:${salesOrderId}`);
    }
    if (salesOrderId && salesOrderItemId) {
      nodeIds.add(`sales_order_item:${salesOrderId}:${salesOrderItemId}`);
    }
    if (deliveryDocumentId) {
      nodeIds.add(`delivery:${deliveryDocumentId}`);
    }
    if (deliveryDocumentId && deliveryDocumentItemId) {
      nodeIds.add(`delivery_item:${deliveryDocumentId}:${deliveryDocumentItemId}`);
    }
    if (billingDocumentId) {
      nodeIds.add(`billing_document:${billingDocumentId}`);
    }
    if (billingDocumentId && billingDocumentItemId) {
      nodeIds.add(`billing_item:${billingDocumentId}:${billingDocumentItemId}`);
    }
    if (customerId) {
      nodeIds.add(`customer:${customerId}`);
    }
    for (const blockedCustomerId of blockedCustomerIds) {
      nodeIds.add(`customer:${blockedCustomerId}`);
    }
    for (const activeCustomerId of activeCustomerIds) {
      nodeIds.add(`customer:${activeCustomerId}`);
    }
    if (productId) {
      nodeIds.add(`product:${productId}`);
    }
  }

  return [...nodeIds];
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function formatDateValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return String(value ?? "");
}
