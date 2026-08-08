
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(),'admin')) WITH CHECK (app_private.has_role(auth.uid(),'admin'));

DROP POLICY "Admins can view orders" ON public.orders;
CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(),'admin'));
DROP POLICY "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(),'admin')) WITH CHECK (app_private.has_role(auth.uid(),'admin'));

DROP POLICY "Admins can view order items" ON public.order_items;
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(),'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'EN-' || nextval('public.order_number_seq')::text;
$$;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_order_number() TO anon, authenticated, service_role;
