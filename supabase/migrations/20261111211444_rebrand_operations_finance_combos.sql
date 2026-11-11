-- Rebrand operating model: one morning run, Sunday-Friday service,
-- ready-made combos, and owner-only finance records.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS order_open_time time NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS order_cutoff_time time NOT NULL DEFAULT '05:45',
  ADD COLUMN IF NOT EXISTS delivery_start_time time NOT NULL DEFAULT '06:30',
  ADD COLUMN IF NOT EXISTS delivery_end_time time NOT NULL DEFAULT '07:15',
  ADD COLUMN IF NOT EXISTS service_days smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5]::smallint[];

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_service_days_check;
ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_service_days_check
  CHECK (service_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(service_days) > 0);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'item';
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_kind_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_kind_check CHECK (kind IN ('item', 'combo'));

CREATE TABLE IF NOT EXISTS public.combo_components (
  combo_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  component_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (combo_product_id, component_product_id),
  CHECK (combo_product_id <> component_product_id)
);

ALTER TABLE public.combo_components ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.combo_components TO anon, authenticated;
GRANT ALL ON public.combo_components TO service_role;
DROP POLICY IF EXISTS "Anyone can view combo components" ON public.combo_components;
CREATE POLICY "Anyone can view combo components"
  ON public.combo_components FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Owners manage combo components" ON public.combo_components;
CREATE POLICY "Owners manage combo components"
  ON public.combo_components FOR ALL TO authenticated
  USING (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT current_date,
  category text NOT NULL CHECK (category IN (
    'Stock and food', 'Packaging', 'Transport', 'Staff payments',
    'Marketing', 'Equipment', 'Utilities', 'Other'
  )),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 200),
  supplier text NOT NULL DEFAULT '' CHECK (char_length(supplier) <= 120),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'Bank transfer', 'Other')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  receipt_path text,
  status text NOT NULL DEFAULT 'Posted' CHECK (status IN ('Posted', 'Voided')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON public.expenses(expense_date DESC);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
DROP POLICY IF EXISTS "Owners manage expenses" ON public.expenses;
CREATE POLICY "Owners manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.expense_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('Created', 'Updated', 'Voided')),
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_audit_log_expense_id_idx
  ON public.expense_audit_log(expense_id, created_at DESC);
ALTER TABLE public.expense_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.expense_audit_log TO authenticated;
GRANT ALL ON public.expense_audit_log TO service_role;
DROP POLICY IF EXISTS "Owners view expense audit log" ON public.expense_audit_log;
CREATE POLICY "Owners view expense audit log"
  ON public.expense_audit_log FOR SELECT TO authenticated
  USING (
    app_private.has_role((select auth.uid()), 'owner'::public.app_role)
    OR app_private.has_role((select auth.uid()), 'admin'::public.app_role)
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Replace the operational configuration only on the rebrand database branch.
DELETE FROM public.delivery_window_exceptions;
DELETE FROM public.delivery_windows;
INSERT INTO public.delivery_windows (label, start_time, end_time, active, sort_order)
VALUES ('6:30 AM – 7:15 AM', '06:30', '07:15', true, 1);

DELETE FROM public.delivery_locations;
INSERT INTO public.delivery_locations (name, active, sort_order) VALUES
  ('CTC Main Classroom', true, 1),
  ('CTC Pavilion A', true, 2),
  ('CTC Pavilion B', true, 3),
  ('CTC Pavilion C', true, 4),
  ('CCTH', true, 5),
  ('Medical Hall', true, 6),
  ('PSI Hall', true, 7),
  ('SRC Hall', true, 8),
  ('Superannuation Hall', true, 9);

-- Combos carry the exact sum of their components; no introductory discount.
INSERT INTO public.products (name, description, size, price, available, sort_order, kind)
SELECT seed.name, seed.description, seed.size, seed.price, true, seed.sort_order, 'combo'
FROM (VALUES
  ('Quick Fuel', 'Hausa porridge with roasted groundnuts for a simple morning start.', 'Combo', 7.00, true, 20, 'combo'),
  ('Gym Morning', 'Hausa porridge, two koose, roasted groundnuts and sachet milk.', 'Combo', 15.00, true, 21, 'combo'),
  ('Big Morning', 'Hausa porridge, large bofloat, three koose and sachet milk.', 'Combo', 21.00, true, 22, 'combo'),
  ('Koose Pack', 'Hausa porridge, four koose and roasted groundnuts.', 'Combo', 15.00, true, 23, 'combo')
) AS seed(name, description, size, price, available, sort_order, kind)
WHERE NOT EXISTS (
  SELECT 1 FROM public.products existing
  WHERE existing.name = seed.name AND existing.kind = 'combo'
);

INSERT INTO public.combo_components (combo_product_id, component_product_id, quantity)
SELECT combo.id, component.id, mapping.quantity
FROM (VALUES
  ('Quick Fuel', 'Hausa Porridge', NULL::text, 1),
  ('Quick Fuel', 'Roasted Groundnut', NULL::text, 1),
  ('Gym Morning', 'Hausa Porridge', NULL::text, 1),
  ('Gym Morning', 'Koose', NULL::text, 2),
  ('Gym Morning', 'Roasted Groundnut', NULL::text, 1),
  ('Gym Morning', 'Sachet Milk', NULL::text, 1),
  ('Big Morning', 'Hausa Porridge', NULL::text, 1),
  ('Big Morning', 'Puff Puff / Bofloat', 'Large', 1),
  ('Big Morning', 'Koose', NULL::text, 3),
  ('Big Morning', 'Sachet Milk', NULL::text, 1),
  ('Koose Pack', 'Hausa Porridge', NULL::text, 1),
  ('Koose Pack', 'Koose', NULL::text, 4),
  ('Koose Pack', 'Roasted Groundnut', NULL::text, 1)
) AS mapping(combo_name, component_name, component_size, quantity)
JOIN public.products combo ON combo.name = mapping.combo_name AND combo.kind = 'combo'
JOIN public.products component
  ON component.name = mapping.component_name
  AND component.kind = 'item'
  AND component.size IS NOT DISTINCT FROM mapping.component_size
ON CONFLICT (combo_product_id, component_product_id)
DO UPDATE SET quantity = excluded.quantity;
