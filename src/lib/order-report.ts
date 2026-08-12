/**
 * Read-only helpers for the admin order report: filtering, CSV export and the
 * printable delivery sheet. Nothing here writes to the database.
 */
import { formatCedis } from "@/lib/format";

export type ReportOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_location: string;
  delivery_window: string;
  payment_method: string;
  payment_status: string;
  additional_instructions: string;
  total: number;
  status: string;
  created_at: string;
  order_items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
};

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "custom";

export type OrderFilters = {
  preset: DatePreset;
  from: string; // yyyy-mm-dd, used when preset === "custom"
  to: string;
  location: string;
  window: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
};

export const EMPTY_FILTERS: OrderFilters = {
  preset: "all",
  from: "",
  to: "",
  location: "all",
  window: "all",
  status: "all",
  paymentStatus: "all",
  paymentMethod: "all",
  customerName: "",
  customerPhone: "",
  orderNumber: "",
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday-based start of the week containing `date`. */
function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
}

/** Resolves a preset (or custom range) into an inclusive [start, end) range. */
export function resolveRange(filters: OrderFilters, now = new Date()): [Date | null, Date | null] {
  switch (filters.preset) {
    case "today":
      return [startOfDay(now), addDays(startOfDay(now), 1)];
    case "yesterday":
      return [addDays(startOfDay(now), -1), startOfDay(now)];
    case "this-week":
      return [startOfWeek(now), addDays(startOfWeek(now), 7)];
    case "last-week":
      return [addDays(startOfWeek(now), -7), startOfWeek(now)];
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return [start, end];
    }
    case "custom": {
      const start = filters.from ? startOfDay(new Date(`${filters.from}T00:00:00`)) : null;
      const end = filters.to ? addDays(startOfDay(new Date(`${filters.to}T00:00:00`)), 1) : null;
      return [start, end];
    }
    default:
      return [null, null];
  }
}

const contains = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

const digits = (value: string) => value.replace(/\D/g, "");

export function filterOrders(
  orders: ReportOrder[],
  filters: OrderFilters,
  now = new Date(),
): ReportOrder[] {
  const [start, end] = resolveRange(filters, now);
  return orders.filter((order) => {
    const created = new Date(order.created_at);
    if (start && created < start) return false;
    if (end && created >= end) return false;
    if (filters.location !== "all" && order.delivery_location !== filters.location) return false;
    if (filters.window !== "all" && order.delivery_window !== filters.window) return false;
    if (filters.status !== "all" && order.status !== filters.status) return false;
    if (filters.paymentStatus !== "all" && order.payment_status !== filters.paymentStatus)
      return false;
    if (filters.paymentMethod !== "all" && order.payment_method !== filters.paymentMethod)
      return false;
    if (filters.customerName && !contains(order.customer_name, filters.customerName)) return false;
    if (filters.customerPhone) {
      const needle = digits(filters.customerPhone);
      if (needle && !digits(order.customer_phone).includes(needle)) return false;
    }
    if (filters.orderNumber && !contains(order.order_number, filters.orderNumber)) return false;
    return true;
  });
}

export type ReportSummary = {
  count: number;
  totalSales: number;
  paidCount: number;
  paidTotal: number;
  pendingCount: number;
  pendingTotal: number;
};

export function summarise(orders: ReportOrder[]): ReportSummary {
  const live = orders.filter((o) => o.status !== "Cancelled");
  const paid = live.filter((o) => o.payment_status === "Paid");
  const pending = live.filter((o) => o.payment_status === "Pending");
  const sum = (rows: ReportOrder[]) => rows.reduce((total, o) => total + Number(o.total), 0);
  return {
    count: orders.length,
    totalSales: sum(live),
    paidCount: paid.length,
    paidTotal: sum(paid),
    pendingCount: pending.length,
    pendingTotal: sum(pending),
  };
}

