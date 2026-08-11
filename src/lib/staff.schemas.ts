import { z } from "zod";

export const staffRoleSchema = z.enum(["owner", "staff"]);

export const inviteStaffSchema = z.object({
  email: z.string().trim().email().max(160),
  role: staffRoleSchema,
});

export const staffUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type InviteStaffInput = z.input<typeof inviteStaffSchema>;
