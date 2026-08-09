export const RECEIPT_STORAGE_KEY = "einyornose.receipt.v1";

export type StoredReceipt = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  deliveryWindow: string;
  paymentMethod: string;
  paymentStatus: string;
  additionalInstructions: string;
  subtotal: number;
  total: number;
  items: {
    name: string;
    size: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

export function readReceipt(): StoredReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RECEIPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReceipt;
    return parsed && typeof parsed.orderNumber === "string" ? parsed : null;
  } catch {
    return null;
  }
}
