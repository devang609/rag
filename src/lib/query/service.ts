import { z } from "zod";

import { getPool } from "@/db/client";
import { DOMAIN_HINTS } from "@/lib/constants";
import { type QueryResponseBody } from "@/lib/contracts";
import { env } from "@/lib/env";
import { loadNormalizedDataset, type NormalizedDataset } from "@/lib/o2c/dataset";
import { validateReadOnlySql } from "@/lib/query/guardrails";
import {
  orchestratedGenerateObject,
  flashGenerateText,
  flashGenerateObject,
} from "@/lib/query/model-orchestrator";
import {
  formatSemanticCatalogForPrompt,
  formatSemanticRelationshipsForPrompt,
  UNSUPPORTED_TOPIC_HINTS,
} from "@/lib/query/semantic-catalog";
import { planTemplateQuery, type TemplatePlan } from "@/lib/query/templates";

const REFUSAL_MESSAGE = "This system is designed to answer questions related to the provided dataset only.";
const SQL_LIMIT_FALLBACK = 100;
const UNSUPPORTED_CONCEPT_PATTERN =
  /\b(employee|headcount|weather|shipping costs?|freight|vendor|supplier|profit margins?|margins?|warehouse manager|returns?|rma|competitor|satisfaction|survey|equipment|asset|procurement|procure|raw materials?|support tickets?|helpdesk)\b/i;

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
  const entityHints = resolveEntityHints(trimmedMessage, dataset);
  const domainDecision = await classifyDomain(
    trimmedMessage,
    focusNodeIds,
    dataset,
    Boolean(templatePlan),
    entityHints,
  );
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
    let llmPlan = await generateSqlPlan(trimmedMessage, focusNodeIds, entityHints);

    try {
      sqlText = llmPlan.sql;
      rows = await executeSql(sqlText);
    } catch (error) {
      llmPlan = await repairSqlPlan(trimmedMessage, focusNodeIds, entityHints, llmPlan.sql, error);
      sqlText = llmPlan.sql;
      rows = await executeSql(sqlText);
    }

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
    await client.query(`set local statement_timeout = ${env.QUERY_STATEMENT_TIMEOUT_MS ?? 3000}`);
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

export function prepareGeneratedSql(query: string) {
  let sqlText = query.trim().replace(/;+\s*$/g, "");
  sqlText = sqlText.replace(/\bcount\s*\(\s*\*\s*\)/gi, "count(1)");

  if (!/\blimit\b/i.test(sqlText)) {
    sqlText = `${sqlText}\nlimit ${SQL_LIMIT_FALLBACK}`;
  }

  return validateReadOnlySql(sqlText);
}

async function buildGroundedAnswer(
  message: string,
  rowsPreview: Array<Record<string, unknown>>,
  rationale: string,
) {
  const directAnswer = buildDirectAnswer(rowsPreview);
  if (directAnswer) {
    return directAnswer;
  }

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return buildGenericAnswer(rowsPreview);
  }

  // Use flash model for answer generation (simple task, high throughput)
  const { result } = await flashGenerateText(`
Answer the question using only the returned rows.
If the question asks for a direct attribute and the rows contain it, answer with the exact value in the first sentence.
If a unit is present, include it.
If data is partial, say so.
Do not invent facts, totals, trends, or labels that are not in the rows.

Question: ${message}
Planner rationale: ${rationale}
Rows: ${JSON.stringify(rowsPreview)}
    `.trim());

  return result.text;
}

