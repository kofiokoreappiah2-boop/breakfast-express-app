import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Administrator access required.");
}

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  size: z.string().trim().max(40).nullable().default(null),
  price: z.number().min(0).max(100000),
  available: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const locationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const windowSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const settingsSchema = z.object({
  acceptingOrders: z.boolean(),
  closedMessage: z.string().trim().max(300),
  businessName: z.string().trim().min(1).max(120),
  parentName: z.string().trim().max(120),
  contactPhone: z.string().trim().max(30),
  whatsappNumber: z.string().trim().max(30),
  momoEnabled: z.boolean(),
  momoNumber: z.string().trim().max(30),
  momoAccountName: z.string().trim().max(120),
  podEnabled: z.boolean(),
  heroHeading: z.string().trim().max(160),
  heroSubheading: z.string().trim().max(240),
  promoEnabled: z.boolean(),
  promoMessage: z.string().trim().max(240),
});

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

/** Admin: everything the Business Control Center renders. */
export const getControlCenter = createServerFn({ method: "GET" })
  .middleware([
    (await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth,
  ])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signImagePaths } = await import("@/lib/images.server");

    const [settingsRes, productsRes, locationsRes, windowsRes, exceptionsRes] = await Promise.all([
      supabaseAdmin.from("business_settings").select("*").eq("id", true).maybeSingle(),
      supabaseAdmin.from("products").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("delivery_locations")
        .select("*")
        .order("sort_order", { ascending: true }),
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
        (l): AdminLocation => ({
          id: l.id,
          name: l.name,
          active: l.active,
          sortOrder: l.sort_order,
        }),
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
            .map((e) => ({
              id: e.id,
              date: e.exception_date,
              available: e.available,
              note: e.note,
            })),
        }),
      ),
    };
  });

export type ControlCenterData = Awaited<ReturnType<typeof getControlCenter>>;
