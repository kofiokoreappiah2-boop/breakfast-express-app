import type { StaffRole } from "@/lib/staff.schemas";

export type StaffMember = {
  userId: string;
  email: string;
  role: StaffRole | "admin";
  active: boolean;
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
      createdAt: row.created_at as string,
      isSelf: row.user_id === currentUserId,
    });
  }
  return members;
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