async function classifyDomain(
  message: string,
  focusNodeIds: string[],
  dataset: NormalizedDataset,
  hasTemplatePlan: boolean,
  entityHints: string[],
) {
  const normalized = message.toLowerCase();

  if (focusNodeIds.length > 0) {
    return { inDomain: true, reason: "Focused graph nodes were supplied." };
  }

  if (hasTemplatePlan) {
    return { inDomain: true, reason: "The message matched a supported dataset-backed query pattern." };
  }

  if (UNSUPPORTED_CONCEPT_PATTERN.test(normalized)) {
    return { inDomain: false, reason: "The message asks for concepts that are outside the dataset scope." };
  }

  if (DOMAIN_HINTS.some((hint) => normalized.includes(hint))) {
    return { inDomain: true, reason: "Message contains O2C domain terms." };
  }

  if (entityHints.length > 0 || dataset.entityLookup.some((row) => normalized.includes(row.label.toLowerCase()))) {
    return { inDomain: true, reason: "The message references known entities in the dataset." };
  }

  if (/\b(poem|story|weather|capital|recipe|joke|movie|sports|song)\b/i.test(normalized)) {
    return { inDomain: false, reason: "Message is clearly outside the assignment domain." };
  }

  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Use flash model for domain classification (simple task, high throughput)
    const { result } = await flashGenerateObject(
      z.object({
        inDomain: z.boolean(),
        reason: z.string(),
      }),
      `
Decide whether this user message can be answered from the SAP order-to-cash dataset.
Return inDomain=false if the question asks for information that is not available in the supported views, even if it mentions customers, products, plants, or orders.
In-domain topics include customer/product/plant master data, sales orders, sales order items, deliveries, billing documents, billing items, AR journal entries, AR payments, graph entities, and curated O2C flow analytics.
Out-of-domain examples include ${UNSUPPORTED_TOPIC_HINTS.join(", ")}.

Supported semantic layer:
${formatSemanticCatalogForPrompt()}

Key relationships:
${formatSemanticRelationshipsForPrompt()}

Matched entities:
${entityHints.length > 0 ? entityHints.join("\n") : "none"}

Message: ${message}
      `.trim(),
    );

    return result.object;
  }

  return { inDomain: false, reason: "No domain signals were found." };
}

async function generateSqlPlan(message: string, focusNodeIds: string[], entityHints: string[]) {
  return generateSqlPlanWithPrompt(buildPlannerPrompt(message, focusNodeIds, entityHints));
}

async function repairSqlPlan(
  message: string,
  focusNodeIds: string[],
  entityHints: string[],
  previousSql: string,
  error: unknown,
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const prompt = `
The previous SQL plan for this SAP order-to-cash dataset failed validation or execution.
Rewrite it into a safe Postgres query that follows all rules below.

Rules:
- Query only from the allowlisted semantic views below
- Never query raw tables
- Never use SELECT *
- Use count(1) instead of count(*)
- Use exactly one read-only SELECT or CTE-backed SELECT statement
- Include LIMIT <= ${SQL_LIMIT_FALLBACK}
- Use only allowlisted columns

Supported semantic layer:
${formatSemanticCatalogForPrompt()}

Key relationships:
${formatSemanticRelationshipsForPrompt()}

Matched entities:
${entityHints.length > 0 ? entityHints.join("\n") : "none"}

Focused nodes: ${focusNodeIds.length > 0 ? focusNodeIds.join(", ") : "none"}
Question: ${message}
Previous SQL:
${previousSql}
Failure:
${errorMessage}
  `.trim();

  return generateSqlPlanWithPrompt(prompt);
}

async function generateSqlPlanWithPrompt(prompt: string) {
  // Use orchestrated generation for SQL planning
  // This is a moderate complexity task - start with flash, allow escalation to pro if needed
  const orchestrated = await orchestratedGenerateObject(
    {
      schema: plannerSchema,
      prompt,
      orchestration: {
        preferredTier: "flash",
        allowEscalation: true,
        taskComplexity: "moderate",
      },
    },
    { maxRetriesPerModel: 1 },
  );

  const escalationNote = orchestrated.escalated ? " (escalated to pro tier)" : "";
  return {
    sql: prepareGeneratedSql(orchestrated.result.object.sql),
    rationale: `${orchestrated.result.object.rationale} Planned with ${orchestrated.modelUsed}${escalationNote}.`,
  };
}

