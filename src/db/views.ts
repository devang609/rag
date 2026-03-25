export const analyticalViewStatements = [
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
    business_partner_name as customer_name,
    business_partner_is_blocked,
    creation_date
  from customers;
  `,
];
