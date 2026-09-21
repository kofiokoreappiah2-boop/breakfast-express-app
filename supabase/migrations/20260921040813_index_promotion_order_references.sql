create index orders_promotion_code_idx
  on public.orders (promotion_code)
  where promotion_code is not null;
