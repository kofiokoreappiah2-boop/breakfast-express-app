import { z } from "zod";

export const staffRoleSchema = z.enum(["owner", "staff"]);

export const STAFF_PERMISSION_OPTIONS = [
  {
    id: "operations.view",
    label: "Morning operations",
    description: "View supplier totals, delivery stops and the morning run summary.",
  },
  {
    id: "orders.manage",
    label: "Orders",
    description: "View orders and update order and payment status.",
  },
  {
    id: "finance.view",
    label: "Finance overview",
    description: "View sales, income, outstanding payments and expenses.",
  },
  {
    id: "finance.manage",
    label: "Finance management",
    description: "Record or void expenses and reconcile payments.",
  },
] as const;

export const staffPermissionSchema = z.enum([
  "operations.view",
  "orders.manage",
  "finance.view",
  "finance.manage",
]);

export type StaffPermission = z.infer<typeof staffPermissionSchema>;

export const STAFF_PRESETS = {
  operations: {
    label: "Operations staff",
    permissions: ["operations.view", "orders.manage"],
  },
  finance: {
    label: "Finance staff",
    permissions: ["finance.view", "finance.manage"],
  },
  manager: {
    label: "Manager",
    permissions: ["operations.view", "orders.manage", "finance.view", "finance.manage"],
  },
  custom: { label: "Custom", permissions: [] },
} as const satisfies Record<string, { label: string; permissions: readonly StaffPermission[] }>;

export type StaffPreset = keyof typeof STAFF_PRESETS;

export const inviteStaffSchema = z.object({
  email: z.string().trim().email().max(160),
  role: staffRoleSchema,
  permissions: z.array(staffPermissionSchema).max(STAFF_PERMISSION_OPTIONS.length).default([]),
});

export const staffUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
  permissions: z.array(staffPermissionSchema).max(STAFF_PERMISSION_OPTIONS.length).optional(),
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type InviteStaffInput = z.input<typeof inviteStaffSchema>;
