-- 1. Payment status enum + column
CREATE TYPE public.payment_status AS ENUM ('Pending', 'Paid', 'Failed');

ALTER TABLE public.orders
  ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'Pending';

-- 2. Lock down public write access: orders are created server-side with the
-- service role, so anon/authenticated clients never need INSERT rights.
DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can add order items" ON public.order_items;

REVOKE INSERT ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;
REVOKE SELECT ON public.orders FROM anon;
REVOKE SELECT ON public.order_items FROM anon;

GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
