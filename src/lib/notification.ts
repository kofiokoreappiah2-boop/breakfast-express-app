import { formatCedis } from "@/lib/format";

export type NotificationOrder = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  deliveryWindow: string;
  paymentMethod: string;
  additionalInstructions: string;
  total: number;
  items: { name: string; size: string | null; quantity: number; subtotal: number }[];
};

/**
 * Builds the formatted WhatsApp notification text for a new order.
 * Version 1 only prepares the message — a WhatsApp Business API integration
 * can consume this exact payload later without changing the ordering flow.
 */
export function buildOrderNotification(order: NotificationOrder): string {
  const lines = order.items
    .map(
      (i) =>
        `${i.name}${i.size ? ` (${i.size})` : ""} × ${i.quantity} — ${formatCedis(i.subtotal)}`,
    )
    .join("\n");

  return [
    "🔔 NEW EINYORNOSE ORDER",
    "",
    `Order: #${order.orderNumber}`,
    "",
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Location: ${order.deliveryLocation}`,
    `Delivery: ${order.deliveryWindow}`,
    "",
    "ORDER:",
    lines,
    "",
    `TOTAL: ${formatCedis(order.total)}`,
    "",
    `Payment: ${order.paymentMethod}`,
    "",
    `Instructions: ${order.additionalInstructions || "None"}`,
  ].join("\n");
}
