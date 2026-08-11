-- 1. Staff records ---------------------------------------------------------
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.user_roles SET role = 'owner' WHERE role = 'admin';

DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Role helpers -----------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND active
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND active AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION app_private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND active AND role IN ('owner', 'admin', 'staff')
  );
$$;

-- 3. Owner-only business configuration --------------------------------------
DROP POLICY IF EXISTS "Admins manage business settings" ON public.business_settings;
CREATE POLICY "Owners manage business settings" ON public.business_settings
  FOR ALL TO authenticated
  USING (app_private.is_owner(auth.uid()))
  WITH CHECK (app_private.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Owners manage products" ON public.products
  FOR ALL TO authenticated
  USING (app_private.is_owner(auth.uid()))
  WITH CHECK (app_private.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins manage delivery locations" ON public.delivery_locations;
CREATE POLICY "Owners manage delivery locations" ON public.delivery_locations
  FOR ALL TO authenticated
  USING (app_private.is_owner(auth.uid()))
  WITH CHECK (app_private.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins manage delivery windows" ON public.delivery_windows;
CREATE POLICY "Owners manage delivery windows" ON public.delivery_windows
  FOR ALL TO authenticated
  USING (app_private.is_owner(auth.uid()))
  WITH CHECK (app_private.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins manage window exceptions" ON public.delivery_window_exceptions;
CREATE POLICY "Owners manage window exceptions" ON public.delivery_window_exceptions
  FOR ALL TO authenticated
  USING (app_private.is_owner(auth.uid()))
  WITH CHECK (app_private.is_owner(auth.uid()));

-- 4. Staff may work with orders ---------------------------------------------
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Staff can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (app_private.is_staff(auth.uid()))
  WITH CHECK (app_private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view order items" ON public.order_items;
CREATE POLICY "Staff can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view audit log" ON public.order_audit_log;
CREATE POLICY "Staff can view audit log" ON public.order_audit_log
  FOR SELECT TO authenticated
  USING (app_private.is_staff(auth.uid()));

-- 5. Staff directory visibility ---------------------------------------------
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can read all staff" ON public.user_roles
  FOR SELECT TO authenticated
  USING (app_private.is_owner(auth.uid()));

-- 6. Duplicate-order protection ---------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_key
  ON public.orders (client_request_id) WHERE client_request_id IS NOT NULL;