import fs from "node:fs/promises";
import path from "node:path";

import {
  type BillingTraceViewRow,
  type EntityLookupRecord,
  type FlowStatus,
  type GraphEdgeRecord,
  type GraphNodeRecord,
  type GraphNodeType,
  type O2CFlowItemViewRow,
} from "@/lib/contracts";
import { getDatasetRoot } from "@/lib/env";

interface TimeValue {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

interface SalesOrderHeaderRaw {
  salesOrder: string;
  soldToParty: string;
  salesOrganization: string | null;
  distributionChannel: string | null;
  organizationDivision: string | null;
  salesGroup: string | null;
  salesOffice: string | null;
  creationDate: string | null;
  createdByUser: string | null;
  lastChangeDateTime: string | null;
  totalNetAmount: string;
  transactionCurrency: string | null;
  pricingDate: string | null;
  requestedDeliveryDate: string | null;
  overallDeliveryStatus: string | null;
  overallOrdReltdBillgStatus: string | null;
  overallSdDocReferenceStatus: string | null;
  headerBillingBlockReason: string | null;
  deliveryBlockReason: string | null;
  incotermsClassification: string | null;
  incotermsLocation1: string | null;
  customerPaymentTerms: string | null;
  totalCreditCheckStatus: string | null;
  salesOrderType: string | null;
}

interface SalesOrderItemRaw {
  salesOrder: string;
  salesOrderItem: string;
  material: string;
  requestedQuantity: string;
  requestedQuantityUnit: string | null;
  transactionCurrency: string | null;
  netAmount: string;
  productionPlant: string | null;
  storageLocation: string | null;
  materialGroup: string | null;
  salesOrderItemCategory: string | null;
  itemBillingBlockReason: string | null;
  salesDocumentRjcnReason: string | null;
}

interface DeliveryHeaderRaw {
  deliveryDocument: string;
  actualGoodsMovementDate: string | null;
  actualGoodsMovementTime: TimeValue | string | null;
  creationDate: string | null;
  creationTime: TimeValue | string | null;
  deliveryBlockReason: string | null;
  hdrGeneralIncompletionStatus: string | null;
  headerBillingBlockReason: string | null;
  lastChangeDate: string | null;
  shippingPoint: string | null;
  overallGoodsMovementStatus: string | null;
  overallPickingStatus: string | null;
  overallProofOfDeliveryStatus: string | null;
}

interface DeliveryItemRaw {
  deliveryDocument: string;
  deliveryDocumentItem: string;
  plant: string | null;
  storageLocation: string | null;
  actualDeliveryQuantity: string | null;
  deliveryQuantityUnit: string | null;
  batch: string | null;
  itemBillingBlockReason: string | null;
  lastChangeDate: string | null;
  referenceSdDocument: string;
  referenceSdDocumentItem: string;
}

interface BillingHeaderRaw {
  billingDocument: string;
  billingDocumentType: string | null;
  billingDocumentDate: string | null;
  billingDocumentIsCancelled: boolean;
  cancelledBillingDocument: string | null;
  companyCode: string | null;
  fiscalYear: string | null;
  accountingDocument: string | null;
  soldToParty: string | null;
  totalNetAmount: string;
  transactionCurrency: string | null;
  creationDate: string | null;
  creationTime: TimeValue | string | null;
  lastChangeDateTime: string | null;
}

interface BillingItemRaw {
  billingDocument: string;
  billingDocumentItem: string;
  material: string | null;
  billingQuantity: string | null;
  billingQuantityUnit: string | null;
  netAmount: string;
  transactionCurrency: string | null;
  referenceSdDocument: string | null;
  referenceSdDocumentItem: string | null;
}

interface JournalEntryRaw {
  companyCode: string;
  fiscalYear: string;
  accountingDocument: string;
  accountingDocumentItem: string;
  accountingDocumentType: string | null;
  referenceDocument: string | null;
  postingDate: string | null;
  documentDate: string | null;
  customer: string | null;
  amountInCompanyCodeCurrency: string | null;
  amountInTransactionCurrency: string;
  companyCodeCurrency: string | null;
  assignmentReference: string | null;
  transactionCurrency: string | null;
  clearingAccountingDocument: string | null;
  clearingDate: string | null;
  clearingDocFiscalYear: string | null;
  glAccount: string | null;
  financialAccountType: string | null;
  profitCenter: string | null;
  costCenter: string | null;
  lastChangeDateTime: string | null;
}

interface PaymentRaw {
  companyCode: string;
  fiscalYear: string;
  accountingDocument: string;
  accountingDocumentItem: string;
  customer: string | null;
  amountInCompanyCodeCurrency: string | null;
  amountInTransactionCurrency: string;
  companyCodeCurrency: string | null;
  assignmentReference: string | null;
  transactionCurrency: string | null;
  clearingAccountingDocument: string | null;
  clearingDate: string | null;
  clearingDocFiscalYear: string | null;
  invoiceReference: string | null;
  invoiceReferenceFiscalYear: string | null;
  salesDocument: string | null;
  salesDocumentItem: string | null;
  postingDate: string | null;
  documentDate: string | null;
  glAccount: string | null;
  financialAccountType: string | null;
  profitCenter: string | null;
  costCenter: string | null;
}

interface BusinessPartnerRaw {
  businessPartner: string;
  customer: string | null;
  businessPartnerCategory: string | null;
  businessPartnerGrouping: string | null;
  businessPartnerFullName: string | null;
  businessPartnerName: string | null;
  correspondenceLanguage: string | null;
  createdByUser: string | null;
  creationTime: TimeValue | string | null;
  firstName: string | null;
  formOfAddress: string | null;
  industry: string | null;
  lastChangeDate: string | null;
  lastName: string | null;
  organizationBpName1: string | null;
  organizationBpName2: string | null;
  businessPartnerIsBlocked: boolean;
  isMarkedForArchiving: boolean;
  creationDate: string | null;
}

interface AddressRaw {
  businessPartner: string;
  addressId: string;
  cityName: string | null;
  country: string | null;
  postalCode: string | null;
  region: string | null;
  streetName: string | null;
  addressTimeZone: string | null;
}

interface ProductRaw {
  product: string;
  productType: string | null;
  crossPlantStatus: string | null;
  crossPlantStatusValidityDate: string | null;
  creationDate: string | null;
  createdByUser: string | null;
  lastChangeDate: string | null;
  lastChangeDateTime: string | null;
  isMarkedForDeletion: boolean;
  productOldId: string | null;
  productGroup: string | null;
  baseUnit: string | null;
  division: string | null;
  industrySector: string | null;
  grossWeight: string | null;
  netWeight: string | null;
  weightUnit: string | null;
}

interface ProductDescriptionRaw {
  product: string;
  productDescription: string | null;
}

interface PlantRaw {
  plant: string;
  plantName: string | null;
  valuationArea: string | null;
  salesOrganization: string | null;
  addressId: string | null;
  defaultPurchasingOrganization: string | null;
  distributionChannel: string | null;
  division: string | null;
  factoryCalendar: string | null;
  isMarkedForArchiving: boolean;
  language: string | null;
  plantCategory: string | null;
  plantCustomer: string | null;
  plantSupplier: string | null;
}

interface CustomerCompanyAssignmentRaw {
  customer: string;
  companyCode: string;
  paymentTerms: string | null;
  reconciliationAccount: string | null;
}

interface CustomerSalesAreaAssignmentRaw {
  customer: string;
  salesOrganization: string | null;
  distributionChannel: string | null;
  division: string | null;
  customerPaymentTerms: string | null;
  shippingCondition: string | null;
}

interface ProductPlantRaw {
  product: string;
  plant: string;
  purchasingGroup: string | null;
  procurementType: string | null;
}

interface ProductStorageLocationRaw {
  product: string;
  plant: string;
  storageLocation: string;
}

export interface CustomerRecord {
  customerId: string;
  businessPartnerCategory: string | null;
  businessPartnerGrouping: string | null;
  businessPartnerName: string;
  businessPartnerFullName: string;
  businessPartnerIsBlocked: boolean;
  creationDate: string | null;
  sourceData: Record<string, unknown>;
}

export interface AddressRecord {
  addressId: string;
  customerId: string;
  cityName: string | null;
  country: string | null;
  postalCode: string | null;
  region: string | null;
  streetName: string | null;
  addressTimeZone: string | null;
}

export interface ProductRecord {
  productId: string;
  productType: string | null;
  productOldId: string | null;
  productGroup: string | null;
  baseUnit: string | null;
  division: string | null;
  grossWeight: number | null;
  netWeight: number | null;
  weightUnit: string | null;
  productDescription: string;
  sourceData: Record<string, unknown>;
}

export interface PlantRecord {
  plantId: string;
  plantName: string;
  valuationArea: string | null;
  salesOrganization: string | null;
  addressId: string | null;
  distributionChannel: string | null;
  division: string | null;
  sourceData: Record<string, unknown>;
}

export interface SalesOrderRecord {
  salesOrderId: string;
  soldToParty: string;
  creationDate: string | null;
  requestedDeliveryDate: string | null;
  totalNetAmount: number;
  transactionCurrency: string | null;
  overallDeliveryStatus: string | null;
  overallBillingStatus: string | null;
  salesOrderType: string | null;
  sourceData: Record<string, unknown>;
}

export interface SalesOrderItemRecord {
  salesOrderId: string;
  salesOrderItemId: string;
  productId: string;
  requestedQuantity: number;
  requestedQuantityUnit: string | null;
  transactionCurrency: string | null;
  netAmount: number;
  productionPlantId: string | null;
  storageLocation: string | null;
  materialGroup: string | null;
  salesOrderItemCategory: string | null;
  sourceData: Record<string, unknown>;
}

export interface DeliveryRecord {
  deliveryDocumentId: string;
  creationDate: string | null;
  shippingPoint: string | null;
  overallGoodsMovementStatus: string | null;
  overallPickingStatus: string | null;
  sourceData: Record<string, unknown>;
}

export interface DeliveryItemRecord {
  deliveryDocumentId: string;
  deliveryDocumentItemId: string;
  plantId: string | null;
  storageLocation: string | null;
  actualDeliveryQuantity: number | null;
  deliveryQuantityUnit: string | null;
  referenceSalesOrderId: string;
  referenceSalesOrderItemId: string;
  sourceData: Record<string, unknown>;
}

export interface BillingDocumentRecord {
  billingDocumentId: string;
  billingDocumentType: string | null;
  billingDocumentDate: string | null;
  billingDocumentIsCancelled: boolean;
  cancelledBillingDocument: string | null;
  companyCode: string | null;
  fiscalYear: string | null;
  accountingDocumentId: string | null;
  soldToParty: string | null;
  totalNetAmount: number;
  transactionCurrency: string | null;
  creationDate: string | null;
  sourceData: Record<string, unknown>;
}

export interface BillingItemRecord {
  billingDocumentId: string;
  billingDocumentItemId: string;
  productId: string | null;
  billingQuantity: number | null;
  billingQuantityUnit: string | null;
  netAmount: number;
  transactionCurrency: string | null;
  referenceDeliveryDocumentId: string | null;
  referenceDeliveryDocumentItemId: string | null;
  sourceData: Record<string, unknown>;
}

export interface JournalEntryRecord {
  journalEntryId: string;
  companyCode: string;
  fiscalYear: string;
  accountingDocumentId: string;
  accountingDocumentItemId: string;
  referenceBillingDocumentId: string | null;
  postingDate: string | null;
  documentDate: string | null;
  customerId: string | null;
  amountInTransactionCurrency: number;
  transactionCurrency: string | null;
  clearingAccountingDocument: string | null;
  clearingDate: string | null;
  sourceData: Record<string, unknown>;
}

export interface PaymentRecord {
  paymentId: string;
  companyCode: string;
  fiscalYear: string;
  accountingDocumentId: string;
  accountingDocumentItemId: string;
  customerId: string | null;
  amountInTransactionCurrency: number;
  transactionCurrency: string | null;
  clearingAccountingDocument: string | null;
  clearingDate: string | null;
  postingDate: string | null;
  documentDate: string | null;
  sourceData: Record<string, unknown>;
}

export interface LookupAssignmentRecord {
  ownerId: string;
  scopeId: string;
  metadata: Record<string, unknown>;
}

export interface NormalizedDataset {
  customers: CustomerRecord[];
  addresses: AddressRecord[];
  products: ProductRecord[];
  plants: PlantRecord[];
  salesOrders: SalesOrderRecord[];
  salesOrderItems: SalesOrderItemRecord[];
  deliveries: DeliveryRecord[];
  deliveryItems: DeliveryItemRecord[];
  billingDocuments: BillingDocumentRecord[];
  billingItems: BillingItemRecord[];
  journalEntries: JournalEntryRecord[];
  payments: PaymentRecord[];
  customerCompanyAssignments: LookupAssignmentRecord[];
  customerSalesAreaAssignments: LookupAssignmentRecord[];
  productPlants: LookupAssignmentRecord[];
  productStorageLocations: LookupAssignmentRecord[];
  graphNodes: GraphNodeRecord[];
  graphEdges: GraphEdgeRecord[];
  entityLookup: EntityLookupRecord[];
  o2cFlowItems: O2CFlowItemViewRow[];
  billingTrace: BillingTraceViewRow[];
}

const datasetCache = new Map<string, Promise<NormalizedDataset>>();

export async function loadNormalizedDataset(datasetRoot = getDatasetRoot()): Promise<NormalizedDataset> {
  const resolvedRoot = path.resolve(datasetRoot);

  if (!datasetCache.has(resolvedRoot)) {
    datasetCache.set(resolvedRoot, buildNormalizedDataset(resolvedRoot));
  }

  return datasetCache.get(resolvedRoot)!;
}

async function buildNormalizedDataset(datasetRoot: string): Promise<NormalizedDataset> {
  const [
    salesOrderHeaders,
    salesOrderItemsRaw,
    deliveryHeaders,
    deliveryItemsRaw,
    billingHeaders,
    billingCancellations,
    billingItemsRaw,
    journalEntriesRaw,
    paymentsRaw,
    businessPartners,
    addressesRaw,
    productsRaw,
    productDescriptions,
    plantsRaw,
    customerCompanyAssignmentsRaw,
    customerSalesAreaAssignmentsRaw,
    productPlantsRaw,
    productStorageLocationsRaw,
  ] = await Promise.all([
    readJsonlDirectory<SalesOrderHeaderRaw>(datasetRoot, "sales_order_headers"),
    readJsonlDirectory<SalesOrderItemRaw>(datasetRoot, "sales_order_items"),
    readJsonlDirectory<DeliveryHeaderRaw>(datasetRoot, "outbound_delivery_headers"),
    readJsonlDirectory<DeliveryItemRaw>(datasetRoot, "outbound_delivery_items"),
    readJsonlDirectory<BillingHeaderRaw>(datasetRoot, "billing_document_headers"),
    readJsonlDirectory<BillingHeaderRaw>(datasetRoot, "billing_document_cancellations"),
    readJsonlDirectory<BillingItemRaw>(datasetRoot, "billing_document_items"),
    readJsonlDirectory<JournalEntryRaw>(datasetRoot, "journal_entry_items_accounts_receivable"),
    readJsonlDirectory<PaymentRaw>(datasetRoot, "payments_accounts_receivable"),
    readJsonlDirectory<BusinessPartnerRaw>(datasetRoot, "business_partners"),
    readJsonlDirectory<AddressRaw>(datasetRoot, "business_partner_addresses"),
    readJsonlDirectory<ProductRaw>(datasetRoot, "products"),
    readJsonlDirectory<ProductDescriptionRaw>(datasetRoot, "product_descriptions"),
    readJsonlDirectory<PlantRaw>(datasetRoot, "plants"),
    readJsonlDirectory<CustomerCompanyAssignmentRaw>(datasetRoot, "customer_company_assignments"),
    readJsonlDirectory<CustomerSalesAreaAssignmentRaw>(datasetRoot, "customer_sales_area_assignments"),
    readJsonlDirectory<ProductPlantRaw>(datasetRoot, "product_plants"),
    readJsonlDirectory<ProductStorageLocationRaw>(datasetRoot, "product_storage_locations"),
  ]);

  const productDescriptionsById = new Map<string, string>();
  for (const description of productDescriptions) {
    if (description.productDescription) {
      productDescriptionsById.set(description.product, description.productDescription);
    }
  }

  const customerNamesById = new Map<string, string>();
  const customers = businessPartners.map<CustomerRecord>((partner) => {
    const customerId = normalizeString(partner.customer) ?? partner.businessPartner;
    const businessPartnerName =
      normalizeString(partner.businessPartnerName) ??
      normalizeString(partner.organizationBpName1) ??
      normalizeString(partner.businessPartnerFullName) ??
      partner.businessPartner;

    const businessPartnerFullName =
      normalizeString(partner.businessPartnerFullName) ??
      normalizeString(partner.organizationBpName1) ??
      businessPartnerName;

    customerNamesById.set(customerId, businessPartnerName);

    return {
      customerId,
      businessPartnerCategory: normalizeString(partner.businessPartnerCategory),
      businessPartnerGrouping: normalizeString(partner.businessPartnerGrouping),
      businessPartnerName,
      businessPartnerFullName,
      businessPartnerIsBlocked: Boolean(partner.businessPartnerIsBlocked),
      creationDate: normalizeString(partner.creationDate),
      sourceData: {
        businessPartnerId: partner.businessPartner,
        rawCustomerId: normalizeString(partner.customer) ?? partner.businessPartner,
        correspondenceLanguage: normalizeString(partner.correspondenceLanguage),
        createdByUser: normalizeString(partner.createdByUser),
        creationTime: formatTimeValue(partner.creationTime),
        firstName: normalizeString(partner.firstName),
        formOfAddress: normalizeString(partner.formOfAddress),
        industry: normalizeString(partner.industry),
        isMarkedForArchiving: Boolean(partner.isMarkedForArchiving),
        lastChangeDate: normalizeString(partner.lastChangeDate),
        lastName: normalizeString(partner.lastName),
        organizationBpName1: normalizeString(partner.organizationBpName1),
        organizationBpName2: normalizeString(partner.organizationBpName2),
      },
    };
  });

  const addresses = addressesRaw.map<AddressRecord>((address) => ({
    addressId: address.addressId,
    customerId: address.businessPartner,
    cityName: normalizeString(address.cityName),
    country: normalizeString(address.country),
    postalCode: normalizeString(address.postalCode),
    region: normalizeString(address.region),
    streetName: normalizeString(address.streetName),
    addressTimeZone: normalizeString(address.addressTimeZone),
  }));

  const products = productsRaw.map<ProductRecord>((product) => ({
    productId: product.product,
    productType: normalizeString(product.productType),
    productOldId: normalizeString(product.productOldId),
    productGroup: normalizeString(product.productGroup),
    baseUnit: normalizeString(product.baseUnit),
    division: normalizeString(product.division),
    grossWeight: parseNullableNumber(product.grossWeight),
    netWeight: parseNullableNumber(product.netWeight),
    weightUnit: normalizeString(product.weightUnit),
    productDescription: productDescriptionsById.get(product.product) ?? product.product,
    sourceData: {
      createdByUser: normalizeString(product.createdByUser),
      creationDate: normalizeString(product.creationDate),
      crossPlantStatus: normalizeString(product.crossPlantStatus),
      crossPlantStatusValidityDate: normalizeString(product.crossPlantStatusValidityDate),
      industrySector: normalizeString(product.industrySector),
      isMarkedForDeletion: Boolean(product.isMarkedForDeletion),
      lastChangeDate: normalizeString(product.lastChangeDate),
      lastChangeDateTime: normalizeString(product.lastChangeDateTime),
    },
  }));

  const productById = new Map(products.map((product) => [product.productId, product]));

  const plants = plantsRaw.map<PlantRecord>((plant) => ({
    plantId: plant.plant,
    plantName: normalizeString(plant.plantName) ?? plant.plant,
    valuationArea: normalizeString(plant.valuationArea),
    salesOrganization: normalizeString(plant.salesOrganization),
    addressId: normalizeString(plant.addressId),
    distributionChannel: normalizeString(plant.distributionChannel),
    division: normalizeString(plant.division),
    sourceData: {
      defaultPurchasingOrganization: normalizeString(plant.defaultPurchasingOrganization),
      factoryCalendar: normalizeString(plant.factoryCalendar),
      isMarkedForArchiving: Boolean(plant.isMarkedForArchiving),
      language: normalizeString(plant.language),
      plantCategory: normalizeString(plant.plantCategory),
      plantCustomer: normalizeString(plant.plantCustomer),
      plantSupplier: normalizeString(plant.plantSupplier),
    },
  }));

  const salesOrders = salesOrderHeaders.map<SalesOrderRecord>((order) => ({
    salesOrderId: order.salesOrder,
    soldToParty: order.soldToParty,
    creationDate: normalizeString(order.creationDate),
    requestedDeliveryDate: normalizeString(order.requestedDeliveryDate),
    totalNetAmount: parseNumber(order.totalNetAmount),
    transactionCurrency: normalizeString(order.transactionCurrency),
    overallDeliveryStatus: normalizeString(order.overallDeliveryStatus),
    overallBillingStatus: normalizeString(order.overallOrdReltdBillgStatus),
    salesOrderType: normalizeString(order.salesOrderType),
    sourceData: {
      salesOrganization: normalizeString(order.salesOrganization),
      distributionChannel: normalizeString(order.distributionChannel),
      organizationDivision: normalizeString(order.organizationDivision),
      salesGroup: normalizeString(order.salesGroup),
      salesOffice: normalizeString(order.salesOffice),
      createdByUser: normalizeString(order.createdByUser),
      lastChangeDateTime: normalizeString(order.lastChangeDateTime),
      pricingDate: normalizeString(order.pricingDate),
      overallSdDocReferenceStatus: normalizeString(order.overallSdDocReferenceStatus),
      headerBillingBlockReason: normalizeString(order.headerBillingBlockReason),
      deliveryBlockReason: normalizeString(order.deliveryBlockReason),
      incotermsClassification: normalizeString(order.incotermsClassification),
      incotermsLocation1: normalizeString(order.incotermsLocation1),
      customerPaymentTerms: normalizeString(order.customerPaymentTerms),
      totalCreditCheckStatus: normalizeString(order.totalCreditCheckStatus),
    },
  }));

  const salesOrderById = new Map(salesOrders.map((order) => [order.salesOrderId, order]));

  const salesOrderItems = salesOrderItemsRaw.map<SalesOrderItemRecord>((item) => ({
    salesOrderId: item.salesOrder,
    salesOrderItemId: normalizeItemId(item.salesOrderItem),
    productId: item.material,
    requestedQuantity: parseNumber(item.requestedQuantity),
    requestedQuantityUnit: normalizeString(item.requestedQuantityUnit),
    transactionCurrency: normalizeString(item.transactionCurrency),
    netAmount: parseNumber(item.netAmount),
    productionPlantId: normalizeString(item.productionPlant),
    storageLocation: normalizeString(item.storageLocation),
    materialGroup: normalizeString(item.materialGroup),
    salesOrderItemCategory: normalizeString(item.salesOrderItemCategory),
    sourceData: {
      itemBillingBlockReason: normalizeString(item.itemBillingBlockReason),
      salesDocumentRjcnReason: normalizeString(item.salesDocumentRjcnReason),
    },
  }));

  const deliveries = deliveryHeaders.map<DeliveryRecord>((delivery) => ({
    deliveryDocumentId: delivery.deliveryDocument,
    creationDate: normalizeString(delivery.creationDate),
    shippingPoint: normalizeString(delivery.shippingPoint),
    overallGoodsMovementStatus: normalizeString(delivery.overallGoodsMovementStatus),
    overallPickingStatus: normalizeString(delivery.overallPickingStatus),
    sourceData: {
      actualGoodsMovementDate: normalizeString(delivery.actualGoodsMovementDate),
      actualGoodsMovementTime: formatTimeValue(delivery.actualGoodsMovementTime),
      creationTime: formatTimeValue(delivery.creationTime),
      deliveryBlockReason: normalizeString(delivery.deliveryBlockReason),
      hdrGeneralIncompletionStatus: normalizeString(delivery.hdrGeneralIncompletionStatus),
      headerBillingBlockReason: normalizeString(delivery.headerBillingBlockReason),
      lastChangeDate: normalizeString(delivery.lastChangeDate),
      overallProofOfDeliveryStatus: normalizeString(delivery.overallProofOfDeliveryStatus),
    },
  }));

  const deliveryItems = deliveryItemsRaw.map<DeliveryItemRecord>((item) => ({
    deliveryDocumentId: item.deliveryDocument,
    deliveryDocumentItemId: normalizeItemId(item.deliveryDocumentItem),
    plantId: normalizeString(item.plant),
    storageLocation: normalizeString(item.storageLocation),
    actualDeliveryQuantity: parseNullableNumber(item.actualDeliveryQuantity),
    deliveryQuantityUnit: normalizeString(item.deliveryQuantityUnit),
    referenceSalesOrderId: item.referenceSdDocument,
    referenceSalesOrderItemId: normalizeItemId(item.referenceSdDocumentItem),
    sourceData: {
      batch: normalizeString(item.batch),
      itemBillingBlockReason: normalizeString(item.itemBillingBlockReason),
      lastChangeDate: normalizeString(item.lastChangeDate),
    },
  }));

  const deliveryItemByDeliveryItemId = new Map(
    deliveryItems.map((item) => [`${item.deliveryDocumentId}:${item.deliveryDocumentItemId}`, item]),
  );

  const billingHeaderMap = new Map<string, BillingDocumentRecord>();
  for (const header of billingHeaders) {
    billingHeaderMap.set(header.billingDocument, {
      billingDocumentId: header.billingDocument,
      billingDocumentType: normalizeString(header.billingDocumentType),
      billingDocumentDate: normalizeString(header.billingDocumentDate),
      billingDocumentIsCancelled: Boolean(header.billingDocumentIsCancelled),
      cancelledBillingDocument: normalizeString(header.cancelledBillingDocument),
      companyCode: normalizeString(header.companyCode),
      fiscalYear: normalizeString(header.fiscalYear),
      accountingDocumentId: normalizeString(header.accountingDocument),
      soldToParty: normalizeString(header.soldToParty),
      totalNetAmount: parseNumber(header.totalNetAmount),
      transactionCurrency: normalizeString(header.transactionCurrency),
      creationDate: normalizeString(header.creationDate),
      sourceData: {
        creationTime: formatTimeValue(header.creationTime),
        lastChangeDateTime: normalizeString(header.lastChangeDateTime),
      },
    });
  }

  for (const cancellation of billingCancellations) {
    const existing = billingHeaderMap.get(cancellation.billingDocument);
    billingHeaderMap.set(cancellation.billingDocument, {
      billingDocumentId: cancellation.billingDocument,
      billingDocumentType: normalizeString(cancellation.billingDocumentType) ?? existing?.billingDocumentType ?? null,
      billingDocumentDate: normalizeString(cancellation.billingDocumentDate) ?? existing?.billingDocumentDate ?? null,
      billingDocumentIsCancelled: true,
      cancelledBillingDocument:
        normalizeString(cancellation.cancelledBillingDocument) ?? existing?.cancelledBillingDocument ?? null,
      companyCode: normalizeString(cancellation.companyCode) ?? existing?.companyCode ?? null,
      fiscalYear: normalizeString(cancellation.fiscalYear) ?? existing?.fiscalYear ?? null,
      accountingDocumentId: normalizeString(cancellation.accountingDocument) ?? existing?.accountingDocumentId ?? null,
      soldToParty: normalizeString(cancellation.soldToParty) ?? existing?.soldToParty ?? null,
      totalNetAmount: existing?.totalNetAmount ?? parseNumber(cancellation.totalNetAmount),
      transactionCurrency: normalizeString(cancellation.transactionCurrency) ?? existing?.transactionCurrency ?? null,
      creationDate: normalizeString(cancellation.creationDate) ?? existing?.creationDate ?? null,
      sourceData: {
        creationTime:
          formatTimeValue(cancellation.creationTime) ??
          (typeof existing?.sourceData.creationTime === "string" ? existing.sourceData.creationTime : null),
        lastChangeDateTime:
          normalizeString(cancellation.lastChangeDateTime) ??
          (typeof existing?.sourceData.lastChangeDateTime === "string" ? existing.sourceData.lastChangeDateTime : null),
      },
    });
  }

  const billingDocuments = [...billingHeaderMap.values()].sort((left, right) =>
    left.billingDocumentId.localeCompare(right.billingDocumentId),
  );
  const billingDocumentById = new Map(billingDocuments.map((document) => [document.billingDocumentId, document]));

  const billingItems = billingItemsRaw.map<BillingItemRecord>((item) => ({
    billingDocumentId: item.billingDocument,
    billingDocumentItemId: normalizeItemId(item.billingDocumentItem),
    productId: normalizeString(item.material),
    billingQuantity: parseNullableNumber(item.billingQuantity),
    billingQuantityUnit: normalizeString(item.billingQuantityUnit),
    netAmount: parseNumber(item.netAmount),
    transactionCurrency: normalizeString(item.transactionCurrency),
    referenceDeliveryDocumentId: normalizeString(item.referenceSdDocument),
    referenceDeliveryDocumentItemId: normalizeNullableItemId(item.referenceSdDocumentItem),
    sourceData: {},
  }));

  const journalEntries = journalEntriesRaw.map<JournalEntryRecord>((entry) => ({
    journalEntryId: makeCompositeId([
      entry.companyCode,
      entry.fiscalYear,
      entry.accountingDocument,
      entry.accountingDocumentItem,
    ]),
    companyCode: entry.companyCode,
    fiscalYear: entry.fiscalYear,
    accountingDocumentId: entry.accountingDocument,
    accountingDocumentItemId: normalizeItemId(entry.accountingDocumentItem),
    referenceBillingDocumentId: normalizeString(entry.referenceDocument),
    postingDate: normalizeString(entry.postingDate),
    documentDate: normalizeString(entry.documentDate),
    customerId: normalizeString(entry.customer),
    amountInTransactionCurrency: parseNumber(entry.amountInTransactionCurrency),
    transactionCurrency: normalizeString(entry.transactionCurrency),
    clearingAccountingDocument: normalizeString(entry.clearingAccountingDocument),
    clearingDate: normalizeString(entry.clearingDate),
    sourceData: {
      accountingDocumentType: normalizeString(entry.accountingDocumentType),
      amountInCompanyCodeCurrency: parseNullableNumber(entry.amountInCompanyCodeCurrency),
      assignmentReference: normalizeString(entry.assignmentReference),
      clearingDocFiscalYear: normalizeString(entry.clearingDocFiscalYear),
      companyCodeCurrency: normalizeString(entry.companyCodeCurrency),
      costCenter: normalizeString(entry.costCenter),
      financialAccountType: normalizeString(entry.financialAccountType),
      glAccount: normalizeString(entry.glAccount),
      lastChangeDateTime: normalizeString(entry.lastChangeDateTime),
      profitCenter: normalizeString(entry.profitCenter),
    },
  }));

  const payments = paymentsRaw.map<PaymentRecord>((payment) => ({
    paymentId: makeCompositeId([
      payment.companyCode,
      payment.fiscalYear,
      payment.accountingDocument,
      payment.accountingDocumentItem,
    ]),
    companyCode: payment.companyCode,
    fiscalYear: payment.fiscalYear,
    accountingDocumentId: payment.accountingDocument,
    accountingDocumentItemId: normalizeItemId(payment.accountingDocumentItem),
    customerId: normalizeString(payment.customer),
    amountInTransactionCurrency: parseNumber(payment.amountInTransactionCurrency),
    transactionCurrency: normalizeString(payment.transactionCurrency),
    clearingAccountingDocument: normalizeString(payment.clearingAccountingDocument),
    clearingDate: normalizeString(payment.clearingDate),
    postingDate: normalizeString(payment.postingDate),
    documentDate: normalizeString(payment.documentDate),
    sourceData: {
      amountInCompanyCodeCurrency: parseNullableNumber(payment.amountInCompanyCodeCurrency),
      assignmentReference: normalizeString(payment.assignmentReference),
      clearingDocFiscalYear: normalizeString(payment.clearingDocFiscalYear),
      companyCodeCurrency: normalizeString(payment.companyCodeCurrency),
      costCenter: normalizeString(payment.costCenter),
      financialAccountType: normalizeString(payment.financialAccountType),
      glAccount: normalizeString(payment.glAccount),
      invoiceReference: normalizeString(payment.invoiceReference),
      invoiceReferenceFiscalYear: normalizeString(payment.invoiceReferenceFiscalYear),
      profitCenter: normalizeString(payment.profitCenter),
      salesDocument: normalizeString(payment.salesDocument),
      salesDocumentItem: normalizeNullableItemId(payment.salesDocumentItem),
    },
  }));

  const customerCompanyAssignments = customerCompanyAssignmentsRaw.map<LookupAssignmentRecord>((assignment) => ({
    ownerId: assignment.customer,
    scopeId: assignment.companyCode,
    metadata: {
      paymentTerms: normalizeString(assignment.paymentTerms),
      reconciliationAccount: normalizeString(assignment.reconciliationAccount),
    },
  }));

  const customerSalesAreaAssignments = customerSalesAreaAssignmentsRaw.map<LookupAssignmentRecord>((assignment) => ({
    ownerId: assignment.customer,
    scopeId: [
      normalizeString(assignment.salesOrganization),
      normalizeString(assignment.distributionChannel),
      normalizeString(assignment.division),
    ]
      .filter(Boolean)
      .join(":"),
    metadata: {
      salesOrganization: normalizeString(assignment.salesOrganization),
      distributionChannel: normalizeString(assignment.distributionChannel),
      division: normalizeString(assignment.division),
      customerPaymentTerms: normalizeString(assignment.customerPaymentTerms),
      shippingCondition: normalizeString(assignment.shippingCondition),
    },
  }));

  const productPlants = productPlantsRaw.map<LookupAssignmentRecord>((assignment) => ({
    ownerId: assignment.product,
    scopeId: assignment.plant,
    metadata: {
      purchasingGroup: normalizeString(assignment.purchasingGroup),
      procurementType: normalizeString(assignment.procurementType),
    },
  }));

  const productStorageLocations = productStorageLocationsRaw.map<LookupAssignmentRecord>((assignment) => ({
    ownerId: assignment.product,
    scopeId: `${assignment.plant}:${assignment.storageLocation}`,
    metadata: {
      plant: assignment.plant,
      storageLocation: assignment.storageLocation,
    },
  }));

  const deliveryItemsBySalesOrderItem = groupBy(deliveryItems, (item) =>
    `${item.referenceSalesOrderId}:${item.referenceSalesOrderItemId}`,
  );
  const billingItemsByDeliveryItem = groupBy(billingItems, (item) =>
    `${item.referenceDeliveryDocumentId ?? ""}:${item.referenceDeliveryDocumentItemId ?? ""}`,
  );
  const journalEntriesByAccountingDocument = groupBy(journalEntries, (entry) => entry.accountingDocumentId);
  const paymentsByAccountingDocument = groupBy(payments, (payment) => payment.accountingDocumentId);

  const o2cFlowItems = salesOrderItems.map<O2CFlowItemViewRow>((item) => {
    const key = `${item.salesOrderId}:${item.salesOrderItemId}`;
    const order = salesOrderById.get(item.salesOrderId);
    const customerId = order?.soldToParty ?? "unknown";
    const customerName = customerNamesById.get(customerId) ?? customerId;
    const deliveryMatches = deliveryItemsBySalesOrderItem.get(key) ?? [];
    const billingMatches = deliveryMatches.flatMap((deliveryItem) =>
      billingItemsByDeliveryItem.get(`${deliveryItem.deliveryDocumentId}:${deliveryItem.deliveryDocumentItemId}`) ?? [],
    );
    const billingDocumentsForItem = billingMatches
      .map((billingItem) => billingDocumentById.get(billingItem.billingDocumentId))
      .filter((document): document is BillingDocumentRecord => Boolean(document));
    const accountingDocumentIds = unique(
      billingDocumentsForItem
        .map((document) => document.accountingDocumentId)
        .filter((value): value is string => Boolean(value)),
    );
    const journalEntryMatches = accountingDocumentIds.flatMap(
      (accountingDocumentId) => journalEntriesByAccountingDocument.get(accountingDocumentId) ?? [],
    );
    const paymentMatches = accountingDocumentIds.flatMap(
      (accountingDocumentId) => paymentsByAccountingDocument.get(accountingDocumentId) ?? [],
    );
    const flowStatus = deriveFlowStatus({
      hasDelivery: deliveryMatches.length > 0,
      hasBilling: billingMatches.length > 0,
      hasPosting: journalEntryMatches.length > 0,
      hasPayment: paymentMatches.length > 0,
    });

    return {
      salesOrderId: item.salesOrderId,
      salesOrderItemId: item.salesOrderItemId,
      customerId,
      customerName,
      productId: item.productId,
      productDescription: productById.get(item.productId)?.productDescription ?? item.productId,
      productionPlantId: item.productionPlantId,
      storageLocation: item.storageLocation,
      requestedQuantity: item.requestedQuantity,
      orderNetAmount: item.netAmount,
      currency: item.transactionCurrency ?? order?.transactionCurrency ?? null,
      deliveryCount: deliveryMatches.length,
      firstDeliveryDocumentId: deliveryMatches[0]?.deliveryDocumentId ?? null,
      billingDocumentCount: unique(billingMatches.map((match) => match.billingDocumentId)).length,
      firstBillingDocumentId: billingMatches[0]?.billingDocumentId ?? null,
      accountingDocumentId: accountingDocumentIds[0] ?? null,
      paymentCount: paymentMatches.length,
      flowStatus,
    };
  });

  const billingTrace = billingItems.map<BillingTraceViewRow>((billingItem) => {
    const billingDocument = billingDocumentById.get(billingItem.billingDocumentId);
    const deliveryItem = billingItem.referenceDeliveryDocumentId
      ? deliveryItemByDeliveryItemId.get(
          `${billingItem.referenceDeliveryDocumentId}:${billingItem.referenceDeliveryDocumentItemId ?? ""}`,
        )
      : undefined;
    const salesOrder = deliveryItem ? salesOrderById.get(deliveryItem.referenceSalesOrderId) : undefined;
    const accountingDocumentId = billingDocument?.accountingDocumentId ?? null;
    const journalEntryMatches = accountingDocumentId
      ? journalEntriesByAccountingDocument.get(accountingDocumentId) ?? []
      : [];
    const paymentMatches = accountingDocumentId ? paymentsByAccountingDocument.get(accountingDocumentId) ?? [] : [];
    const customerId = billingDocument?.soldToParty ?? salesOrder?.soldToParty ?? null;
    const customerName = customerNamesById.get(customerId ?? "") ?? customerId ?? "Unknown customer";

    return {
      billingDocumentId: billingItem.billingDocumentId,
      billingDocumentItemId: billingItem.billingDocumentItemId,
      billingDocumentType: billingDocument?.billingDocumentType ?? null,
      billingDocumentDate: billingDocument?.billingDocumentDate ?? null,
      billingDocumentIsCancelled: billingDocument?.billingDocumentIsCancelled ?? false,
      companyCode: billingDocument?.companyCode ?? null,
      fiscalYear: billingDocument?.fiscalYear ?? null,
      accountingDocumentId,
      salesOrderId: deliveryItem?.referenceSalesOrderId ?? null,
      salesOrderItemId: deliveryItem?.referenceSalesOrderItemId ?? null,
      deliveryDocumentId: billingItem.referenceDeliveryDocumentId ?? null,
      deliveryDocumentItemId: billingItem.referenceDeliveryDocumentItemId ?? null,
      customerId,
      customerName,
      productId: billingItem.productId,
      productDescription: billingItem.productId
        ? productById.get(billingItem.productId)?.productDescription ?? billingItem.productId
        : "Unknown product",
      billingNetAmount: billingItem.netAmount,
      currency: billingItem.transactionCurrency ?? billingDocument?.transactionCurrency ?? null,
      journalEntryCount: journalEntryMatches.length,
      paymentCount: paymentMatches.length,
      paymentClearingDocuments: unique(
        paymentMatches
          .map((payment) => payment.clearingAccountingDocument)
          .filter((value): value is string => Boolean(value)),
      ),
      flowStatus: deriveFlowStatus({
        hasDelivery: Boolean(deliveryItem),
        hasBilling: true,
        hasPosting: journalEntryMatches.length > 0,
        hasPayment: paymentMatches.length > 0,
      }),
    };
  });

  const { graphNodes, graphEdges } = buildGraph({
    customers,
    addresses,
    products,
    plants,
    salesOrders,
    salesOrderItems,
    deliveries,
    deliveryItems,
    billingDocuments,
    billingItems,
    journalEntries,
    payments,
    o2cFlowItems,
  });

  const entityLookup = graphNodes.map<EntityLookupRecord>((node) => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    entityId: node.entityId,
    label: node.label,
    subtitle: node.subtitle,
    searchText: [node.entityId, node.label, node.subtitle, ...extractSearchMetadata(node.metadata)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  return {
    customers,
    addresses,
    products,
    plants,
    salesOrders,
    salesOrderItems,
    deliveries,
    deliveryItems,
    billingDocuments,
    billingItems,
    journalEntries,
    payments,
    customerCompanyAssignments,
    customerSalesAreaAssignments,
    productPlants,
    productStorageLocations,
    graphNodes,
    graphEdges,
    entityLookup,
    o2cFlowItems,
    billingTrace,
  };
}

function buildGraph(dataset: Pick<
  NormalizedDataset,
  | "customers"
  | "addresses"
  | "products"
  | "plants"
  | "salesOrders"
  | "salesOrderItems"
  | "deliveries"
  | "deliveryItems"
  | "billingDocuments"
  | "billingItems"
  | "journalEntries"
  | "payments"
  | "o2cFlowItems"
>): Pick<NormalizedDataset, "graphNodes" | "graphEdges"> {
  const nodes = new Map<string, GraphNodeRecord>();
  const edges = new Map<string, GraphEdgeRecord>();

  const addNode = <T extends object>(
    nodeType: GraphNodeType,
    entityId: string,
    label: string,
    subtitle: string,
    metadata: T,
  ) => {
    const nodeId = `${nodeType}:${entityId}`;
    nodes.set(nodeId, { nodeId, nodeType, entityId, label, subtitle, metadata: metadata as Record<string, unknown> });
    return nodeId;
  };

  const addEdge = (
    sourceNodeId: string,
    targetNodeId: string,
    relation: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const edgeId = `${sourceNodeId}|${relation}|${targetNodeId}`;
    edges.set(edgeId, { edgeId, sourceNodeId, targetNodeId, relation, metadata });
  };

  for (const customer of dataset.customers) {
    addNode("customer", customer.customerId, customer.businessPartnerName, `Customer ${customer.customerId}`, customer);
  }

  for (const address of dataset.addresses) {
    addNode(
      "address",
      address.addressId,
      [address.streetName, address.cityName].filter(Boolean).join(", ") || `Address ${address.addressId}`,
      [address.region, address.country].filter(Boolean).join(", "),
      address,
    );
    addEdge(`customer:${address.customerId}`, `address:${address.addressId}`, "HAS_ADDRESS");
  }

  for (const product of dataset.products) {
    addNode("product", product.productId, product.productDescription, `Product ${product.productId}`, product);
  }

  for (const plant of dataset.plants) {
    addNode("plant", plant.plantId, plant.plantName, `Plant ${plant.plantId}`, plant);
  }

  for (const order of dataset.salesOrders) {
    addNode("sales_order", order.salesOrderId, `Sales Order ${order.salesOrderId}`, `Customer ${order.soldToParty}`, order);
    addEdge(`sales_order:${order.salesOrderId}`, `customer:${order.soldToParty}`, "PLACED_BY");
  }

  const flowByOrderItem = new Map(
    dataset.o2cFlowItems.map((row) => [`${row.salesOrderId}:${row.salesOrderItemId}`, row]),
  );

  for (const item of dataset.salesOrderItems) {
    const entityId = `${item.salesOrderId}:${item.salesOrderItemId}`;
    const flow = flowByOrderItem.get(entityId);
    addNode(
      "sales_order_item",
      entityId,
      `SO ${item.salesOrderId} / ${item.salesOrderItemId}`,
      flow?.flowStatus ?? "Unclassified",
      { ...item, flowStatus: flow?.flowStatus ?? null },
    );
    addEdge(`sales_order:${item.salesOrderId}`, `sales_order_item:${entityId}`, "HAS_ITEM");
    addEdge(`sales_order_item:${entityId}`, `product:${item.productId}`, "FOR_PRODUCT");
    if (item.productionPlantId) {
      addEdge(`sales_order_item:${entityId}`, `plant:${item.productionPlantId}`, "REQUESTS_FROM");
    }
  }

  for (const delivery of dataset.deliveries) {
    addNode(
      "delivery",
      delivery.deliveryDocumentId,
      `Delivery ${delivery.deliveryDocumentId}`,
      delivery.shippingPoint ? `Shipping point ${delivery.shippingPoint}` : "Outbound delivery",
      delivery,
    );
  }

  for (const item of dataset.deliveryItems) {
    const entityId = `${item.deliveryDocumentId}:${item.deliveryDocumentItemId}`;
    addNode(
      "delivery_item",
      entityId,
      `Delivery ${item.deliveryDocumentId} / ${item.deliveryDocumentItemId}`,
      `SO ${item.referenceSalesOrderId} / ${item.referenceSalesOrderItemId}`,
      item,
    );
    addEdge(`delivery:${item.deliveryDocumentId}`, `delivery_item:${entityId}`, "HAS_ITEM");
    addEdge(
      `sales_order_item:${item.referenceSalesOrderId}:${item.referenceSalesOrderItemId}`,
      `delivery_item:${entityId}`,
      "FULFILLED_BY",
    );
    if (item.plantId) {
      addEdge(`delivery_item:${entityId}`, `plant:${item.plantId}`, "SHIPPED_FROM");
    }
  }

  for (const document of dataset.billingDocuments) {
    addNode(
      "billing_document",
      document.billingDocumentId,
      `Billing ${document.billingDocumentId}`,
      document.billingDocumentIsCancelled ? "Cancelled billing document" : "Billing document",
      document,
    );
    if (document.soldToParty) {
      addEdge(`billing_document:${document.billingDocumentId}`, `customer:${document.soldToParty}`, "BILLED_TO");
    }
  }

  const billingDocumentById = new Map(dataset.billingDocuments.map((document) => [document.billingDocumentId, document]));
  const journalEntryByAccountingDocument = groupBy(dataset.journalEntries, (entry) => entry.accountingDocumentId);
  const paymentByAccountingDocument = groupBy(dataset.payments, (payment) => payment.accountingDocumentId);

  for (const item of dataset.billingItems) {
    const entityId = `${item.billingDocumentId}:${item.billingDocumentItemId}`;
    addNode(
      "billing_item",
      entityId,
      `Billing ${item.billingDocumentId} / ${item.billingDocumentItemId}`,
      item.productId ? `Product ${item.productId}` : "Billing item",
      item,
    );
    addEdge(`billing_document:${item.billingDocumentId}`, `billing_item:${entityId}`, "HAS_ITEM");
    if (item.referenceDeliveryDocumentId && item.referenceDeliveryDocumentItemId) {
      addEdge(
        `delivery_item:${item.referenceDeliveryDocumentId}:${item.referenceDeliveryDocumentItemId}`,
        `billing_item:${entityId}`,
        "BILLED_AS",
      );
    }
    if (item.productId) {
      addEdge(`billing_item:${entityId}`, `product:${item.productId}`, "FOR_PRODUCT");
    }

    const accountingDocumentId = billingDocumentById.get(item.billingDocumentId)?.accountingDocumentId;
    if (!accountingDocumentId) {
      continue;
    }

    const journalEntries = journalEntryByAccountingDocument.get(accountingDocumentId) ?? [];
    for (const journalEntry of journalEntries) {
      addNode(
        "journal_entry",
        journalEntry.journalEntryId,
        `Journal ${journalEntry.accountingDocumentId} / ${journalEntry.accountingDocumentItemId}`,
        journalEntry.referenceBillingDocumentId ? `Billing ${journalEntry.referenceBillingDocumentId}` : "AR journal",
        journalEntry,
      );
      addEdge(`billing_item:${entityId}`, `journal_entry:${journalEntry.journalEntryId}`, "POSTED_TO");

      const payments = paymentByAccountingDocument.get(journalEntry.accountingDocumentId) ?? [];
      for (const payment of payments) {
        addNode(
          "payment",
          payment.paymentId,
          `Payment ${payment.accountingDocumentId} / ${payment.accountingDocumentItemId}`,
          payment.clearingAccountingDocument ? `Clearing ${payment.clearingAccountingDocument}` : "AR payment",
          payment,
        );
        addEdge(`journal_entry:${journalEntry.journalEntryId}`, `payment:${payment.paymentId}`, "CLEARED_BY");
      }
    }
  }

  return {
    graphNodes: [...nodes.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    graphEdges: [...edges.values()].sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
  };
}

async function readJsonlDirectory<T>(datasetRoot: string, directoryName: string): Promise<T[]> {
  const directory = path.join(datasetRoot, directoryName);
  const entries = await fs.readdir(directory);
  const files = entries.filter((entry) => entry.endsWith(".jsonl")).sort();
  const rows: T[] = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(directory, file), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      rows.push(JSON.parse(trimmed) as T);
    }
  }

  return rows;
}

function normalizeItemId(value: string): string {
  const normalized = value.trim().replace(/^0+/, "");
  return normalized || "0";
}

function normalizeNullableItemId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return normalizeItemId(value);
}

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTimeValue(value: string | TimeValue | null | undefined): string | null {
  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const hours = typeof value.hours === "number" ? value.hours : 0;
  const minutes = typeof value.minutes === "number" ? value.minutes : 0;
  const seconds = typeof value.seconds === "number" ? value.seconds : 0;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function makeCompositeId(parts: string[]): string {
  return parts.map((part) => part.trim()).join(":");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function groupBy<T>(items: T[], makeKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = makeKey(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function deriveFlowStatus({
  hasDelivery,
  hasBilling,
  hasPosting,
  hasPayment,
}: {
  hasDelivery: boolean;
  hasBilling: boolean;
  hasPosting: boolean;
  hasPayment: boolean;
}): FlowStatus {
  if (!hasDelivery) {
    return "ordered_not_delivered";
  }
  if (!hasBilling) {
    return "delivered_not_billed";
  }
  if (!hasPosting) {
    return "billed_not_posted";
  }
  if (!hasPayment) {
    return "posted_not_cleared";
  }
  return "complete";
}

function extractSearchMetadata(metadata: Record<string, unknown>): string[] {
  const collected: string[] = [];

  for (const value of Object.values(metadata)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      collected.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          collected.push(String(item));
        }
      }
      continue;
    }

    if (value && typeof value === "object") {
      collected.push(...extractSearchMetadata(value as Record<string, unknown>));
    }
  }

  return collected;
}
