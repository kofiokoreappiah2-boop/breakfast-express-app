GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.checkout_throttle TO service_role;
GRANT ALL ON public.order_audit_log TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.business_settings TO service_role;
GRANT ALL ON public.delivery_locations TO service_role;
GRANT ALL ON public.delivery_windows TO service_role;
GRANT ALL ON public.delivery_window_exceptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO service_role;

-- Signed-in staff read/update orders through row level security.
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_audit_log TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_windows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_window_exceptions TO authenticated;

-- Public storefront reads only.
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.business_settings TO anon;
GRANT SELECT ON public.delivery_locations TO anon;
GRANT SELECT ON public.delivery_windows TO anon;
GRANT SELECT ON public.delivery_window_exceptions TO anon;