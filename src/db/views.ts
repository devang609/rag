export const analyticalViewStatements = [
  `
  create or replace view v_customers as
  select
    c.customer_id,
    coalesce(nullif(c.source_data ->> 'businessPartnerId', ''), c.customer_id) as business_partner_id,
    c.business_partner_name as customer_name,
    c.business_partner_full_name as customer_full_name,
    c.business_partner_category,
    c.business_partner_grouping,
    c.business_partner_is_blocked,
    coalesce((c.source_data ->> 'isMarkedForArchiving')::boolean, false) as is_marked_for_archiving,
    nullif(c.source_data ->> 'correspondenceLanguage', '') as correspondence_language,
    nullif(c.source_data ->> 'createdByUser', '') as created_by_user,
    c.creation_date,
    nullif(c.source_data ->> 'creationTime', '') as creation_time,
    nullif(c.source_data ->> 'firstName', '') as first_name,
    nullif(c.source_data ->> 'lastName', '') as last_name,
    nullif(c.source_data ->> 'formOfAddress', '') as form_of_address,
    nullif(c.source_data ->> 'industry', '') as industry,
    (c.source_data ->> 'lastChangeDate')::timestamptz as last_change_date,
    nullif(c.source_data ->> 'organizationBpName1', '') as organization_bp_name_1,
    nullif(c.source_data ->> 'organizationBpName2', '') as organization_bp_name_2
  from customers c;
  `,
  `
  create or replace view v_products as
  select
    p.product_id,
    p.product_description,
    p.product_type,
    p.product_old_id,
    p.product_group,
    p.base_unit,
    p.division,
    p.gross_weight,
    p.net_weight,
    p.weight_unit,
    nullif(p.source_data ->> 'createdByUser', '') as created_by_user,
    (p.source_data ->> 'creationDate')::timestamptz as creation_date,
    nullif(p.source_data ->> 'crossPlantStatus', '') as cross_plant_status,
    (p.source_data ->> 'crossPlantStatusValidityDate')::timestamptz as cross_plant_status_validity_date,
    nullif(p.source_data ->> 'industrySector', '') as industry_sector,
    coalesce((p.source_data ->> 'isMarkedForDeletion')::boolean, false) as is_marked_for_deletion,
    (p.source_data ->> 'lastChangeDate')::timestamptz as last_change_date,
    (p.source_data ->> 'lastChangeDateTime')::timestamptz as last_change_date_time
  from products p;
  `,
  `
  create or replace view v_plants as
  select
    p.plant_id,
    p.plant_name,
    p.address_id,
    nullif(p.source_data ->> 'defaultPurchasingOrganization', '') as default_purchasing_organization,
    p.distribution_channel,
    p.division,
    nullif(p.source_data ->> 'factoryCalendar', '') as factory_calendar,
    coalesce((p.source_data ->> 'isMarkedForArchiving')::boolean, false) as is_marked_for_archiving,
    nullif(p.source_data ->> 'language', '') as language,
    nullif(p.source_data ->> 'plantCategory', '') as plant_category,
    nullif(p.source_data ->> 'plantCustomer', '') as plant_customer,
    nullif(p.source_data ->> 'plantSupplier', '') as plant_supplier,
    p.sales_organization,
    p.valuation_area
  from plants p;
  `,
  `
  create or replace view v_sales_orders as
  select
    so.sales_order_id,
    so.sold_to_party as customer_id,
    coalesce(c.business_partner_name, so.sold_to_party) as customer_name,
    so.sales_order_type,
    nullif(so.source_data ->> 'salesOrganization', '') as sales_organization,
    nullif(so.source_data ->> 'distributionChannel', '') as distribution_channel,
    nullif(so.source_data ->> 'organizationDivision', '') as organization_division,
    nullif(so.source_data ->> 'salesGroup', '') as sales_group,
    nullif(so.source_data ->> 'salesOffice', '') as sales_office,
    so.creation_date,
    nullif(so.source_data ->> 'createdByUser', '') as created_by_user,
    (so.source_data ->> 'lastChangeDateTime')::timestamptz as last_change_date_time,
    so.requested_delivery_date,
    (so.source_data ->> 'pricingDate')::timestamptz as pricing_date,
    so.total_net_amount,
    so.transaction_currency,
    so.overall_delivery_status,
    so.overall_billing_status,
    nullif(so.source_data ->> 'overallSdDocReferenceStatus', '') as overall_sd_doc_reference_status,
    nullif(so.source_data ->> 'headerBillingBlockReason', '') as header_billing_block_reason,
    nullif(so.source_data ->> 'deliveryBlockReason', '') as delivery_block_reason,
    nullif(so.source_data ->> 'incotermsClassification', '') as incoterms_classification,
    nullif(so.source_data ->> 'incotermsLocation1', '') as incoterms_location_1,
    nullif(so.source_data ->> 'customerPaymentTerms', '') as customer_payment_terms,
    nullif(so.source_data ->> 'totalCreditCheckStatus', '') as total_credit_check_status
  from sales_orders so
  left join customers c
    on c.customer_id = so.sold_to_party;
  `,
  `
  create or replace view v_sales_order_items as
  select
    soi.sales_order_id,
    soi.sales_order_item_id,
    so.sold_to_party as customer_id,
    coalesce(c.business_partner_name, so.sold_to_party) as customer_name,
    soi.product_id,
    coalesce(p.product_description, soi.product_id) as product_description,
    p.product_group,
    soi.production_plant_id,
    plant.plant_name as production_plant_name,
    soi.storage_location,
    soi.requested_quantity,
    soi.requested_quantity as order_quantity,
    soi.requested_quantity_unit,
    soi.net_amount,
    soi.transaction_currency,
    soi.material_group,
    soi.sales_order_item_category,
    nullif(soi.source_data ->> 'itemBillingBlockReason', '') as item_billing_block_reason,
    nullif(soi.source_data ->> 'salesDocumentRjcnReason', '') as sales_document_rejection_reason
  from sales_order_items soi
  join sales_orders so
    on so.sales_order_id = soi.sales_order_id
  left join customers c
    on c.customer_id = so.sold_to_party
  left join products p
    on p.product_id = soi.product_id
  left join plants plant
    on plant.plant_id = soi.production_plant_id;
  `,
  `
  create or replace view v_deliveries as
  select
    d.delivery_document_id,
    (d.source_data ->> 'actualGoodsMovementDate')::timestamptz as actual_goods_movement_date,
    nullif(d.source_data ->> 'actualGoodsMovementTime', '') as actual_goods_movement_time,
    d.creation_date,
    nullif(d.source_data ->> 'creationTime', '') as creation_time,
    nullif(d.source_data ->> 'deliveryBlockReason', '') as delivery_block_reason,
    nullif(d.source_data ->> 'hdrGeneralIncompletionStatus', '') as hdr_general_incompletion_status,
    nullif(d.source_data ->> 'headerBillingBlockReason', '') as header_billing_block_reason,
    (d.source_data ->> 'lastChangeDate')::timestamptz as last_change_date,
    d.overall_goods_movement_status,
    d.overall_picking_status,
    nullif(d.source_data ->> 'overallProofOfDeliveryStatus', '') as overall_proof_of_delivery_status,
    d.shipping_point
  from deliveries d;
  `,
  `
  create or replace view v_delivery_items as
  select
    di.delivery_document_id,
    di.delivery_document_item_id,
    di.reference_sales_order_id,
    di.reference_sales_order_item_id,
    so.sold_to_party as customer_id,
    coalesce(c.business_partner_name, so.sold_to_party) as customer_name,
    soi.product_id,
    coalesce(p.product_description, soi.product_id) as product_description,
    di.plant_id,
    plant.plant_name,
    di.storage_location,
    di.actual_delivery_quantity,
    di.delivery_quantity_unit,
    nullif(di.source_data ->> 'batch', '') as batch,
    nullif(di.source_data ->> 'itemBillingBlockReason', '') as item_billing_block_reason,
    (di.source_data ->> 'lastChangeDate')::timestamptz as last_change_date
  from delivery_items di
  left join sales_orders so
    on so.sales_order_id = di.reference_sales_order_id
  left join customers c
    on c.customer_id = so.sold_to_party
  left join sales_order_items soi
    on soi.sales_order_id = di.reference_sales_order_id
    and soi.sales_order_item_id = di.reference_sales_order_item_id
  left join products p
    on p.product_id = soi.product_id
  left join plants plant
    on plant.plant_id = di.plant_id;
  `,
  `
  create or replace view v_billing_documents as
  select
    bd.billing_document_id,
    bd.billing_document_type,
    bd.billing_document_date,
    bd.billing_document_is_cancelled,
    bd.cancelled_billing_document,
    bd.company_code,
    bd.fiscal_year,
    bd.accounting_document_id,
    bd.sold_to_party as customer_id,
    coalesce(c.business_partner_name, bd.sold_to_party) as customer_name,
    bd.total_net_amount,
    bd.transaction_currency,
    bd.creation_date,
    nullif(bd.source_data ->> 'creationTime', '') as creation_time,
    (bd.source_data ->> 'lastChangeDateTime')::timestamptz as last_change_date_time
  from billing_documents bd
  left join customers c
    on c.customer_id = bd.sold_to_party;
  `,
  `
  create or replace view v_billing_items as
  select
    bi.billing_document_id,
    bi.billing_document_item_id,
    coalesce(bd.sold_to_party, so.sold_to_party) as customer_id,
    coalesce(c.business_partner_name, bd.sold_to_party, so.sold_to_party) as customer_name,
    bi.product_id,
    coalesce(p.product_description, bi.product_id) as product_description,
    bi.billing_quantity,
    bi.billing_quantity_unit,
    bi.net_amount,
    bi.transaction_currency,
    bi.reference_delivery_document_id,
    bi.reference_delivery_document_item_id,
    di.reference_sales_order_id as sales_order_id,
    di.reference_sales_order_item_id as sales_order_item_id
  from billing_items bi
  left join billing_documents bd
    on bd.billing_document_id = bi.billing_document_id
  left join delivery_items di
    on di.delivery_document_id = bi.reference_delivery_document_id
    and di.delivery_document_item_id = bi.reference_delivery_document_item_id
  left join sales_orders so
    on so.sales_order_id = di.reference_sales_order_id
  left join customers c
    on c.customer_id = coalesce(bd.sold_to_party, so.sold_to_party)
  left join products p
    on p.product_id = bi.product_id;
  `,
  `
  create or replace view v_journal_entries_ar as
  select
    je.journal_entry_id,
    je.company_code,
    je.fiscal_year,
    je.accounting_document_id,
    je.accounting_document_item_id,
    nullif(je.source_data ->> 'accountingDocumentType', '') as accounting_document_type,
    je.reference_billing_document_id,
    je.posting_date,
    je.document_date,
    je.customer_id,
    coalesce(c.business_partner_name, je.customer_id) as customer_name,
    je.amount_in_transaction_currency,
    je.transaction_currency,
    nullif(je.source_data ->> 'amountInCompanyCodeCurrency', '')::double precision as amount_in_company_code_currency,
    nullif(je.source_data ->> 'companyCodeCurrency', '') as company_code_currency,
    nullif(je.source_data ->> 'assignmentReference', '') as assignment_reference,
    je.clearing_accounting_document,
    je.clearing_date,
    nullif(je.source_data ->> 'clearingDocFiscalYear', '') as clearing_doc_fiscal_year,
    nullif(je.source_data ->> 'glAccount', '') as gl_account,
    nullif(je.source_data ->> 'financialAccountType', '') as financial_account_type,
    nullif(je.source_data ->> 'profitCenter', '') as profit_center,
    nullif(je.source_data ->> 'costCenter', '') as cost_center,
    (je.source_data ->> 'lastChangeDateTime')::timestamptz as last_change_date_time
  from journal_entries je
  left join customers c
    on c.customer_id = je.customer_id;
  `,
  `
  create or replace view v_payments_ar as
  select
    p.payment_id,
    p.company_code,
    p.fiscal_year,
    p.accounting_document_id,
    p.accounting_document_item_id,
    p.customer_id,
    coalesce(c.business_partner_name, p.customer_id) as customer_name,
    p.amount_in_transaction_currency,
    p.transaction_currency,
    nullif(p.source_data ->> 'amountInCompanyCodeCurrency', '')::double precision as amount_in_company_code_currency,
    nullif(p.source_data ->> 'companyCodeCurrency', '') as company_code_currency,
    nullif(p.source_data ->> 'assignmentReference', '') as assignment_reference,
    p.clearing_accounting_document,
    p.clearing_date,
    nullif(p.source_data ->> 'clearingDocFiscalYear', '') as clearing_doc_fiscal_year,
    nullif(p.source_data ->> 'invoiceReference', '') as invoice_reference,
    nullif(p.source_data ->> 'invoiceReferenceFiscalYear', '') as invoice_reference_fiscal_year,
    nullif(p.source_data ->> 'salesDocument', '') as sales_document,
    nullif(p.source_data ->> 'salesDocumentItem', '') as sales_document_item,
    p.posting_date,
    p.document_date,
    nullif(p.source_data ->> 'glAccount', '') as gl_account,
    nullif(p.source_data ->> 'financialAccountType', '') as financial_account_type,
    nullif(p.source_data ->> 'profitCenter', '') as profit_center,
    nullif(p.source_data ->> 'costCenter', '') as cost_center
  from payments p
  left join customers c
    on c.customer_id = p.customer_id;
  `,
  `
  create or replace view v_customer_company_assignments as
  select
    cca.customer_id,
    coalesce(c.business_partner_name, cca.customer_id) as customer_name,
    cca.company_code,
    nullif(cca.metadata ->> 'paymentTerms', '') as payment_terms,
    nullif(cca.metadata ->> 'reconciliationAccount', '') as reconciliation_account
  from customer_company_assignments cca
  left join customers c
    on c.customer_id = cca.customer_id;
  `,
  `
  create or replace view v_customer_sales_area_assignments as
  select
    csa.customer_id,
    coalesce(c.business_partner_name, csa.customer_id) as customer_name,
    csa.sales_area_key,
    nullif(csa.metadata ->> 'salesOrganization', '') as sales_organization,
    nullif(csa.metadata ->> 'distributionChannel', '') as distribution_channel,
    nullif(csa.metadata ->> 'division', '') as division,
    nullif(csa.metadata ->> 'customerPaymentTerms', '') as customer_payment_terms,
    nullif(csa.metadata ->> 'shippingCondition', '') as shipping_condition
  from customer_sales_area_assignments csa
  left join customers c
    on c.customer_id = csa.customer_id;
  `,
  `
  create or replace view v_product_plants as
  select
    pp.product_id,
    coalesce(prod.product_description, pp.product_id) as product_description,
    pp.plant_id,
    plant.plant_name,
    nullif(pp.metadata ->> 'purchasingGroup', '') as purchasing_group,
    nullif(pp.metadata ->> 'procurementType', '') as procurement_type
  from product_plants pp
  left join products prod
    on prod.product_id = pp.product_id
  left join plants plant
    on plant.plant_id = pp.plant_id;
  `,
  `
  create or replace view v_product_storage_locations as
  select
    psl.product_id,
    coalesce(prod.product_description, psl.product_id) as product_description,
    split_part(psl.plant_storage_location_key, ':', 1) as plant_id,
    plant.plant_name,
    split_part(psl.plant_storage_location_key, ':', 2) as storage_location
  from product_storage_locations psl
  left join products prod
    on prod.product_id = psl.product_id
  left join plants plant
    on plant.plant_id = split_part(psl.plant_storage_location_key, ':', 1);
  `,
  `
  create or replace view v_o2c_flow_item as
  with item_paths as (
    select
      soi.sales_order_id,
      soi.sales_order_item_id,
      so.sold_to_party as customer_id,
      coalesce(c.business_partner_name, so.sold_to_party) as customer_name,
      soi.product_id,
      coalesce(p.product_description, soi.product_id) as product_description,
      soi.production_plant_id,
      soi.storage_location,
      soi.requested_quantity,
      soi.net_amount as order_net_amount,
      coalesce(soi.transaction_currency, so.transaction_currency) as currency,
      di.delivery_document_id,
      bi.billing_document_id,
      bd.accounting_document_id,
      je.journal_entry_id,
      pay.payment_id
    from sales_order_items soi
    join sales_orders so
      on so.sales_order_id = soi.sales_order_id
    left join customers c
      on c.customer_id = so.sold_to_party
    left join products p
      on p.product_id = soi.product_id
    left join delivery_items di
      on di.reference_sales_order_id = soi.sales_order_id
      and di.reference_sales_order_item_id = soi.sales_order_item_id
    left join billing_items bi
      on bi.reference_delivery_document_id = di.delivery_document_id
      and bi.reference_delivery_document_item_id = di.delivery_document_item_id
    left join billing_documents bd
      on bd.billing_document_id = bi.billing_document_id
    left join journal_entries je
      on je.accounting_document_id = bd.accounting_document_id
    left join payments pay
      on pay.accounting_document_id = bd.accounting_document_id
  )
  select
    sales_order_id,
    sales_order_item_id,
    customer_id,
    customer_name,
    product_id,
    product_description,
    production_plant_id,
    storage_location,
    requested_quantity,
    order_net_amount,
    currency,
    count(distinct delivery_document_id) as delivery_count,
    min(delivery_document_id) as first_delivery_document_id,
    count(distinct billing_document_id) as billing_document_count,
    min(billing_document_id) as first_billing_document_id,
    min(accounting_document_id) as accounting_document_id,
    count(distinct payment_id) as payment_count,
    case
      when count(distinct delivery_document_id) = 0 then 'ordered_not_delivered'
      when count(distinct billing_document_id) = 0 then 'delivered_not_billed'
      when count(distinct journal_entry_id) = 0 then 'billed_not_posted'
      when count(distinct payment_id) = 0 then 'posted_not_cleared'
      else 'complete'
    end as flow_status
  from item_paths
  group by
    sales_order_id,
    sales_order_item_id,
    customer_id,
    customer_name,
    product_id,
    product_description,
    production_plant_id,
    storage_location,
    requested_quantity,
    order_net_amount,
    currency;
  `,
  `
  create or replace view v_billing_trace as
  select
    bi.billing_document_id,
    bi.billing_document_item_id,
    bd.billing_document_type,
    bd.billing_document_date,
    bd.billing_document_is_cancelled,
    bd.company_code,
    bd.fiscal_year,
    bd.accounting_document_id,
    di.reference_sales_order_id as sales_order_id,
    di.reference_sales_order_item_id as sales_order_item_id,
    bi.reference_delivery_document_id as delivery_document_id,
    bi.reference_delivery_document_item_id as delivery_document_item_id,
    coalesce(bd.sold_to_party, so.sold_to_party) as customer_id,
    coalesce(c.business_partner_name, bd.sold_to_party, so.sold_to_party, 'Unknown customer') as customer_name,
    bi.product_id,
    coalesce(p.product_description, bi.product_id, 'Unknown product') as product_description,
    bi.net_amount as billing_net_amount,
    coalesce(bi.transaction_currency, bd.transaction_currency) as currency,
    count(distinct je.journal_entry_id) as journal_entry_count,
    count(distinct pay.payment_id) as payment_count,
    coalesce(array_remove(array_agg(distinct pay.clearing_accounting_document), null), '{}') as payment_clearing_documents,
    case
      when bi.reference_delivery_document_id is null then 'ordered_not_delivered'
      when count(distinct je.journal_entry_id) = 0 then 'billed_not_posted'
      when count(distinct pay.payment_id) = 0 then 'posted_not_cleared'
      else 'complete'
    end as flow_status
  from billing_items bi
  left join billing_documents bd
    on bd.billing_document_id = bi.billing_document_id
  left join delivery_items di
    on di.delivery_document_id = bi.reference_delivery_document_id
    and di.delivery_document_item_id = bi.reference_delivery_document_item_id
  left join sales_orders so
    on so.sales_order_id = di.reference_sales_order_id
  left join customers c
    on c.customer_id = coalesce(bd.sold_to_party, so.sold_to_party)
  left join products p
    on p.product_id = bi.product_id
  left join journal_entries je
    on je.accounting_document_id = bd.accounting_document_id
  left join payments pay
    on pay.accounting_document_id = bd.accounting_document_id
  group by
    bi.billing_document_id,
    bi.billing_document_item_id,
    bd.billing_document_type,
    bd.billing_document_date,
    bd.billing_document_is_cancelled,
    bd.company_code,
    bd.fiscal_year,
    bd.accounting_document_id,
    di.reference_sales_order_id,
    di.reference_sales_order_item_id,
    bi.reference_delivery_document_id,
    bi.reference_delivery_document_item_id,
    coalesce(bd.sold_to_party, so.sold_to_party),
    coalesce(c.business_partner_name, bd.sold_to_party, so.sold_to_party, 'Unknown customer'),
    bi.product_id,
    coalesce(p.product_description, bi.product_id, 'Unknown product'),
    bi.net_amount,
    coalesce(bi.transaction_currency, bd.transaction_currency);
  `,
  `
  create or replace view v_entity_lookup as
  select
    node_id,
    node_type,
    entity_id,
    label,
    subtitle,
    lower(concat_ws(' ', entity_id, label, subtitle, metadata::text)) as search_text
  from graph_nodes;
  `,
  `
  create or replace view v_customer_growth as
  with item_paths as (
    select
      so.sales_order_id,
      so.sold_to_party as customer_id,
      coalesce(c.business_partner_name, so.sold_to_party) as customer_name,
      so.creation_date::date as order_date,
      extract(year from so.creation_date)::int as order_year,
      extract(month from so.creation_date)::int as order_month,
      soi.sales_order_item_id,
      soi.net_amount as order_net_amount,
      di.delivery_document_id,
      bi.billing_document_id,
      je.journal_entry_id,
      pay.payment_id
    from sales_orders so
    join sales_order_items soi
      on soi.sales_order_id = so.sales_order_id
    left join customers c
      on c.customer_id = so.sold_to_party
    left join delivery_items di
      on di.reference_sales_order_id = soi.sales_order_id
      and di.reference_sales_order_item_id = soi.sales_order_item_id
    left join billing_items bi
      on bi.reference_delivery_document_id = di.delivery_document_id
      and bi.reference_delivery_document_item_id = di.delivery_document_item_id
    left join billing_documents bd
      on bd.billing_document_id = bi.billing_document_id
    left join journal_entries je
      on je.accounting_document_id = bd.accounting_document_id
    left join payments pay
      on pay.accounting_document_id = bd.accounting_document_id
  )
  select
    customer_id,
    customer_name,
    order_date,
    order_year,
    order_month,
    count(distinct sales_order_id) as sales_order_count,
    count(distinct concat_ws(':', sales_order_id, sales_order_item_id)) as sales_order_item_count,
    sum(order_net_amount) as total_order_amount,
    count(distinct case when delivery_document_id is not null then concat_ws(':', sales_order_id, sales_order_item_id) end) as delivered_item_count,
    count(distinct case when billing_document_id is not null then concat_ws(':', sales_order_id, sales_order_item_id) end) as billed_item_count,
    count(distinct case when journal_entry_id is not null then concat_ws(':', sales_order_id, sales_order_item_id) end) as posted_item_count,
    count(distinct case when payment_id is not null then concat_ws(':', sales_order_id, sales_order_item_id) end) as paid_item_count
  from item_paths
  group by customer_id, customer_name, order_date, order_year, order_month;
  `,
  `
  create or replace view v_customer_status as
  select
    customer_id,
    customer_name,
    business_partner_is_blocked,
    is_marked_for_archiving,
    creation_date
  from v_customers;
  `,
  `
  create or replace view v_product_details as
  select
    product_id,
    product_description,
    product_type,
    product_old_id,
    product_group,
    base_unit,
    division,
    gross_weight,
    net_weight,
    weight_unit
  from v_products;
  `,
];
