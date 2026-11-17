CREATE INDEX manual_sales_created_by_idx ON public.manual_sales(created_by);
CREATE INDEX manual_sale_audit_log_staff_user_id_idx
  ON public.manual_sale_audit_log(staff_user_id);
