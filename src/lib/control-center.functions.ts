import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  idSchema,
  imageUploadSchema,
  locationSchema,
  productSchema,
  settingsSchema,
  windowExceptionSchema,
  windowSchema,
} from "@/lib/control-center.schemas";

export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  size: string | null;
  price: number;
  available: boolean;
  sortOrder: number;
  imageUrl: string | null;
};

export type AdminLocation = { id: string; name: string; active: boolean; sortOrder: number };

export type AdminWindow = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  active: boolean;
  sortOrder: number;
  exceptions: { id: string; date: string; available: boolean; note: string }[];
};

export type AuditEntry = {
  id: string;
  actionType: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  staffEmail: string | null;
};

/** Admin: everything the Business Control Center renders. */
export const getControlCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signImagePaths } = await import("@/lib/images.server");

    const [settingsRes, productsRes, locationsRes, windowsRes, exceptionsRes] = await Promise.all([
      supabaseAdmin.from("business_settings").select("*").eq("id", true).maybeSingle(),
      supabaseAdmin.from("products").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin.from("delivery_locations").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin.from("delivery_windows").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("delivery_window_exceptions")
        .select("*")
        .order("exception_date", { ascending: true }),
    ]);

    const products = productsRes.data ?? [];
    const s = settingsRes.data;
    const paths = products.map((p) => p.image_path).filter((p): p is string => !!p);
    if (s?.hero_image_path) paths.push(s.hero_image_path);
    const signed = await signImagePaths(paths);

    return {
      settings: {
        acceptingOrders: s?.accepting_orders ?? true,
        closedMessage: s?.closed_message ?? "",
        businessName: s?.business_name ?? "",
        parentName: s?.parent_name ?? "",
        contactPhone: s?.contact_phone ?? "",
        whatsappNumber: s?.whatsapp_number ?? "",
        momoEnabled: s?.momo_enabled ?? true,
        momoNumber: s?.momo_number ?? "",
        momoAccountName: s?.momo_account_name ?? "",
        podEnabled: s?.pod_enabled ?? true,
        heroHeading: s?.hero_heading ?? "",
        heroSubheading: s?.hero_subheading ?? "",
        promoEnabled: s?.promo_enabled ?? false,
        promoMessage: s?.promo_message ?? "",
        heroImageUrl: s?.hero_image_path ? (signed[s.hero_image_path] ?? null) : null,
      },
      products: products.map(
        (p): AdminProduct => ({
          id: p.id,
          name: p.name,
          description: p.description,
          size: p.size,
          price: Number(p.price),
          available: p.available,
          sortOrder: p.sort_order,
          imageUrl: p.image_path ? (signed[p.image_path] ?? null) : null,
        }),
      ),
      locations: (locationsRes.data ?? []).map(
        (l): AdminLocation => ({ id: l.id, name: l.name, active: l.active, sortOrder: l.sort_order }),
      ),
      windows: (windowsRes.data ?? []).map(
        (w): AdminWindow => ({
          id: w.id,
          label: w.label,
          startTime: String(w.start_time).slice(0, 5),
          endTime: String(w.end_time).slice(0, 5),
          active: w.active,
          sortOrder: w.sort_order,
          exceptions: (exceptionsRes.data ?? [])
            .filter((e) => e.window_id === w.id)
            .map((e) => ({ id: e.id, date: e.exception_date, available: e.available, note: e.note })),
        }),
      ),
    };
  });

