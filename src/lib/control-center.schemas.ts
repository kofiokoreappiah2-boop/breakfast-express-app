import { z } from "zod";

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  size: z.string().trim().max(40).nullable().default(null),
  price: z.number().min(0).max(100000),
  available: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const locationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const windowSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const windowExceptionSchema = z.object({
  windowId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available: z.boolean(),
  note: z.string().trim().max(200).default(""),
});

export const settingsSchema = z.object({
  acceptingOrders: z.boolean(),
  closedMessage: z.string().trim().max(300),
  businessName: z.string().trim().min(1).max(120),
  parentName: z.string().trim().max(120),
  contactPhone: z.string().trim().max(30),
  whatsappNumber: z.string().trim().max(30),
  momoEnabled: z.boolean(),
  momoNumber: z.string().trim().max(30),
  momoAccountName: z.string().trim().max(120),
  podEnabled: z.boolean(),
  heroHeading: z.string().trim().max(160),
  heroSubheading: z.string().trim().max(240),
  promoEnabled: z.boolean(),
  promoMessage: z.string().trim().max(240),
});

export const imageUploadSchema = z.object({
  target: z.enum(["product", "hero", "gallery"]),
  productId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  fileName: z.string().trim().min(1).max(160),
  contentType: z.string().trim().max(80),
  base64: z.string().min(1).max(8_000_000),
});

export const idSchema = z.object({ id: z.string().uuid() });

export function normalizeGhanaPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^233\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}

export const promotionExclusionSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform(normalizeGhanaPhone)
    .pipe(z.string().regex(/^0\d{9}$/, "Enter a valid 10-digit Ghana phone number.")),
});

export const galleryItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(120),
    caption: z.string().trim().max(300).default(""),
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) =>
          value === "" ||
          (value.startsWith("/") && !value.startsWith("//")) ||
          /^https?:\/\//i.test(value),
        "Use a full http(s) URL or a path beginning with /.",
      )
      .default(""),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    startsAt: z.string().datetime().nullable().default(null),
    endsAt: z.string().datetime().nullable().default(null),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
    message: "The end time must be after the start time.",
    path: ["endsAt"],
  });

export type ProductInput = z.input<typeof productSchema>;
export type LocationInput = z.input<typeof locationSchema>;
export type WindowInput = z.input<typeof windowSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
