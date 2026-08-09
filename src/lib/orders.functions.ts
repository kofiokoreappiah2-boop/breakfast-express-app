import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DELIVERY_LOCATIONS,
  DELIVERY_WINDOWS,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { buildOrderNotification } from "@/lib/notification";
import { money } from "@/lib/format";

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Name is too short").max(100),
  customerPhone: z
    .string()
    .trim()
    .min(9, "Phone number is too short")
    .max(20)
    .regex(/^[0-9+\s-]+$/, "Phone number looks invalid"),
  deliveryLocation: z.enum(DELIVERY_LOCATIONS),
  deliveryWindow: z.enum(DELIVERY_WINDOWS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  additionalInstructions: z.string().trim().max(500).default(""),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "Your cart is empty"),
});

export type CreateOrderInput = z.input<typeof orderSchema>;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, size, price, available")
      .in("id", ids);

    if (productError) throw new Error("Could not load the menu. Please try again.");

    const rows = data.items.map((item) => {
      const product = products?.find((p) => p.id === item.productId);
      if (!product || !product.available) {
        throw new Error("One of the items in your cart is no longer available.");
      }
      const unitPrice = Number(product.price);
      return {
        product_id: product.id,
        product_name: product.size ? `${product.name} (${product.size})` : product.name,
        name: product.name,
        size: product.size,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: money(unitPrice * item.quantity),
      };
    });

    const subtotal = money(rows.reduce((sum, r) => sum + r.subtotal, 0));

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_location: data.deliveryLocation,
        delivery_window: data.deliveryWindow,
        payment_method: data.paymentMethod,
        additional_instructions: data.additionalInstructions ?? "",
        subtotal,
        total: subtotal,
      })
      .select("id, order_number, subtotal, total, created_at, payment_status, additional_instructions")
      .single();

    if (orderError || !order) throw new Error("We couldn't place your order. Please try again.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      rows.map((r) => ({
        order_id: order.id,
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.quantity,
        unit_price: r.unit_price,
        subtotal: r.subtotal,
      })),
    );

    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("We couldn't save your order items. Please try again.");
    }

    const receipt = {
      orderNumber: order.order_number,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryLocation: data.deliveryLocation,
      deliveryWindow: data.deliveryWindow,
      paymentMethod: data.paymentMethod,
      paymentStatus: order.payment_status as string,
      additionalInstructions: order.additional_instructions ?? "",
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      items: rows.map((r) => ({
        name: r.name,
        size: r.size,
        quantity: r.quantity,
        unitPrice: r.unit_price,
        subtotal: r.subtotal,
      })),
    };

    // Prepared for a future WhatsApp Business API integration.
    console.log(buildOrderNotification(receipt));

    return receipt;
  });

export type OrderReceipt = Awaited<ReturnType<typeof createOrder>>;
