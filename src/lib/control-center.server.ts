import type { SupabaseClient } from "@supabase/supabase-js";

type AuthContext = { supabase: SupabaseClient; userId: string };

async function activeRoles(context: AuthContext): Promise<string[]> {
  // Read through the caller's own client so row level security applies.
  const { data } = await context.supabase
    .from("user_roles")
    .select("role, active")
    .eq("user_id", context.userId)
    .eq("active", true);
  return (data ?? []).map((row) => row.role as string);
}

/** Throws unless the signed-in caller is an owner (full business access). */
export async function assertOwner(context: AuthContext) {
  const roles = await activeRoles(context);
  if (!roles.includes("owner") && !roles.includes("admin")) {
    throw new Error("Owner access required.");
  }
}

/** Throws unless the caller is owner or staff (order handling access). */
export async function assertStaff(context: AuthContext) {
  const roles = await activeRoles(context);
  if (!roles.some((role) => role === "owner" || role === "admin" || role === "staff")) {
    throw new Error("Staff access required.");
  }
}

/** Legacy alias kept so existing call sites stay valid. */
export const assertAdmin = assertOwner;


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
