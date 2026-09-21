create table public.promotion_exclusions (
  promotion_code text not null references public.promotions(code) on delete cascade,
  phone_normalized text not null check (phone_normalized ~ '^0[0-9]{9}$'),
  created_at timestamptz not null default now(),
  primary key (promotion_code, phone_normalized)
);

alter table public.promotion_exclusions enable row level security;
revoke all on public.promotion_exclusions from public, anon, authenticated;
grant all on public.promotion_exclusions to service_role;

insert into public.promotion_exclusions (promotion_code, phone_normalized)
values
  ('FOUNDERS_DAY_2026', '0596407822'),
  ('FOUNDERS_DAY_2026', '0554307260'),
  ('FOUNDERS_DAY_2026', '0202041972'),
  ('FOUNDERS_DAY_2026', '0559984707'),
  ('FOUNDERS_DAY_2026', '0245360076'),
  ('FOUNDERS_DAY_2026', '0249717596'),
  ('FOUNDERS_DAY_2026', '0200607275'),
  ('FOUNDERS_DAY_2026', '0245257124'),
  ('FOUNDERS_DAY_2026', '0548417215'),
  ('FOUNDERS_DAY_2026', '0555992497'),
  ('FOUNDERS_DAY_2026', '0598473399'),
  ('FOUNDERS_DAY_2026', '0594296901'),
  ('FOUNDERS_DAY_2026', '0596354031')
on conflict do nothing;

create or replace function public.create_order_with_promotion(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_location text,
  p_delivery_window text,
  p_delivery_date date,
  p_payment_method text,
  p_additional_instructions text,
  p_client_request_id uuid,
  p_subtotal numeric,
  p_items jsonb
)
returns table (
  id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
  total numeric,
  promotion_code text,
  created_at timestamptz,
  payment_status public.payment_status,
  additional_instructions text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_promotion public.promotions%rowtype;
  v_discount numeric(10,2) := 0;
  v_promotion_code text := null;
  v_phone_digits text;
  v_phone_normalized text;
  v_is_excluded boolean := false;
begin
  if p_client_request_id is not null then
    select *
    into v_order
    from public.orders o
    where o.client_request_id = p_client_request_id;

    if found then
      return query
      select
        v_order.id,
        v_order.order_number,
        v_order.subtotal,
        v_order.discount_amount,
        v_order.total,
        v_order.promotion_code,
        v_order.created_at,
        v_order.payment_status,
        v_order.additional_instructions;
      return;
    end if;
  end if;

  v_phone_digits := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_phone_normalized := case
    when v_phone_digits ~ '^233[0-9]{9}$' then '0' || substring(v_phone_digits from 4)
    when v_phone_digits ~ '^[0-9]{9}$' then '0' || v_phone_digits
    else v_phone_digits
  end;

  select *
  into v_promotion
  from public.promotions p
  where p.code = 'FOUNDERS_DAY_2026'
  for update;

  if found then
    select exists (
      select 1
      from public.promotion_exclusions e
      where e.promotion_code = v_promotion.code
        and e.phone_normalized = v_phone_normalized
    ) into v_is_excluded;
  end if;

  if found
    and not v_is_excluded
    and v_promotion.active
    and (v_promotion.starts_at is null or now() >= v_promotion.starts_at)
    and (v_promotion.ends_at is null or now() < v_promotion.ends_at)
    and v_promotion.redemptions_count < v_promotion.redemption_limit
  then
    v_discount := least(v_promotion.discount_amount, p_subtotal);
    v_promotion_code := v_promotion.code;
  end if;

  insert into public.orders (
    customer_name,
    customer_phone,
    delivery_location,
    delivery_window,
    delivery_date,
    payment_method,
    additional_instructions,
    client_request_id,
    subtotal,
    discount_amount,
    total,
    promotion_code
  ) values (
    p_customer_name,
    p_customer_phone,
    p_delivery_location,
    p_delivery_window,
    p_delivery_date,
    p_payment_method,
    coalesce(p_additional_instructions, ''),
    p_client_request_id,
    p_subtotal,
    v_discount,
    p_subtotal - v_discount,
    v_promotion_code
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal
  )
  select
    v_order.id,
    item.product_id,
    item.product_name,
    item.quantity,
    item.unit_price,
    item.subtotal
  from jsonb_to_recordset(p_items) as item(
    product_id uuid,
    product_name text,
    quantity integer,
    unit_price numeric,
    subtotal numeric
  );

  if v_promotion_code is not null then
    update public.promotions
    set
      redemptions_count = redemptions_count + 1,
      updated_at = now()
    where code = v_promotion_code;
  end if;

  return query
  select
    v_order.id,
    v_order.order_number,
    v_order.subtotal,
    v_order.discount_amount,
    v_order.total,
    v_order.promotion_code,
    v_order.created_at,
    v_order.payment_status,
    v_order.additional_instructions;
exception
  when unique_violation then
    if p_client_request_id is null then
      raise;
    end if;

    select *
    into v_order
    from public.orders o
    where o.client_request_id = p_client_request_id;

    if not found then
      raise;
    end if;

    return query
    select
      v_order.id,
      v_order.order_number,
      v_order.subtotal,
      v_order.discount_amount,
      v_order.total,
      v_order.promotion_code,
      v_order.created_at,
      v_order.payment_status,
      v_order.additional_instructions;
end;
$$;

revoke all on function public.create_order_with_promotion(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  uuid,
  numeric,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_order_with_promotion(
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  uuid,
  numeric,
  jsonb
) to service_role;
