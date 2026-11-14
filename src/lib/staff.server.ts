import type { StaffPermission, StaffRole } from "@/lib/staff.schemas";

export type StaffMember = {
  userId: string;
  email: string;
  role: StaffRole | "admin";
  active: boolean;
  permissions: StaffPermission[];
  createdAt: string;
  isSelf: boolean;
};

/** Every person with access, newest first, with their sign-in email resolved. */
export async function listStaffMembers(currentUserId: string): Promise<StaffMember[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role, active, email, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load the staff list.");

  const userIds = (rows ?? []).map((row) => row.user_id as string);
  const permissionMap = new Map<string, StaffPermission[]>();
  if (userIds.length > 0) {
    const { data: permissions, error: permissionsError } = await supabaseAdmin
      .from("staff_permissions")
      .select("user_id, permission")
      .in("user_id", userIds);
    if (permissionsError) throw new Error("Could not load staff permissions.");
    for (const row of permissions ?? []) {
      const current = permissionMap.get(row.user_id) ?? [];
      current.push(row.permission as StaffPermission);
      permissionMap.set(row.user_id, current);
    }
  }

  const members: StaffMember[] = [];
  for (const row of rows ?? []) {
    let email = (row.email as string | null) ?? "";
    if (!email) {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(row.user_id as string);
      email = user?.user?.email ?? "";
    }
    members.push({
      userId: row.user_id as string,
      email,
      role: row.role as StaffRole | "admin",
      active: row.active as boolean,
      permissions: permissionMap.get(row.user_id as string) ?? [],
      createdAt: row.created_at as string,
      isSelf: row.user_id === currentUserId,
    });
  }
  return members;
}

/** Replace one staff member's exact permission set. Owner accounts need no permission rows. */
export async function setStaffPermissions(
  userId: string,
  permissions: StaffPermission[],
  grantedBy: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const unique = [...new Set(permissions)];
  if (unique.includes("finance.manage") && !unique.includes("finance.view")) {
    unique.push("finance.view");
  }
  const { error: deleteError } = await supabaseAdmin
    .from("staff_permissions")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error("Could not reset that person's permissions.");
  if (unique.length === 0) return;
  const { error: insertError } = await supabaseAdmin.from("staff_permissions").insert(
    unique.map((permission) => ({
      user_id: userId,
      permission,
      granted_by: grantedBy,
    })),
  );
  if (insertError) throw new Error("Could not save that person's permissions.");
}

/** Find an existing auth user by email, or invite a brand new one. */
export async function findOrInviteUser(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.trim().toLowerCase();

  const existing = await findUserIdByEmail(normalized);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalized);
  if (!error && data?.user?.id) return data.user.id;

  // Invitation email could not be sent (or the address raced us) — fall back to
  // creating the account so the owner can share the sign-in details manually.
  const retry = await findUserIdByEmail(normalized);
  if (retry) return retry;

  throw new Error(
    "Could not invite that email address. Ask them to sign up first, then add them here.",
  );
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Guard so the business can never lock itself out of the control center. */
export async function assertNotLastActiveOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("active", true)
    .in("role", ["owner", "admin"]);
  const owners = (data ?? []).map((row) => row.user_id as string);
  if (owners.length <= 1 && owners.includes(userId)) {
    throw new Error("You cannot remove the last active owner.");
  }
}
