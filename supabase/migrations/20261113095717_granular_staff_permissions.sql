-- Hybrid staff access: presets in the application, exact permissions in the database.
CREATE TABLE public.staff_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN (
    'operations.view',
    'orders.manage',
    'finance.view',
    'finance.manage'
  )),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;

CREATE POLICY "Staff read their own permissions"
  ON public.staff_permissions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owners manage staff permissions"
  ON public.staff_permissions FOR ALL TO authenticated
  USING (app_private.is_owner((select auth.uid())))
  WITH CHECK (app_private.is_owner((select auth.uid())));

CREATE OR REPLACE FUNCTION app_private.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    app_private.is_owner(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles roles
      JOIN public.staff_permissions permissions ON permissions.user_id = roles.user_id
      WHERE roles.user_id = _user_id
        AND roles.role = 'staff'::public.app_role
        AND roles.active
        AND permissions.permission = _permission
    );
$$;

REVOKE ALL ON FUNCTION app_private.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_permission(uuid, text) TO authenticated, service_role;

-- Orders are read and changed only by owners or staff explicitly granted Orders access.
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
CREATE POLICY "Permitted staff can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (app_private.has_permission((select auth.uid()), 'orders.manage'));

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Permitted staff can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (app_private.has_permission((select auth.uid()), 'orders.manage'))
  WITH CHECK (app_private.has_permission((select auth.uid()), 'orders.manage'));

DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
CREATE POLICY "Permitted staff can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (app_private.has_permission((select auth.uid()), 'orders.manage'));

DROP POLICY IF EXISTS "Staff can view audit log" ON public.order_audit_log;
CREATE POLICY "Permitted staff can view order audit log"
  ON public.order_audit_log FOR SELECT TO authenticated
  USING (app_private.has_permission((select auth.uid()), 'orders.manage'));
