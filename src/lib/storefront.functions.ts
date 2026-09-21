import { createServerFn } from "@tanstack/react-start";

export type StorefrontSettings = {
  acceptingOrders: boolean;
  closedMessage: string;
  businessName: string;
  parentName: string;
  contactPhone: string;
  whatsappNumber: string;
  momoEnabled: boolean;
  momoNumber: string;
  momoAccountName: string;
  podEnabled: boolean;
  heroImageUrl: string | null;
  heroHeading: string;
  heroSubheading: string;
  promoEnabled: boolean;
  promoMessage: string;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string;
  size: string | null;
  price: number;
  available: boolean;
  imageUrl: string | null;
};

export type StorefrontGalleryItem = {
  id: string;
  title: string;
  caption: string;
  linkUrl: string;
  imageUrl: string | null;
};

export type Storefront = {
  settings: StorefrontSettings;
  products: StorefrontProduct[];
  gallery: StorefrontGalleryItem[];
  locations: string[];
  windows: string[];
};

/** Public: everything the storefront needs, with short-lived image links. */
export const getStorefront = createServerFn({ method: "GET" }).handler(
  async (): Promise<Storefront> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signImagePaths } = await import("@/lib/images.server");
    const { getDeliverySchedule } = await import("@/lib/delivery-schedule");

    const [settingsRes, productsRes, locationsRes, windowsRes, exceptionsRes, galleryRes] =
      await Promise.all([
        supabaseAdmin.from("business_settings").select("*").eq("id", true).maybeSingle(),
        supabaseAdmin
          .from("products")
          .select("id, name, description, size, price, available, image_path, sort_order")
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("delivery_locations")
          .select("name, active, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("delivery_windows")
          .select("id, label, start_time, active, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("delivery_window_exceptions")
          .select("window_id, exception_date, available")
          .gte("exception_date", new Date().toISOString().slice(0, 10)),
        supabaseAdmin
          .from("gallery_items")
          .select(
            "id, title, caption, link_url, image_path, active, sort_order, starts_at, ends_at",
          )
          .eq("active", true)
          .order("sort_order", { ascending: true }),
      ]);

    const s = settingsRes.data;
    const products = productsRes.data ?? [];
    const paths = products.map((p) => p.image_path).filter((p): p is string => !!p);
    const heroPath = s?.hero_image_path ?? null;
    const galleryPaths = (galleryRes.data ?? [])
      .map((item) => item.image_path)
      .filter((path): path is string => !!path);
    const signed = await signImagePaths([
      ...paths,
      ...galleryPaths,
      ...(heroPath ? [heroPath] : []),
    ]);
    const now = Date.now();

    const windows = (windowsRes.data ?? []).filter((window) => {
      const schedule = getDeliverySchedule(window.start_time);
      const exception = (exceptionsRes.data ?? []).find(
        (row) => row.window_id === window.id && row.exception_date === schedule.deliveryDate,
      );

      // A date-specific exception is an explicit override in either direction.
      return exception ? exception.available : schedule.automaticallyAvailable;
    });

    return {
      settings: {
        acceptingOrders: s?.accepting_orders ?? true,
        closedMessage:
          s?.closed_message ?? "We're currently not accepting orders. Please check back later.",
        businessName: s?.business_name ?? "Einyornose",
        parentName: s?.parent_name ?? "Neighbourhood Pulse",
        contactPhone: s?.contact_phone ?? "0555992497",
        whatsappNumber: s?.whatsapp_number ?? "233555992497",
        momoEnabled: s?.momo_enabled ?? true,
        momoNumber: s?.momo_number ?? "0598473399",
        momoAccountName: s?.momo_account_name ?? "Appiah Kofi Okore",
        podEnabled: s?.pod_enabled ?? true,
        heroImageUrl: heroPath ? (signed[heroPath] ?? null) : null,
        heroHeading: s?.hero_heading ?? "Fresh breakfast. Delivered to you.",
        heroSubheading: s?.hero_subheading ?? "Your neighbourhood breakfast, made easy.",
        promoEnabled: s?.promo_enabled ?? false,
        promoMessage: s?.promo_message ?? "",
      },
      products: products
        .filter((p) => p.available)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          size: p.size,
          price: Number(p.price),
          available: p.available,
          imageUrl: p.image_path ? (signed[p.image_path] ?? null) : null,
        })),
      gallery: (galleryRes.data ?? [])
        .filter((item) => {
          const starts = item.starts_at ? new Date(item.starts_at).getTime() : null;
          const ends = item.ends_at ? new Date(item.ends_at).getTime() : null;
          return (starts === null || starts <= now) && (ends === null || ends > now);
        })
        .map((item) => ({
          id: item.id,
          title: item.title,
          caption: item.caption,
          linkUrl: item.link_url,
          imageUrl: item.image_path ? (signed[item.image_path] ?? null) : null,
        })),
      locations: (locationsRes.data ?? []).map((l) => l.name),
      windows: windows.map((window) => window.label),
    };
  },
);