export function itemsLabel(order: ReportOrder): string {
  return order.order_items.map((i) => `${i.product_name} x${i.quantity}`).join("; ");
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(orders: ReportOrder[]): string {
  const header = [
    "Order number",
    "Date",
    "Time",
    "Customer name",
    "Phone",
    "Items",
    "Total (GHS)",
    "Delivery location",
    "Delivery window",
    "Payment method",
    "Payment status",
    "Order status",
    "Instructions",
  ];
  const rows = orders.map((order) => {
    const created = new Date(order.created_at);
    return [
      order.order_number,
      created.toLocaleDateString("en-GB"),
      created.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      order.customer_name,
      order.customer_phone,
      itemsLabel(order),
      Number(order.total).toFixed(2),
      order.delivery_location,
      order.delivery_window,
      order.payment_method,
      order.payment_status,
      order.status,
      order.additional_instructions ?? "",
    ].map(csvCell);
  });
  return [header.map(csvCell).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

const escapeHtml = (value: string) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/** Groups orders by delivery location, then by delivery window. */
export function groupForPrint(orders: ReportOrder[]) {
  const byLocation = new Map<string, Map<string, ReportOrder[]>>();
  for (const order of orders) {
    const windows = byLocation.get(order.delivery_location) ?? new Map<string, ReportOrder[]>();
    const list = windows.get(order.delivery_window) ?? [];
    list.push(order);
    windows.set(order.delivery_window, list);
    byLocation.set(order.delivery_location, windows);
  }
  return [...byLocation.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([location, windows]) => ({
      location,
      windows: [...windows.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, list]) => ({ label, orders: list })),
    }));
}

/** Builds a standalone A4 delivery sheet — no navigation or admin chrome. */
export function buildPrintHtml(
  orders: ReportOrder[],
  businessName: string,
  rangeLabel: string,
): string {
  const summary = summarise(orders);
  const groups = groupForPrint(orders);

  const body = groups
    .map(
      (group) => `
      <section class="loc">
        <h2>${escapeHtml(group.location)}</h2>
        ${group.windows
          .map(
            (win) => `
          <h3>${escapeHtml(win.label)} — ${win.orders.length} order(s)</h3>
          <table>
            <thead><tr>
              <th>Order</th><th>Customer</th><th>Phone</th><th>Items</th>
              <th>Total</th><th>Payment</th><th>Pay status</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${win.orders
                .map(
                  (order) => `<tr>
                    <td><strong>#${escapeHtml(order.order_number)}</strong><br><span class="muted">${new Date(
                      order.created_at,
                    ).toLocaleString("en-GB")}</span></td>
                    <td>${escapeHtml(order.customer_name)}</td>
                    <td>${escapeHtml(order.customer_phone)}</td>
                    <td>${order.order_items
                      .map((i) => `${escapeHtml(i.product_name)} &times; ${i.quantity}`)
                      .join("<br>")}${
                        order.additional_instructions
                          ? `<div class="muted">Note: ${escapeHtml(order.additional_instructions)}</div>`
                          : ""
                      }</td>
                    <td>${escapeHtml(formatCedis(Number(order.total)))}</td>
                    <td>${escapeHtml(order.payment_method)}</td>
                    <td>${escapeHtml(order.payment_status)}</td>
                    <td>${escapeHtml(order.status)}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>`,
          )
          .join("")}
      </section>`,
    )
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(businessName)} — delivery sheet</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.4 "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 16pt; margin: 0 0 2mm; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 4mm; }
  .summary { border: 1px solid #999; padding: 3mm; margin-bottom: 6mm; display: flex; flex-wrap: wrap; gap: 6mm; font-size: 10pt; }
  .summary div strong { display: block; font-size: 12pt; }
  .loc { page-break-inside: auto; margin-bottom: 6mm; }
  h2 { font-size: 13pt; border-bottom: 2px solid #111; padding-bottom: 1mm; margin: 5mm 0 2mm; }
  h3 { font-size: 11pt; margin: 3mm 0 1mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { border: 1px solid #bbb; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
  th { background: #eee; }
  tr { page-break-inside: avoid; }
  .muted { color: #666; font-size: 8.5pt; }
</style></head><body>
<h1>${escapeHtml(businessName)} — order &amp; delivery sheet</h1>
<div class="meta">${escapeHtml(rangeLabel)} · printed ${new Date().toLocaleString("en-GB")}</div>
<div class="summary">
  <div><strong>${summary.count}</strong>Total orders</div>
  <div><strong>${escapeHtml(formatCedis(summary.totalSales))}</strong>Total sales</div>
  <div><strong>${summary.paidCount} · ${escapeHtml(formatCedis(summary.paidTotal))}</strong>Paid orders</div>
  <div><strong>${summary.pendingCount} · ${escapeHtml(formatCedis(summary.pendingTotal))}</strong>Pending payments</div>
</div>
${body || "<p>No orders match the current filters.</p>"}
<script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`;
}
