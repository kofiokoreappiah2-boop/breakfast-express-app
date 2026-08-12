DELETE FROM public.order_audit_log WHERE order_id IN (SELECT id FROM public.orders WHERE order_number IN ('EN-1034','EN-1035','EN-1036'));
DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE order_number IN ('EN-1034','EN-1035','EN-1036'));
DELETE FROM public.orders WHERE order_number IN ('EN-1034','EN-1035','EN-1036');