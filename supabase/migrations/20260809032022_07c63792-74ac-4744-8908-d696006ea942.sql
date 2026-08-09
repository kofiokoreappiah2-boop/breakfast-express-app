REVOKE ALL ON public.orders, public.order_items, public.products, public.user_roles
  FROM anon, authenticated;

-- Public menu is read-only for everyone.
GRANT SELECT ON public.products TO anon, authenticated;

-- Signed-in staff: reads gated by admin RLS policies.
GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Admin product management (already gated by RLS).
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.user_roles TO service_role;
