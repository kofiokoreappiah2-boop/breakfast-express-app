-- 1. AUDIT LOG
CREATE TABLE public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  staff_user_id uuid,
  action_type text NOT NULL,
  previous_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_audit_log_order_id_idx ON public.order_audit_log(order_id, created_at DESC);
GRANT SELECT ON public.order_audit_log TO authenticated;
GRANT ALL ON public.order_audit_log TO service_role;
ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON public.order_audit_log
  FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_audit_log(order_id, staff_user_id, action_type, previous_value, new_value)
    VALUES (NEW.id, auth.uid(), 'order_status', OLD.status::text, NEW.status::text);
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_audit_log(order_id, staff_user_id, action_type, previous_value, new_value)
    VALUES (NEW.id, auth.uid(), 'payment_status', OLD.payment_status::text, NEW.payment_status::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_audit_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_changes();

-- 2. DELIVERY LOCATIONS
CREATE TABLE public.delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_locations TO authenticated;
GRANT ALL ON public.delivery_locations TO service_role;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery locations" ON public.delivery_locations
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage delivery locations" ON public.delivery_locations
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.delivery_locations (name, sort_order) VALUES
  ('PSI Hall', 1),
  ('Medical Hall', 2),
  ('CTC Hall', 3),
  ('SRC Hall', 4),
  ('Superannuation', 5),
  ('H. S. Amouno Kuofi Medical Village', 6);

-- 3. DELIVERY WINDOWS
CREATE TABLE public.delivery_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_windows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_windows TO authenticated;
GRANT ALL ON public.delivery_windows TO service_role;
ALTER TABLE public.delivery_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery windows" ON public.delivery_windows
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage delivery windows" ON public.delivery_windows
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.delivery_windows (label, start_time, end_time, sort_order) VALUES
  ('6:30 AM – 7:15 AM', '06:30', '07:15', 1),
  ('9:30 AM – 10:15 AM', '09:30', '10:15', 2),
  ('4:30 PM – 5:30 PM', '16:30', '17:30', 3);

-- 4. DATE-SPECIFIC WINDOW AVAILABILITY
CREATE TABLE public.delivery_window_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES public.delivery_windows(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  available boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (window_id, exception_date)
);
GRANT SELECT ON public.delivery_window_exceptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_window_exceptions TO authenticated;
GRANT ALL ON public.delivery_window_exceptions TO service_role;
ALTER TABLE public.delivery_window_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view window exceptions" ON public.delivery_window_exceptions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage window exceptions" ON public.delivery_window_exceptions
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

-- 5. BUSINESS SETTINGS (single row)
CREATE TABLE public.business_settings (
  id boolean PRIMARY KEY DEFAULT true,
  accepting_orders boolean NOT NULL DEFAULT true,
  closed_message text NOT NULL DEFAULT 'We''re currently not accepting orders. Please check back later.',
  business_name text NOT NULL DEFAULT 'Einyornose',
  parent_name text NOT NULL DEFAULT 'Neighbourhood Pulse',
  contact_phone text NOT NULL DEFAULT '0555992497',
  whatsapp_number text NOT NULL DEFAULT '233555992497',
  momo_enabled boolean NOT NULL DEFAULT true,
  momo_number text NOT NULL DEFAULT '0598473398',
  momo_account_name text NOT NULL DEFAULT 'Appiah Kofi Okore',
  pod_enabled boolean NOT NULL DEFAULT true,
  hero_image_path text,
  hero_heading text NOT NULL DEFAULT 'Fresh breakfast. Delivered to you.',
  hero_subheading text NOT NULL DEFAULT 'Your neighbourhood breakfast, made easy.',
  promo_enabled boolean NOT NULL DEFAULT false,
  promo_message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_settings_singleton CHECK (id)
);
GRANT SELECT ON public.business_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view business settings" ON public.business_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage business settings" ON public.business_settings
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.business_settings (id) VALUES (true);

-- 6. PRODUCT IMAGES
ALTER TABLE public.products ADD COLUMN image_path text;
ALTER TABLE public.products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- 7. CHECKOUT THROTTLE (server-only)
CREATE TABLE public.checkout_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkout_throttle_key_idx ON public.checkout_throttle(client_key, created_at DESC);
GRANT ALL ON public.checkout_throttle TO service_role;
ALTER TABLE public.checkout_throttle ENABLE ROW LEVEL SECURITY;

-- 8. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER delivery_locations_updated_at BEFORE UPDATE ON public.delivery_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER delivery_windows_updated_at BEFORE UPDATE ON public.delivery_windows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER business_settings_updated_at BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();