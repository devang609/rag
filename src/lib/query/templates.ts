import { type NormalizedDataset } from "@/lib/o2c/dataset";

export type TemplateQueryKind =
  | "top_products_by_billing_docs"
  | "trace_billing_document"
  | "incomplete_sales_orders"
  | "customer_growth"
  | "blocked_customer_percentage"
  | "product_gross_weight_lookup"
  | "product_net_weight_lookup";

export interface TemplatePlan {
  kind: TemplateQueryKind;
  sql: string;
  execute: (dataset: NormalizedDataset) => Array<Record<string, unknown>>;
}

const BILLING_TRACE_ID_PATTERN = /\b\d{8}\b/;

export function planTemplateQuery(message: string, dataset: NormalizedDataset): TemplatePlan | null {
  const normalized = message.toLowerCase();
  const matchedCustomer = matchCustomer(normalized, dataset);
  const matchedProduct = matchProduct(normalized, dataset);

  if (
    (normalized.includes("highest") || normalized.includes("most")) &&
    normalized.includes("product") &&
    (normalized.includes("billing") || normalized.includes("invoice"))
  ) {
    return {
      kind: "top_products_by_billing_docs",
      sql: `
select
  product_id,
  product_description,
  count(distinct billing_document_id) as billing_document_count
from v_billing_trace
where billing_document_id is not null
group by product_id, product_description
order by count(distinct billing_document_id) desc, product_id asc
limit 10
      `.trim(),
      execute: (dataset) => {
        const grouped = new Map<string, { product_description: string; docs: Set<string> }>();

        for (const row of dataset.billingTrace) {
          if (!row.productId) {
            continue;
          }

          const bucket = grouped.get(row.productId) ?? {
            product_description: row.productDescription,
            docs: new Set<string>(),
          };

          bucket.docs.add(row.billingDocumentId);
          grouped.set(row.productId, bucket);
        }

        return [...grouped.entries()]
          .map(([productId, value]) => ({
            product_id: productId,
            product_description: value.product_description,
            billing_document_count: value.docs.size,
          }))
          .sort(
            (left, right) =>
              Number(right.billing_document_count) - Number(left.billing_document_count) ||
              String(left.product_id).localeCompare(String(right.product_id)),
          )
          .slice(0, 10);
      },
    };
  }

  if ((normalized.includes("trace") || normalized.includes("flow")) && normalized.includes("billing")) {
    const billingDocumentId = normalized.match(BILLING_TRACE_ID_PATTERN)?.[0];
    if (!billingDocumentId) {
      return null;
    }

    return {
      kind: "trace_billing_document",
      sql: `
select
  billing_document_id,
  billing_document_item_id,
  sales_order_id,
  sales_order_item_id,
  delivery_document_id,
  delivery_document_item_id,
  accounting_document_id,
  customer_id,
  customer_name,
  product_id,
  product_description,
  billing_document_is_cancelled,
  journal_entry_count,
  payment_count,
  payment_clearing_documents,
  flow_status
from v_billing_trace
where billing_document_id = '${billingDocumentId}'
order by billing_document_item_id asc
limit 20
      `.trim(),
      execute: (dataset) =>
        dataset.billingTrace
          .filter((row) => row.billingDocumentId === billingDocumentId)
          .map((row) => ({
            billing_document_id: row.billingDocumentId,
            billing_document_item_id: row.billingDocumentItemId,
            sales_order_id: row.salesOrderId,
            sales_order_item_id: row.salesOrderItemId,
            delivery_document_id: row.deliveryDocumentId,
            delivery_document_item_id: row.deliveryDocumentItemId,
            accounting_document_id: row.accountingDocumentId,
            customer_id: row.customerId,
            customer_name: row.customerName,
            product_id: row.productId,
            product_description: row.productDescription,
            billing_document_is_cancelled: row.billingDocumentIsCancelled,
            journal_entry_count: row.journalEntryCount,
            payment_count: row.paymentCount,
            payment_clearing_documents: row.paymentClearingDocuments,
            flow_status: row.flowStatus,
          })),
    };
  }

  if (
    normalized.includes("broken") ||
    normalized.includes("incomplete") ||
    (normalized.includes("delivered") && normalized.includes("billed")) ||
    normalized.includes("flow")
  ) {
    return {
      kind: "incomplete_sales_orders",
      sql: `
select
  sales_order_id,
  customer_name,
  min(flow_status) as flow_status,
  count(1) as affected_item_count
from v_o2c_flow_item
where flow_status <> 'complete'
group by sales_order_id, customer_name
order by sales_order_id asc
limit 50
      `.trim(),
      execute: (dataset) => {
        const grouped = new Map<
          string,
          { customer_name: string; flow_statuses: string[]; affected_item_count: number }
        >();

        for (const row of dataset.o2cFlowItems) {
          if (row.flowStatus === "complete") {
            continue;
          }

          const bucket = grouped.get(row.salesOrderId) ?? {
            customer_name: row.customerName,
            flow_statuses: [],
            affected_item_count: 0,
          };

          bucket.flow_statuses.push(row.flowStatus);
          bucket.affected_item_count += 1;
          grouped.set(row.salesOrderId, bucket);
        }

        return [...grouped.entries()]
          .map(([salesOrderId, value]) => ({
            sales_order_id: salesOrderId,
            customer_name: value.customer_name,
            flow_status: prioritizeStatus(value.flow_statuses),
            affected_item_count: value.affected_item_count,
          }))
          .sort((left, right) => String(left.sales_order_id).localeCompare(String(right.sales_order_id)))
          .slice(0, 50);
      },
    };
  }

  if (
    normalized.includes("customer") &&
    normalized.includes("block") &&
    (normalized.includes("percentage") || normalized.includes("percent"))
  ) {
    return {
      kind: "blocked_customer_percentage",
      sql: `
select
  count(1)::int as total_customer_count,
  count(1) filter (where business_partner_is_blocked)::int as blocked_customer_count,
  count(1) filter (where not business_partner_is_blocked)::int as active_customer_count,
  round((100.0 * count(1) filter (where business_partner_is_blocked) / nullif(count(1), 0))::numeric, 2)::float8 as blocked_percentage,
  array_remove(array_agg(case when business_partner_is_blocked then customer_id end), null) as blocked_customer_ids,
  array_remove(array_agg(case when not business_partner_is_blocked then customer_id end), null) as active_customer_ids
from v_customer_status
limit 1
      `.trim(),
      execute: (currentDataset) => {
        const blockedCustomerIds = currentDataset.customers
          .filter((customer) => customer.businessPartnerIsBlocked)
          .map((customer) => customer.customerId)
          .sort((left, right) => left.localeCompare(right));
        const activeCustomerIds = currentDataset.customers
          .filter((customer) => !customer.businessPartnerIsBlocked)
          .map((customer) => customer.customerId)
          .sort((left, right) => left.localeCompare(right));
        const totalCustomerCount = currentDataset.customers.length;
        const blockedCustomerCount = blockedCustomerIds.length;
        const activeCustomerCount = activeCustomerIds.length;
        const blockedPercentage = totalCustomerCount === 0 ? 0 : (blockedCustomerCount / totalCustomerCount) * 100;

        return [
          {
            total_customer_count: totalCustomerCount,
            blocked_customer_count: blockedCustomerCount,
            active_customer_count: activeCustomerCount,
            blocked_percentage: Number(blockedPercentage.toFixed(2)),
            blocked_customer_ids: blockedCustomerIds,
            active_customer_ids: activeCustomerIds,
          },
        ];
      },
    };
  }

  if (
    matchedCustomer &&
    (normalized.includes("growth") || normalized.includes("trend") || normalized.includes("track"))
  ) {
    const escapedCustomerName = matchedCustomer.businessPartnerName.replace(/'/g, "''");

    return {
      kind: "customer_growth",
      sql: `
select
  customer_id,
  customer_name,
  to_char(order_date, 'YYYY-MM-DD') as order_date,
  order_year,
  order_month,
  sales_order_count,
  sales_order_item_count,
  total_order_amount,
  delivered_item_count,
  billed_item_count,
  posted_item_count,
  paid_item_count
from v_customer_growth
where customer_name = '${escapedCustomerName}'
order by order_date asc
limit 60
      `.trim(),
      execute: (currentDataset) => {
        const matchingOrders = currentDataset.salesOrders.filter(
          (order) => order.soldToParty === matchedCustomer.customerId,
        );
        const orderItemIdsByDate = new Map<string, Set<string>>();
        const orderIdsByDate = new Map<string, Set<string>>();
        const deliveredItemIdsByDate = new Map<string, Set<string>>();
        const billedItemIdsByDate = new Map<string, Set<string>>();
        const postedItemIdsByDate = new Map<string, Set<string>>();
        const paidItemIdsByDate = new Map<string, Set<string>>();
        const amountByDate = new Map<string, number>();

        for (const order of matchingOrders) {
          const orderDate = order.creationDate?.slice(0, 10);
          if (!orderDate) {
            continue;
          }

          const orderIds = orderIdsByDate.get(orderDate) ?? new Set<string>();
          orderIds.add(order.salesOrderId);
          orderIdsByDate.set(orderDate, orderIds);
        }

        for (const row of currentDataset.o2cFlowItems.filter((item) => item.customerId === matchedCustomer.customerId)) {
          const order = matchingOrders.find((candidate) => candidate.salesOrderId === row.salesOrderId);
          const orderDate = order?.creationDate?.slice(0, 10);
          if (!orderDate) {
            continue;
          }

          const itemKey = `${row.salesOrderId}:${row.salesOrderItemId}`;
          const itemIds = orderItemIdsByDate.get(orderDate) ?? new Set<string>();
          itemIds.add(itemKey);
          orderItemIdsByDate.set(orderDate, itemIds);
          amountByDate.set(orderDate, (amountByDate.get(orderDate) ?? 0) + row.orderNetAmount);

          if (row.deliveryCount > 0) {
            const deliveredIds = deliveredItemIdsByDate.get(orderDate) ?? new Set<string>();
            deliveredIds.add(itemKey);
            deliveredItemIdsByDate.set(orderDate, deliveredIds);
          }
          if (row.billingDocumentCount > 0) {
            const billedIds = billedItemIdsByDate.get(orderDate) ?? new Set<string>();
            billedIds.add(itemKey);
            billedItemIdsByDate.set(orderDate, billedIds);
          }
          if (row.accountingDocumentId) {
            const postedIds = postedItemIdsByDate.get(orderDate) ?? new Set<string>();
            postedIds.add(itemKey);
            postedItemIdsByDate.set(orderDate, postedIds);
          }
          if (row.paymentCount > 0) {
            const paidIds = paidItemIdsByDate.get(orderDate) ?? new Set<string>();
            paidIds.add(itemKey);
            paidItemIdsByDate.set(orderDate, paidIds);
          }
        }

        return [...orderIdsByDate.keys()]
          .sort((left, right) => left.localeCompare(right))
          .map((orderDate) => {
            const [year, month] = orderDate.split("-").map(Number);
            return {
              customer_id: matchedCustomer.customerId,
              customer_name: matchedCustomer.businessPartnerName,
              order_date: orderDate,
              order_year: year,
              order_month: month,
              sales_order_count: orderIdsByDate.get(orderDate)?.size ?? 0,
              sales_order_item_count: orderItemIdsByDate.get(orderDate)?.size ?? 0,
              total_order_amount: Number((amountByDate.get(orderDate) ?? 0).toFixed(2)),
              delivered_item_count: deliveredItemIdsByDate.get(orderDate)?.size ?? 0,
              billed_item_count: billedItemIdsByDate.get(orderDate)?.size ?? 0,
              posted_item_count: postedItemIdsByDate.get(orderDate)?.size ?? 0,
              paid_item_count: paidItemIdsByDate.get(orderDate)?.size ?? 0,
            };
          });
      },
    };
  }

  if (matchedProduct && normalized.includes("gross weight")) {
    return {
      kind: "product_gross_weight_lookup",
      sql: `
select
  product_id,
  product_description,
  gross_weight,
  weight_unit
from v_product_details
where product_id = '${matchedProduct.productId}'
limit 1
      `.trim(),
      execute: () => [
        {
          product_id: matchedProduct.productId,
          product_description: matchedProduct.productDescription,
          gross_weight: matchedProduct.grossWeight,
          weight_unit: matchedProduct.weightUnit,
        },
      ],
    };
  }

  if (matchedProduct && normalized.includes("net weight")) {
    return {
      kind: "product_net_weight_lookup",
      sql: `
select
  product_id,
  product_description,
  net_weight,
  weight_unit
from v_product_details
where product_id = '${matchedProduct.productId}'
limit 1
      `.trim(),
      execute: () => [
        {
          product_id: matchedProduct.productId,
          product_description: matchedProduct.productDescription,
          net_weight: matchedProduct.netWeight,
          weight_unit: matchedProduct.weightUnit,
        },
      ],
    };
  }

  return null;
}

function prioritizeStatus(statuses: string[]): string {
  const priority = new Map([
    ["delivered_not_billed", 4],
    ["billed_not_posted", 3],
    ["posted_not_cleared", 2],
    ["ordered_not_delivered", 1],
  ]);

  return [...statuses].sort((left, right) => (priority.get(right) ?? 0) - (priority.get(left) ?? 0))[0] ?? "unknown";
}

function matchCustomer(normalizedMessage: string, dataset: NormalizedDataset) {
  return dataset.customers.find((customer) => {
    const shortName = customer.businessPartnerName.toLowerCase();
    const fullName = customer.businessPartnerFullName.toLowerCase();
    return normalizedMessage.includes(shortName) || normalizedMessage.includes(fullName);
  });
}

function matchProduct(normalizedMessage: string, dataset: NormalizedDataset) {
  return dataset.products.find((product) => {
    const productId = product.productId.toLowerCase();
    const productDescription = product.productDescription.toLowerCase();
    const oldId = product.productOldId?.toLowerCase() ?? "";

    return (
      normalizedMessage.includes(productId) ||
      normalizedMessage.includes(productDescription) ||
      (oldId.length > 0 && normalizedMessage.includes(oldId))
    );
  });
}
