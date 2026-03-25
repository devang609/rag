import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  customerId: text("customer_id").primaryKey(),
  businessPartnerCategory: text("business_partner_category"),
  businessPartnerGrouping: text("business_partner_grouping"),
  businessPartnerName: text("business_partner_name").notNull(),
  businessPartnerFullName: text("business_partner_full_name").notNull(),
  businessPartnerIsBlocked: boolean("business_partner_is_blocked").notNull().default(false),
  creationDate: timestamp("creation_date", { withTimezone: true }),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const addresses = pgTable("addresses", {
  addressId: text("address_id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.customerId, { onDelete: "cascade" }),
  cityName: text("city_name"),
  country: text("country"),
  postalCode: text("postal_code"),
  region: text("region"),
  streetName: text("street_name"),
  addressTimeZone: text("address_time_zone"),
});

export const products = pgTable("products", {
  productId: text("product_id").primaryKey(),
  productType: text("product_type"),
  productOldId: text("product_old_id"),
  productGroup: text("product_group"),
  baseUnit: text("base_unit"),
  division: text("division"),
  grossWeight: doublePrecision("gross_weight"),
  netWeight: doublePrecision("net_weight"),
  weightUnit: text("weight_unit"),
  productDescription: text("product_description").notNull(),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const plants = pgTable("plants", {
  plantId: text("plant_id").primaryKey(),
  plantName: text("plant_name").notNull(),
  valuationArea: text("valuation_area"),
  salesOrganization: text("sales_organization"),
  addressId: text("address_id"),
  distributionChannel: text("distribution_channel"),
  division: text("division"),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const salesOrders = pgTable("sales_orders", {
  salesOrderId: text("sales_order_id").primaryKey(),
  soldToParty: text("sold_to_party")
    .notNull()
    .references(() => customers.customerId),
  creationDate: timestamp("creation_date", { withTimezone: true }),
  requestedDeliveryDate: timestamp("requested_delivery_date", { withTimezone: true }),
  totalNetAmount: doublePrecision("total_net_amount").notNull(),
  transactionCurrency: text("transaction_currency"),
  overallDeliveryStatus: text("overall_delivery_status"),
  overallBillingStatus: text("overall_billing_status"),
  salesOrderType: text("sales_order_type"),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const salesOrderItems = pgTable(
  "sales_order_items",
  {
    salesOrderId: text("sales_order_id")
      .notNull()
      .references(() => salesOrders.salesOrderId, { onDelete: "cascade" }),
    salesOrderItemId: text("sales_order_item_id").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.productId),
    requestedQuantity: doublePrecision("requested_quantity").notNull(),
    requestedQuantityUnit: text("requested_quantity_unit"),
    transactionCurrency: text("transaction_currency"),
    netAmount: doublePrecision("net_amount").notNull(),
    productionPlantId: text("production_plant_id"),
    storageLocation: text("storage_location"),
    materialGroup: text("material_group"),
    salesOrderItemCategory: text("sales_order_item_category"),
    sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.salesOrderId, table.salesOrderItemId] }),
  }),
);

export const deliveries = pgTable("deliveries", {
  deliveryDocumentId: text("delivery_document_id").primaryKey(),
  creationDate: timestamp("creation_date", { withTimezone: true }),
  shippingPoint: text("shipping_point"),
  overallGoodsMovementStatus: text("overall_goods_movement_status"),
  overallPickingStatus: text("overall_picking_status"),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const deliveryItems = pgTable(
  "delivery_items",
  {
    deliveryDocumentId: text("delivery_document_id")
      .notNull()
      .references(() => deliveries.deliveryDocumentId, { onDelete: "cascade" }),
    deliveryDocumentItemId: text("delivery_document_item_id").notNull(),
    plantId: text("plant_id"),
    storageLocation: text("storage_location"),
    actualDeliveryQuantity: doublePrecision("actual_delivery_quantity"),
    deliveryQuantityUnit: text("delivery_quantity_unit"),
    referenceSalesOrderId: text("reference_sales_order_id").notNull(),
    referenceSalesOrderItemId: text("reference_sales_order_item_id").notNull(),
    sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.deliveryDocumentId, table.deliveryDocumentItemId] }),
  }),
);

