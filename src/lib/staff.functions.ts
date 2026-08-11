import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { inviteStaffSchema, staffUpdateSchema } from "@/lib/staff.schemas";

/** Who the signed-in user is, and what they're allowed to do. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role, active")
      .eq("user_id", context.userId)
      .eq("active", true);

    const roles = (data ?? []).map((row) => row.role as string);
    const isOwner = roles.includes("owner") || roles.includes("admin");
    const isStaff = isOwner || roles.includes("staff");
    return { isOwner, isStaff, roles };
  });

/** Owner: list everyone with access. */
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { listStaffMembers } = await import("@/lib/staff.server");
    return listStaffMembers(context.userId);
  });

/** Owner: invite someone by email and grant them a role. */
export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteStaffSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { findOrInviteUser } = await import("@/lib/staff.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const userId = await findOrInviteUser(data.email);

    const { error } = await supabaseAdmin.from("user_roles").upsert(
      {
        user_id: userId,
        role: data.role,
        email: data.email.trim().toLowerCase(),
        active: true,
        invited_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role" },
    );
    if (error) throw new Error("Could not grant access to that email address.");
    return { ok: true };
  });

/** Owner: change a person's role or switch their access on and off. */
export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => staffUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertOwner } = await import("@/lib/control-center.server");
    await assertOwner(context);
    const { assertNotLastActiveOwner } = await import("@/lib/staff.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.active === false || data.role === "staff") {
      await assertNotLastActiveOwner(data.userId);
    }

    if (data.role) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role, updated_at: new Date().toISOString() })
        .eq("user_id", data.userId);
      if (error) throw new Error("Could not change that person's role.");
    }

    if (typeof data.active === "boolean") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ active: data.active, updated_at: new Date().toISOString() })
        .eq("user_id", data.userId);
      if (error) throw new Error("Could not change that person's access.");
    }

    return { ok: true };
  });

export type StaffList = Awaited<ReturnType<typeof listStaff>>;
