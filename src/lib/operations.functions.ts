import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { money } from "@/lib/format";

export const getMorningOperations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/control-center.server");
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOrderSchedule } = await import("@/lib/delivery-schedule");
    const schedule = getOrderSchedule();

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, delivery_location, status, total, payment_status, order_items(product_id, product_name, quantity)",
      )
      .eq("delivery_date", schedule.deliveryDate)
      .neq("status", "Cancelled")
      .order("created_at", { ascending: true });
    if (error) throw new Error("Could not load the morning operations list.");

    const productIds = [
      ...new Set(
        (orders ?? []).flatMap((order) =>
          (order.order_items ?? [])
            .map((item) => item.product_id)
            .filter((id): id is string => !!id),
        ),
      ),
    ];
    const { data: components } = productIds.length
      ? await supabaseAdmin
          .from("combo_components")
          .select("combo_product_id, component_product_id, quantity")
          .in("combo_product_id", productIds)
      : { data: [] };
    const componentIds = [...new Set((components ?? []).map((item) => item.component_product_id))];
    const { data: componentProducts } = componentIds.length
      ? await supabaseAdmin.from("products").select("id, name, size").in("id", componentIds)
      : { data: [] };

    const supplierTotals = new Map<string, number>();
    for (const order of orders ?? []) {
      for (const item of order.order_items ?? []) {
        const comboParts = (components ?? []).filter(
          (component) => component.combo_product_id === item.product_id,
        );
        if (comboParts.length === 0) {
          supplierTotals.set(
            item.product_name,
            (supplierTotals.get(item.product_name) ?? 0) + item.quantity,
          );
          continue;
        }
        for (const part of comboParts) {
          const product = (componentProducts ?? []).find(
            (entry) => entry.id === part.component_product_id,
          );
          if (!product) continue;
          const name = product.size ? `${product.name} (${product.size})` : product.name;
          supplierTotals.set(name, (supplierTotals.get(name) ?? 0) + item.quantity * part.quantity);
        }
      }
    }

    const locationMap = new Map<string, number>();
    for (const order of orders ?? []) {
      locationMap.set(order.delivery_location, (locationMap.get(order.delivery_location) ?? 0) + 1);
    }

    return {
      deliveryDate: schedule.deliveryDate,
      windowLabel: schedule.windowLabel,
      orderingOpen: schedule.orderingOpen,
      orderCount: (orders ?? []).length,
      expectedSales: money((orders ?? []).reduce((sum, order) => sum + Number(order.total), 0)),
      paidOrders: (orders ?? []).filter((order) => order.payment_status === "Paid").length,
      supplierTotals: [...supplierTotals.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      locations: [...locationMap.entries()].map(([name, ordersAtLocation]) => ({
        name,
        orders: ordersAtLocation,
      })),
    };
  });