export const billingDocuments = pgTable("billing_documents", {
  billingDocumentId: text("billing_document_id").primaryKey(),
  billingDocumentType: text("billing_document_type"),
  billingDocumentDate: timestamp("billing_document_date", { withTimezone: true }),
  billingDocumentIsCancelled: boolean("billing_document_is_cancelled").notNull().default(false),
  cancelledBillingDocument: text("cancelled_billing_document"),
  companyCode: text("company_code"),
  fiscalYear: text("fiscal_year"),
  accountingDocumentId: text("accounting_document_id"),
  soldToParty: text("sold_to_party"),
  totalNetAmount: doublePrecision("total_net_amount").notNull(),
  transactionCurrency: text("transaction_currency"),
  creationDate: timestamp("creation_date", { withTimezone: true }),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const billingItems = pgTable(
  "billing_items",
  {
    billingDocumentId: text("billing_document_id")
      .notNull()
      .references(() => billingDocuments.billingDocumentId, { onDelete: "cascade" }),
    billingDocumentItemId: text("billing_document_item_id").notNull(),
    productId: text("product_id"),
    billingQuantity: doublePrecision("billing_quantity"),
    billingQuantityUnit: text("billing_quantity_unit"),
    netAmount: doublePrecision("net_amount").notNull(),
    transactionCurrency: text("transaction_currency"),
    referenceDeliveryDocumentId: text("reference_delivery_document_id"),
    referenceDeliveryDocumentItemId: text("reference_delivery_document_item_id"),
    sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.billingDocumentId, table.billingDocumentItemId] }),
  }),
);

export const journalEntries = pgTable("journal_entries", {
  journalEntryId: text("journal_entry_id").primaryKey(),
  companyCode: text("company_code").notNull(),
  fiscalYear: text("fiscal_year").notNull(),
  accountingDocumentId: text("accounting_document_id").notNull(),
  accountingDocumentItemId: text("accounting_document_item_id").notNull(),
  referenceBillingDocumentId: text("reference_billing_document_id"),
  postingDate: timestamp("posting_date", { withTimezone: true }),
  documentDate: timestamp("document_date", { withTimezone: true }),
  customerId: text("customer_id"),
  amountInTransactionCurrency: doublePrecision("amount_in_transaction_currency").notNull(),
  transactionCurrency: text("transaction_currency"),
  clearingAccountingDocument: text("clearing_accounting_document"),
  clearingDate: timestamp("clearing_date", { withTimezone: true }),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const payments = pgTable("payments", {
  paymentId: text("payment_id").primaryKey(),
  companyCode: text("company_code").notNull(),
  fiscalYear: text("fiscal_year").notNull(),
  accountingDocumentId: text("accounting_document_id").notNull(),
  accountingDocumentItemId: text("accounting_document_item_id").notNull(),
  customerId: text("customer_id"),
  amountInTransactionCurrency: doublePrecision("amount_in_transaction_currency").notNull(),
  transactionCurrency: text("transaction_currency"),
  clearingAccountingDocument: text("clearing_accounting_document"),
  clearingDate: timestamp("clearing_date", { withTimezone: true }),
  postingDate: timestamp("posting_date", { withTimezone: true }),
  documentDate: timestamp("document_date", { withTimezone: true }),
  sourceData: jsonb("source_data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const customerCompanyAssignments = pgTable(
  "customer_company_assignments",
  {
    customerId: text("customer_id").notNull(),
    companyCode: text("company_code").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.customerId, table.companyCode] }),
  }),
);

export const customerSalesAreaAssignments = pgTable(
  "customer_sales_area_assignments",
  {
    customerId: text("customer_id").notNull(),
    salesAreaKey: text("sales_area_key").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.customerId, table.salesAreaKey] }),
  }),
);

export const productPlants = pgTable(
  "product_plants",
  {
    productId: text("product_id").notNull(),
    plantId: text("plant_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.plantId] }),
  }),
);

export const productStorageLocations = pgTable(
  "product_storage_locations",
  {
    productId: text("product_id").notNull(),
    plantStorageLocationKey: text("plant_storage_location_key").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.plantStorageLocationKey] }),
  }),
);

export const graphNodes = pgTable("graph_nodes", {
  nodeId: text("node_id").primaryKey(),
  nodeType: text("node_type").notNull(),
  entityId: text("entity_id").notNull(),
  label: text("label").notNull(),
  subtitle: text("subtitle").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const graphEdges = pgTable("graph_edges", {
  edgeId: text("edge_id").primaryKey(),
  sourceNodeId: text("source_node_id").notNull(),
  targetNodeId: text("target_node_id").notNull(),
  relation: text("relation").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const customerRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  salesOrders: many(salesOrders),
}));
