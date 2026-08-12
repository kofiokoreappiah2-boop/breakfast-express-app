ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_location_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_window_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_location_check CHECK (char_length(btrim(delivery_location)) > 0 AND char_length(delivery_location) <= 120);
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_window_check CHECK (char_length(btrim(delivery_window)) > 0 AND char_length(delivery_window) <= 120);