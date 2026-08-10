import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "product-images";
const EXPIRY_SECONDS = 60 * 60 * 6;

/** Create short-lived read links for private bucket image paths. */
export async function signImagePaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(unique, EXPIRY_SECONDS);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}
