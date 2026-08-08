export const BUSINESS = {
  name: "Einyornose",
  parent: "Neighbourhood Pulse",
  tagline: "Fresh breakfast. Delivered to you.",
  subTagline: "Your neighbourhood breakfast, made easy.",
  phone: "0555992497",
  whatsappUrl: "https://wa.me/233555992497",
  momoNumber: "0598473398",
  momoAccountName: "Appiah Kofi Okore",
} as const;

export const DELIVERY_LOCATIONS = [
  "PSI Hall",
  "Medical Hall",
  "CTC Hall",
  "SRC Hall",
  "Superannuation",
  "H. S. Amouno Kuofi Medical Village",
] as const;

export const DELIVERY_WINDOWS = [
  "6:30 AM – 7:15 AM",
  "9:30 AM – 10:15 AM",
  "4:30 PM – 5:30 PM",
] as const;

export const PAYMENT_METHODS = ["Mobile Money", "Payment on Delivery"] as const;

export const ORDER_STATUSES = [
  "New",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
] as const;

export type DeliveryLocation = (typeof DELIVERY_LOCATIONS)[number];
export type DeliveryWindow = (typeof DELIVERY_WINDOWS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
