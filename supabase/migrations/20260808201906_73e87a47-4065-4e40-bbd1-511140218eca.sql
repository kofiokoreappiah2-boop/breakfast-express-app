
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.order_status AS ENUM ('New','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  size text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE SEQUENCE public.order_number_seq START 1001;
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'EN-' || nextval('public.order_number_seq')::text;
$$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT public.next_order_number(),
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) > 0 AND char_length(customer_name) <= 100),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) > 0 AND char_length(customer_phone) <= 30),
  delivery_location text NOT NULL CHECK (delivery_location IN ('PSI Hall','Medical Hall','CTC Hall','SRC Hall','Superannuation','H. S. Amouno Kuofi Medical Village')),
  delivery_window text NOT NULL CHECK (delivery_window IN ('6:30 AM – 7:15 AM','9:30 AM – 10:15 AM','4:30 PM – 5:30 PM')),
  payment_method text NOT NULL CHECK (payment_method IN ('Mobile Money','Payment on Delivery')),
  additional_instructions text NOT NULL DEFAULT '' CHECK (char_length(additional_instructions) <= 500),
  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status public.order_status NOT NULL DEFAULT 'New',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (status = 'New');
CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can add order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.products (name, description, size, price, sort_order) VALUES
  ('Hausa Porridge', 'Warm, spiced millet porridge — the classic Ghanaian breakfast starter.', NULL, 5.00, 1),
  ('Puff Puff / Bofloat', 'Golden, fluffy fried dough balls. Sweet and soft.', 'Small', 4.00, 2),
  ('Puff Puff / Bofloat', 'Golden, fluffy fried dough balls. Sweet and soft.', 'Large', 6.00, 3),
  ('Koose', 'Crispy spiced bean cakes, fried fresh every morning.', NULL, 1.50, 4),
  ('Roasted Groundnut', 'Freshly roasted groundnuts — the perfect crunchy pairing.', NULL, 1.00, 5),
  ('Sachet Milk', 'Chilled sachet milk to wash it all down.', NULL, 3.00, 6);
