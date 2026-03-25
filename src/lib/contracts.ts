export type GraphNodeType =
  | "customer"
  | "address"
  | "product"
  | "plant"
  | "sales_order"
  | "sales_order_item"
  | "delivery"
  | "delivery_item"
  | "billing_document"
  | "billing_item"
  | "journal_entry"
  | "payment";

export type FlowStatus =
  | "ordered_not_delivered"
  | "delivered_not_billed"
  | "billed_not_posted"
  | "posted_not_cleared"
  | "complete";

export interface GraphNodeRecord {
  nodeId: string;
  nodeType: GraphNodeType;
  entityId: string;
  label: string;
  subtitle: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdgeRecord {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  metadata: Record<string, unknown>;
}

export interface EntityLookupRecord {
  nodeId: string;
  nodeType: GraphNodeType;
  entityId: string;
  label: string;
  subtitle: string;
  searchText: string;
}

export interface O2CFlowItemViewRow {
  salesOrderId: string;
  salesOrderItemId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productDescription: string;
  productionPlantId: string | null;
  storageLocation: string | null;
  requestedQuantity: number;
  orderNetAmount: number;
  currency: string | null;
  deliveryCount: number;
  firstDeliveryDocumentId: string | null;
  billingDocumentCount: number;
  firstBillingDocumentId: string | null;
  accountingDocumentId: string | null;
  paymentCount: number;
  flowStatus: FlowStatus;
}

export interface BillingTraceViewRow {
  billingDocumentId: string;
  billingDocumentItemId: string;
  billingDocumentType: string | null;
  billingDocumentDate: string | null;
  billingDocumentIsCancelled: boolean;
  companyCode: string | null;
  fiscalYear: string | null;
  accountingDocumentId: string | null;
  salesOrderId: string | null;
  salesOrderItemId: string | null;
  deliveryDocumentId: string | null;
  deliveryDocumentItemId: string | null;
  customerId: string | null;
  customerName: string;
  productId: string | null;
  productDescription: string;
  billingNetAmount: number;
  currency: string | null;
  journalEntryCount: number;
  paymentCount: number;
  paymentClearingDocuments: string[];
  flowStatus: FlowStatus;
}

export interface GraphSearchResult {
  nodeId: string;
  nodeType: GraphNodeType;
  entityId: string;
  label: string;
  subtitle: string;
  score: number;
}

export interface GraphNeighborhoodResponse {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
}

export interface QueryRequestBody {
  message: string;
  focusNodeIds?: string[];
}

export interface QueryResponseBody {
  answer: string;
  sql: string | null;
  rowsPreview: Array<Record<string, unknown>>;
  relatedNodeIds: string[];
  refusal?: string;
  diagnostics: Record<string, unknown>;
}
