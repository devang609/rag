import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  addresses,
  billingDocuments,
  billingItems,
  customerCompanyAssignments,
  customers,
  customerSalesAreaAssignments,
  deliveries,
  deliveryItems,
  graphEdges,
  graphNodes,
  journalEntries,
  payments,
  plants,
  productPlants,
  products,
  productStorageLocations,
  salesOrderItems,
  salesOrders,
} from "@/db/schema";
import { analyticalViewStatements } from "@/db/views";
import { type NormalizedDataset } from "@/lib/o2c/dataset";

export async function seedDatabase(dataset: NormalizedDataset): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.delete(graphEdges);
    await tx.delete(graphNodes);
    await tx.delete(productStorageLocations);
    await tx.delete(productPlants);
    await tx.delete(customerSalesAreaAssignments);
    await tx.delete(customerCompanyAssignments);
    await tx.delete(payments);
    await tx.delete(journalEntries);
    await tx.delete(billingItems);
    await tx.delete(billingDocuments);
    await tx.delete(deliveryItems);
    await tx.delete(deliveries);
    await tx.delete(salesOrderItems);
    await tx.delete(salesOrders);
    await tx.delete(plants);
    await tx.delete(products);
    await tx.delete(addresses);
    await tx.delete(customers);

    await insertChunked(tx, customers, dataset.customers.map((row) => ({ ...row, creationDate: toDate(row.creationDate) })));
    await insertChunked(tx, addresses, dataset.addresses);
    await insertChunked(tx, products, dataset.products);
    await insertChunked(tx, plants, dataset.plants);
    await insertChunked(tx, salesOrders, dataset.salesOrders.map((row) => ({
      ...row,
      creationDate: toDate(row.creationDate),
      requestedDeliveryDate: toDate(row.requestedDeliveryDate),
    })));
    await insertChunked(tx, salesOrderItems, dataset.salesOrderItems);
    await insertChunked(tx, deliveries, dataset.deliveries.map((row) => ({ ...row, creationDate: toDate(row.creationDate) })));
    await insertChunked(tx, deliveryItems, dataset.deliveryItems);
    await insertChunked(tx, billingDocuments, dataset.billingDocuments.map((row) => ({
      ...row,
      billingDocumentDate: toDate(row.billingDocumentDate),
      creationDate: toDate(row.creationDate),
    })));
    await insertChunked(tx, billingItems, dataset.billingItems);
    await insertChunked(tx, journalEntries, dataset.journalEntries.map((row) => ({
      ...row,
      postingDate: toDate(row.postingDate),
      documentDate: toDate(row.documentDate),
      clearingDate: toDate(row.clearingDate),
    })));
    await insertChunked(tx, payments, dataset.payments.map((row) => ({
      ...row,
      postingDate: toDate(row.postingDate),
      documentDate: toDate(row.documentDate),
      clearingDate: toDate(row.clearingDate),
    })));
    await insertChunked(tx, customerCompanyAssignments, dataset.customerCompanyAssignments.map((row) => ({
      customerId: row.ownerId,
      companyCode: row.scopeId,
      metadata: row.metadata,
    })));
    await insertChunked(tx, customerSalesAreaAssignments, dataset.customerSalesAreaAssignments.map((row) => ({
      customerId: row.ownerId,
      salesAreaKey: row.scopeId,
      metadata: row.metadata,
    })));
    await insertChunked(tx, productPlants, dataset.productPlants.map((row) => ({
      productId: row.ownerId,
      plantId: row.scopeId,
      metadata: row.metadata,
    })));
    await insertChunked(tx, productStorageLocations, dataset.productStorageLocations.map((row) => ({
      productId: row.ownerId,
      plantStorageLocationKey: row.scopeId,
      metadata: row.metadata,
    })));
    await insertChunked(tx, graphNodes, dataset.graphNodes);
    await insertChunked(tx, graphEdges, dataset.graphEdges);
  });

  for (const statement of analyticalViewStatements) {
    await db.execute(sql.raw(statement));
  }
}

async function insertChunked<TTable, TValue>(
  tx: { insert: (table: TTable) => { values: (rows: TValue[]) => Promise<unknown> } },
  table: TTable,
  values: TValue[],
  chunkSize = 500,
) {
  for (let index = 0; index < values.length; index += chunkSize) {
    await tx.insert(table).values(values.slice(index, index + chunkSize));
  }
}

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}
