import type { SupabaseClient } from "@supabase/supabase-js";

/** Throws unless the signed-in caller holds the admin role. */
export async function assertAdmin(context: { supabase: SupabaseClient; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Administrator access required.");
}

const BUCKET = "product-images";

/** Decode a base64 payload and store it in the private images bucket. */
export async function storeImage(
  prefix: string,
  fileName: string,
  contentType: string,
  base64: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, binary, {
    contentType: contentType || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("Could not upload the image.");
  return path;
}

export async function removeImage(path: string | null | undefined) {
  if (!path) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}
