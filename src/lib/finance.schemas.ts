import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "Stock and food",
  "Packaging",
  "Transport",
  "Staff payments",
  "Marketing",
  "Equipment",
  "Utilities",
  "Other",
] as const;

export const EXPENSE_PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank transfer", "Other"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const financeRangeSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
});

export const expenseSchema = z.object({
  expenseDate: isoDate,
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(2).max(200),
  supplier: z.string().trim().max(120).default(""),
  amount: z.number().positive().max(1_000_000),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS),
  notes: z.string().trim().max(500).default(""),
});

export const voidExpenseSchema = z.object({ id: z.string().uuid() });
export const reconcileOrderSchema = z.object({ id: z.string().uuid() });