export const saveBusinessSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("business_settings")
      .update({
        accepting_orders: data.acceptingOrders,
        closed_message: data.closedMessage,
        business_name: data.businessName,
        parent_name: data.parentName,
        contact_phone: data.contactPhone,
        whatsapp_number: data.whatsappNumber,
        momo_enabled: data.momoEnabled,
        momo_number: data.momoNumber,
        momo_account_name: data.momoAccountName,
        pod_enabled: data.podEnabled,
        hero_heading: data.heroHeading,
        hero_subheading: data.heroSubheading,
        promo_enabled: data.promoEnabled,
        promo_message: data.promoMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) throw new Error("Could not save the business settings.");
    return { ok: true };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      name: data.name,
      description: data.description ?? "",
      size: data.size && data.size.length > 0 ? data.size : null,
      price: data.price,
      available: data.available,
      sort_order: data.sortOrder,
      updated_at: new Date().toISOString(),
    };

    const { error } = data.id
      ? await supabaseAdmin.from("products").update(row).eq("id", data.id)
      : await supabaseAdmin.from("products").insert(row);

    if (error) throw new Error("Could not save the menu item.");
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Past orders keep their own copy of the name and price, so removing a
    // product never rewrites history; we only hide it from the storefront.
    const { error } = await supabaseAdmin
      .from("products")
      .update({ available: false, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Could not remove the menu item.");
    return { ok: true };
  });

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => imageUploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin, storeImage, removeImage } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.target === "product") {
      if (!data.productId) throw new Error("Choose a menu item first.");
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select("image_path")
        .eq("id", data.productId)
        .maybeSingle();
      const path = await storeImage("products", data.fileName, data.contentType, data.base64);
      const { error } = await supabaseAdmin
        .from("products")
        .update({ image_path: path, updated_at: new Date().toISOString() })
        .eq("id", data.productId);
      if (error) throw new Error("Could not attach the image.");
      await removeImage(existing?.image_path);
      return { ok: true };
    }

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("hero_image_path")
      .eq("id", true)
      .maybeSingle();
    const path = await storeImage("hero", data.fileName, data.contentType, data.base64);
    const { error } = await supabaseAdmin
      .from("business_settings")
      .update({ hero_image_path: path, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error("Could not update the homepage image.");
    await removeImage(settings?.hero_image_path);
    return { ok: true };
  });

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => locationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      name: data.name,
      active: data.active,
      sort_order: data.sortOrder,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await supabaseAdmin.from("delivery_locations").update(row).eq("id", data.id)
      : await supabaseAdmin.from("delivery_locations").insert(row);
    if (error) throw new Error("Could not save the delivery location.");
    return { ok: true };
  });

export const saveWindow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => windowSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      label: data.label,
      start_time: data.startTime,
      end_time: data.endTime,
      active: data.active,
      sort_order: data.sortOrder,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await supabaseAdmin.from("delivery_windows").update(row).eq("id", data.id)
      : await supabaseAdmin.from("delivery_windows").insert(row);
    if (error) throw new Error("Could not save the delivery period.");
    return { ok: true };
  });

export const saveWindowException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => windowExceptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("delivery_window_exceptions").upsert(
      {
        window_id: data.windowId,
        exception_date: data.date,
        available: data.available,
        note: data.note ?? "",
      },
      { onConflict: "window_id,exception_date" },
    );
    if (error) throw new Error("Could not save the date exception.");
    return { ok: true };
  });

export const deleteWindowException = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/control-center.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("delivery_window_exceptions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Could not remove the date exception.");
    return { ok: true };
  });

/** Admin: change history for one order. */
export const getOrderHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    const { assertStaff } = await import("@/lib/control-center.server");
    await assertStaff(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("order_audit_log")
      .select("id, action_type, previous_value, new_value, created_at, staff_user_id")
      .eq("order_id", data.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load the order history.");

    const staffIds = [...new Set((rows ?? []).map((r) => r.staff_user_id).filter(Boolean))];
    const emails = new Map<string, string>();
    for (const id of staffIds) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(id as string);
      if (user?.user?.email) emails.set(id as string, user.user.email);
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      actionType: r.action_type,
      previousValue: r.previous_value,
      newValue: r.new_value,
      createdAt: r.created_at,
      staffEmail: r.staff_user_id ? (emails.get(r.staff_user_id) ?? null) : null,
    }));
  });

export type ControlCenterData = Awaited<ReturnType<typeof getControlCenter>>;
