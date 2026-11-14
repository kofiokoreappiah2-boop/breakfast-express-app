-- Keep staff permission checks efficient and avoid overlapping SELECT policies.
CREATE INDEX staff_permissions_granted_by_idx
  ON public.staff_permissions (granted_by);

DROP POLICY IF EXISTS "Staff read their own permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Owners manage staff permissions" ON public.staff_permissions;

CREATE POLICY "Users read permitted staff permissions"
  ON public.staff_permissions FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR app_private.is_owner((select auth.uid()))
  );

CREATE POLICY "Owners insert staff permissions"
  ON public.staff_permissions FOR INSERT TO authenticated
  WITH CHECK (app_private.is_owner((select auth.uid())));

CREATE POLICY "Owners update staff permissions"
  ON public.staff_permissions FOR UPDATE TO authenticated
  USING (app_private.is_owner((select auth.uid())))
  WITH CHECK (app_private.is_owner((select auth.uid())));

CREATE POLICY "Owners delete staff permissions"
  ON public.staff_permissions FOR DELETE TO authenticated
  USING (app_private.is_owner((select auth.uid())));
