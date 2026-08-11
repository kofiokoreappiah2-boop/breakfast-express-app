import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/constants";
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
  deliveryLocation: z.string().trim().min(1).max(120),
  deliveryWindow: z.string().trim().min(1).max(120),
  paymentMethod: z.enum(PAYMENT_METHODS),
  additionalInstructions: z.string().trim().max(500).default(""),
  // Stable per checkout attempt so refreshes and double clicks reuse one order.
  clientRequestId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1, "Your cart is empty")
    .max(30),
});

export type CreateOrderInput = z.input<typeof orderSchema>;

const BUSY_MESSAGE =
  "We're unable to process this order right now. Please wait a moment and try again.";

// A single household phone stays tightly limited, while a shared Wi-Fi network
// (one IP, many students) gets far more headroom so real customers get through.
const PHONE_LIMIT_10_MIN = 5;
const PHONE_LIMIT_HOUR = 15;
const IP_LIMIT_10_MIN = 40;
const IP_LIMIT_HOUR = 120;


export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    // --- Same attempt already placed? Return it instead of ordering twice ----
    if (data.clientRequestId) {
      const existing = await loadReceiptByRequestId(supabaseAdmin, data.clientRequestId);
      if (existing) return existing;
    }

    // --- Server-side throttle (never trusts the browser) ---------------------
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip =
      forwarded.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const phoneKey = data.customerPhone.replace(/\D/g, "");
    const ipKey = `ip:${ip}`;
    const phoneKeyed = `phone:${phoneKey}`;

    const since10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const since60 = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const countFor = async (key: string, since: string) => {
      const { count } = await supabaseAdmin
        .from("checkout_throttle")
        .select("id", { count: "exact", head: true })
        .eq("client_key", key)
        .gte("created_at", since);
      return count ?? 0;
    };

    // Each key is counted on its own — mixing them made two orders look like
    // four and blocked genuine customers.
    const [phone10, phone60, ip10, ip60] = await Promise.all([
      countFor(phoneKeyed, since10),
      countFor(phoneKeyed, since60),
      countFor(ipKey, since10),
      countFor(ipKey, since60),
    ]);

    if (
      phone10 >= PHONE_LIMIT_10_MIN ||
      phone60 >= PHONE_LIMIT_HOUR ||
      ip10 >= IP_LIMIT_10_MIN ||
      ip60 >= IP_LIMIT_HOUR
    ) {
      throw new Error(BUSY_MESSAGE);
    }

    await supabaseAdmin
      .from("checkout_throttle")
      .insert([{ client_key: ipKey }, { client_key: phoneKeyed }]);
    // Housekeeping: drop records older than a day.
    void supabaseAdmin
      .from("checkout_throttle")
      .delete()
      .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());


    // --- Business availability ----------------------------------------------
    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select(
        "accepting_orders, closed_message, momo_enabled, pod_enabled, momo_number, momo_account_name",
      )
      .eq("id", true)
      .maybeSingle();

    if (settings && !settings.accepting_orders) {
      throw new Error(
        settings.closed_message ||
          "We're currently not accepting orders. Please check back later.",
      );
    }

    if (data.paymentMethod === "Mobile Money" && settings && !settings.momo_enabled) {
      throw new Error("Mobile Money is unavailable right now. Please choose another option.");
    }
    if (data.paymentMethod === "Payment on Delivery" && settings && !settings.pod_enabled) {
      throw new Error(
        "Payment on delivery is unavailable right now. Please choose another option.",
      );
    }

    // --- Delivery location / window must currently be active -----------------
    const today = new Date().toISOString().slice(0, 10);
    const [locationRes, windowRes] = await Promise.all([
      supabaseAdmin
        .from("delivery_locations")
        .select("id")
        .eq("name", data.deliveryLocation)
        .eq("active", true)
        .maybeSingle(),
      supabaseAdmin
        .from("delivery_windows")
        .select("id")
        .eq("label", data.deliveryWindow)
        .eq("active", true)
        .maybeSingle(),
    ]);

    if (!locationRes.data) {
      throw new Error("That delivery location isn't available. Please choose another one.");
    }
    if (!windowRes.data) {
      throw new Error("That delivery period isn't available. Please choose another one.");
    }

    const { data: exception } = await supabaseAdmin
      .from("delivery_window_exceptions")
      .select("available")
      .eq("window_id", windowRes.data.id)
      .eq("exception_date", today)
      .maybeSingle();

    if (exception && !exception.available) {
      throw new Error("That delivery period isn't available today. Please choose another one.");
    }

    // --- Pricing (always from the database) ----------------------------------
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
      .select(
        "id, order_number, subtotal, total, created_at, payment_status, additional_instructions",
      )
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
