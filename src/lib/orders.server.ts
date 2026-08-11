import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredReceipt } from "@/lib/receipt";

/**
 * Rebuild the customer receipt for an order that was already created by this
 * exact checkout attempt. Used so a refresh or a double click never produces a
 * second order — we simply hand back the first one.
 */
export async function loadReceiptByRequestId(
  supabaseAdmin: SupabaseClient,
  clientRequestId: string,
): Promise<StoredReceipt | null> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, delivery_location, delivery_window, payment_method, payment_status, additional_instructions, subtotal, total",
    )
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity, unit_price, subtotal")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    deliveryLocation: order.delivery_location,
    deliveryWindow: order.delivery_window,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    additionalInstructions: order.additional_instructions ?? "",
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    items: (items ?? []).map((item) => ({
      name: item.product_name as string,
      size: null,
      quantity: item.quantity as number,
      unitPrice: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    })),
  };
}
