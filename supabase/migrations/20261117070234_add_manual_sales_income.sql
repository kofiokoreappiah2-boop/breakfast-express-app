CREATE TABLE public.manual_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL DEFAULT current_date,
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 200),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'Bank transfer', 'Other')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'Posted' CHECK (status IN ('Posted', 'Voided')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX manual_sales_sale_date_idx ON public.manual_sales(sale_date DESC);
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.manual_sales TO authenticated;
GRANT ALL ON public.manual_sales TO service_role;

CREATE POLICY "Owners manage manual sales"
  ON public.manual_sales FOR ALL TO authenticated
  USING (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  );

CREATE TABLE public.manual_sale_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_sale_id uuid NOT NULL REFERENCES public.manual_sales(id) ON DELETE RESTRICT,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('Created', 'Voided')),
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX manual_sale_audit_log_sale_id_idx
  ON public.manual_sale_audit_log(manual_sale_id, created_at DESC);
ALTER TABLE public.manual_sale_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.manual_sale_audit_log TO authenticated;
GRANT ALL ON public.manual_sale_audit_log TO service_role;

CREATE POLICY "Owners view manual sale audit log"
  ON public.manual_sale_audit_log FOR SELECT TO authenticated
  USING (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