function buildPlannerPrompt(message: string, focusNodeIds: string[], entityHints: string[]) {
  return `
You translate natural language questions about a fixed SAP order-to-cash dataset into safe Postgres SQL.

Rules:
- Query only from the allowlisted semantic views below
- Never query raw tables
- Never use SELECT *
- Use count(1) instead of count(*)
- Use only one statement
- Use only read-only SELECT or CTE-backed SELECT
- Always include LIMIT <= ${SQL_LIMIT_FALLBACK}
- Use only columns listed in the semantic layer
- Prefer the curated views v_o2c_flow_item and v_billing_trace for end-to-end flow questions
- Prefer entity views like v_customers, v_products, v_sales_orders, v_plants, and v_payments_ar for specific detail lookups
- Prefer direct equality filters for ids and exact entity names when available
- If the question asks for a value plus its unit, return both columns

Supported semantic layer:
${formatSemanticCatalogForPrompt()}

Key relationships:
${formatSemanticRelationshipsForPrompt()}

Matched entities:
${entityHints.length > 0 ? entityHints.join("\n") : "none"}

Focused nodes: ${focusNodeIds.length > 0 ? focusNodeIds.join(", ") : "none"}
Question: ${message}
  `.trim();
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
    case "product_gross_weight_lookup": {
      const first = rows[0];
      if (first.gross_weight == null || !first.weight_unit) {
        return "Gross weight information is not available in the dataset for that product.";
      }
      return `${first.gross_weight} ${first.weight_unit}`;
    }
    case "product_net_weight_lookup": {
      const first = rows[0];
      if (first.net_weight == null || !first.weight_unit) {
        return "Net weight information is not available in the dataset for that product.";
      }
      return `${first.net_weight} ${first.weight_unit}`;
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

function buildDirectAnswer(rows: Array<Record<string, unknown>>) {
  if (rows.length !== 1) {
    return null;
  }

  const entries = Object.entries(rows[0]).filter(([, value]) => value != null);
  if (entries.length === 0) {
    return null;
  }

  if (entries.length === 1) {
    return `The answer is ${formatAnswerValue(entries[0][1])}.`;
  }

  const unitEntry = entries.find(([key]) => /(?:_unit|currency)$/i.test(key));
  const measureEntry = entries.find(([key]) => /(?:weight|amount|quantity|value)$/i.test(key));

  if (measureEntry && unitEntry) {
    return `The answer is ${formatAnswerValue(measureEntry[1])} ${formatAnswerValue(unitEntry[1])}.`;
  }

  const nonDescriptorEntries = entries.filter(
    ([key]) => !/(?:_id|_name|description|label|subtitle)$/i.test(key),
  );
  if (nonDescriptorEntries.length === 1) {
    return `The answer is ${formatAnswerValue(nonDescriptorEntries[0][1])}.`;
  }

  return null;
}

function resolveEntityHints(message: string, dataset: NormalizedDataset) {
  const normalized = message.toLowerCase();
  const hints = new Set<string>();

  for (const customer of dataset.customers) {
    if (
      normalized.includes(customer.customerId.toLowerCase()) ||
      normalized.includes(customer.businessPartnerName.toLowerCase()) ||
      normalized.includes(customer.businessPartnerFullName.toLowerCase())
    ) {
      hints.add(`customer ${customer.customerId} = ${customer.businessPartnerName}`);
    }
  }

  for (const product of dataset.products) {
    if (
      normalized.includes(product.productId.toLowerCase()) ||
      normalized.includes(product.productDescription.toLowerCase()) ||
      (product.productOldId && normalized.includes(product.productOldId.toLowerCase()))
    ) {
      hints.add(`product ${product.productId} = ${product.productDescription}`);
    }
  }

  for (const plant of dataset.plants) {
    if (normalized.includes(plant.plantId.toLowerCase()) || normalized.includes(plant.plantName.toLowerCase())) {
      hints.add(`plant ${plant.plantId} = ${plant.plantName}`);
    }
  }

  for (const order of dataset.salesOrders) {
    if (normalized.includes(order.salesOrderId.toLowerCase())) {
      hints.add(`sales order ${order.salesOrderId} customer ${order.soldToParty}`);
    }
  }

  for (const billingDocument of dataset.billingDocuments) {
    if (normalized.includes(billingDocument.billingDocumentId.toLowerCase())) {
      hints.add(`billing document ${billingDocument.billingDocumentId}`);
    }
  }

  for (const payment of dataset.payments) {
    if (normalized.includes(payment.accountingDocumentId.toLowerCase())) {
      hints.add(`payment accounting document ${payment.accountingDocumentId}`);
    }
  }

  return [...hints].slice(0, 10);
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

function formatAnswerValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatAnswerValue(item)).join(", ");
  }

  return String(value);
}
