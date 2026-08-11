import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bootstrap helper: the first signed-in user may claim the owner role.
 * Once an owner exists, this always refuses.
 */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .in("role", ["owner", "admin"]);

    if (countError) throw new Error("Could not verify owner access.");
    if ((count ?? 0) > 0) throw new Error("An owner already exists for this store.");

    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: context.userId,
      role: "owner",
      email: context.claims?.["email"] as string | undefined,
      active: true,
    });

    if (error) throw new Error("Could not grant owner access.");
    return { ok: true };
  });

