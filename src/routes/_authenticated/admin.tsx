import { Fragment, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LogOut, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCedis } from "@/lib/format";
import {
  BUSINESS,
  DELIVERY_LOCATIONS,
  DELIVERY_WINDOWS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { claimAdmin } from "@/lib/admin.functions";
import { getMyAccess } from "@/lib/staff.functions";
import { getOrderHistory } from "@/lib/control-center.functions";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Order Dashboard — Einyornose" },
      { name: "description", content: "Manage Einyornose breakfast orders." },
      { property: "og:title", content: "Order Dashboard — Einyornose" },
      { property: "og:description", content: "Manage Einyornose breakfast orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_location: string;
  delivery_window: string;
  payment_method: string;
  payment_status: PaymentStatus;
  additional_instructions: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
};

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const claim = useServerFn(claimAdmin);

  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const setFilter = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const [expanded, setExpanded] = useState<string | null>(null);

  const loadAccess = useServerFn(getMyAccess);
  const rolesQuery = useQuery({
    queryKey: ["my-access"],
    queryFn: () => loadAccess({}),
  });

  const isStaff = rolesQuery.data?.isStaff === true;
  const isOwner = rolesQuery.data?.isOwner === true;

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    enabled: isStaff,

    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_phone, delivery_location, delivery_window, payment_method, payment_status, additional_instructions, subtotal, total, status, created_at, order_items(id, product_name, quantity, unit_price, subtotal)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
    onError: () => toast.error("Could not update the order status."),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: paymentStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
    onError: () => toast.error("Could not update the payment status."),
  });

  const orders = ordersQuery.data ?? [];

  const filtered = useMemo(() => filterOrders(orders as ReportOrder[], filters), [orders, filters]);
  const summary = useMemo(() => summarise(filtered), [filtered]);
  const totalSales = summary.totalSales;

  const locationOptions = useMemo(
    () => [...new Set(orders.map((o) => o.delivery_location))].sort(),
    [orders],
  );
  const windowOptions = useMemo(
    () => [...new Set(orders.map((o) => o.delivery_window))].sort(),
    [orders],
  );

  function handlePrint() {
    if (filtered.length === 0) {
      toast.error("No orders match these filters.");
      return;
    }
    const html = buildPrintHtml(filtered, BUSINESS.name, describeRange(filters));
    const win = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!win) {
      toast.error("Please allow pop-ups to print the delivery sheet.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("No orders match these filters.");
      return;
    }
    const csv = buildCsv(filtered);
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `einyornose-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (rolesQuery.isLoading) {
    return <p className="p-8 text-center text-muted-foreground">Checking your access…</p>;
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Staff access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have access yet. If you are the {BUSINESS.name} owner setting up the
          store for the first time, you can claim owner access now. Otherwise ask the owner to
          invite you from the control center.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await claim({});
              toast.success("You are now the owner.");
              void rolesQuery.refetch();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not grant owner access.",
              );
            }
          }}
          className="mt-6 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          Claim owner access
        </button>

        <button
          type="button"
          onClick={signOut}
          className="mt-3 h-11 w-full rounded-xl border border-border text-sm font-medium"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
              Order dashboard
            </h1>
            <Link to="/" className="text-xs text-muted-foreground underline">
              Back to {BUSINESS.name} store
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isOwner ? (
              <Link
                to="/settings"
                className="inline-flex h-11 items-center rounded-xl border border-border px-3 text-sm font-medium"
              >
                Control center
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => void ordersQuery.refetch()}
              aria-label="Refresh orders"
              className="grid h-11 w-11 place-items-center rounded-xl border border-border"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="grid h-11 w-11 place-items-center rounded-xl border border-border"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Orders shown" value={String(filtered.length)} />
          <Stat label="Total sales" value={formatCedis(totalSales)} />
          <Stat
            label="New orders"
            value={String(filtered.filter((o) => o.status === "New").length)}
          />
        </div>

        <div className="surface-card mt-4 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Filter &amp; report</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="h-10 rounded-xl border border-border px-3 text-sm font-medium"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium"
              >
                <Printer className="h-4 w-4" aria-hidden="true" /> Print orders
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-semibold">
              Date range
              <select
                className={`${selectClass} mt-1`}
                value={filters.preset}
                onChange={(e) => setFilter("preset", e.target.value as OrderFilters["preset"])}
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This week</option>
                <option value="last-week">Last week</option>
                <option value="this-month">This month</option>
                <option value="custom">Custom range</option>
              </select>
            </label>

            {filters.preset === "custom" ? (
              <>
                <label className="block text-sm font-semibold">
                  From
                  <input
                    type="date"
                    className={`${selectClass} mt-1`}
                    value={filters.from}
                    onChange={(e) => setFilter("from", e.target.value)}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  To
                  <input
                    type="date"
                    className={`${selectClass} mt-1`}
                    value={filters.to}
                    onChange={(e) => setFilter("to", e.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label className="block text-sm font-semibold">
              Delivery location
              <select
                className={`${selectClass} mt-1`}
                value={filters.location}
                onChange={(e) => setFilter("location", e.target.value)}
              >
                <option value="all">All locations</option>
                {locationOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Delivery window
              <select
                className={`${selectClass} mt-1`}
                value={filters.window}
                onChange={(e) => setFilter("window", e.target.value)}
              >
                <option value="all">All windows</option>
                {windowOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Order status
              <select
                className={`${selectClass} mt-1`}
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="all">All statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Payment status
              <select
                className={`${selectClass} mt-1`}
                value={filters.paymentStatus}
                onChange={(e) => setFilter("paymentStatus", e.target.value)}
              >
                <option value="all">All payment statuses</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Payment method
              <select
                className={`${selectClass} mt-1`}
                value={filters.paymentMethod}
                onChange={(e) => setFilter("paymentMethod", e.target.value)}
              >
                <option value="all">All payment methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Customer name
              <input
                className={`${selectClass} mt-1`}
                value={filters.customerName}
                onChange={(e) => setFilter("customerName", e.target.value)}
                placeholder="Search name"
              />
            </label>

            <label className="block text-sm font-semibold">
              Phone number
              <input
                className={`${selectClass} mt-1`}
                value={filters.customerPhone}
                onChange={(e) => setFilter("customerPhone", e.target.value)}
                placeholder="Search phone"
                inputMode="tel"
              />
            </label>

            <label className="block text-sm font-semibold">
              Order number
              <input
                className={`${selectClass} mt-1`}
                value={filters.orderNumber}
                onChange={(e) => setFilter("orderNumber", e.target.value)}
                placeholder="e.g. EN-1012"
              />
            </label>
          </div>

          <p className="text-sm text-muted-foreground">
            {summary.count} order(s) · sales {formatCedis(summary.totalSales)} · paid{" "}
            {summary.paidCount} ({formatCedis(summary.paidTotal)}) · pending{" "}
            {summary.pendingCount} ({formatCedis(summary.pendingTotal)})
          </p>
        </div>


        {ordersQuery.isLoading ? (
          <p className="mt-8 text-center text-muted-foreground">Loading orders…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No orders match these filters.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="mt-4 space-y-3 lg:hidden">
              {filtered.map((order) => (
                <li key={order.id} className="surface-card p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold">#{order.order_number}</p>
                      <p className="truncate text-sm">Customer: {order.customer_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customer_phone}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <Line label="Location" value={order.delivery_location} />
                    <Line label="Delivery" value={order.delivery_window} />
                    <Line label="Payment" value={order.payment_method} />
                    <Line label="Payment status" value={order.payment_status} />
                    <Line label="Total" value={formatCedis(Number(order.total))} />
                  </dl>
                  <OrderItems order={order} />
                  <Instructions order={order} />
                  <OrderHistory orderId={order.id} />
                  <StatusSelect
                    order={order}
                    onChange={(status) => updateStatus.mutate({ id: order.id, status })}
                  />
                  <PaymentStatusSelect
                    order={order}
                    onChange={(paymentStatus) =>
                      updatePayment.mutate({ id: order.id, paymentStatus })
                    }
                  />

                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="surface-card mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Delivery</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Payment status</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <Fragment key={order.id}>
                      <tr className="align-top">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="font-semibold underline"
                            onClick={() =>
                              setExpanded(expanded === order.id ? null : order.id)
                            }
                          >
                            #{order.order_number}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {order.customer_name}
                          <span className="block text-xs text-muted-foreground">
                            {order.customer_phone}
                          </span>
                        </td>
                        <td className="px-4 py-3">{order.delivery_location}</td>
                        <td className="px-4 py-3">{order.delivery_window}</td>
                        <td className="px-4 py-3">{order.payment_method}</td>
                        <td className="px-4 py-3">
                          <PaymentStatusSelect
                            order={order}
                            onChange={(paymentStatus) =>
                              updatePayment.mutate({ id: order.id, paymentStatus })
                            }
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCedis(Number(order.total))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusSelect
                            order={order}
                            onChange={(status) => updateStatus.mutate({ id: order.id, status })}
                          />
                        </td>
                      </tr>
                      {expanded === order.id ? (
                        <tr>
                          <td colSpan={8} className="bg-secondary/40 px-4 py-3">
                            <OrderItems order={order} />
                            <Instructions order={order} />
                            <OrderHistory orderId={order.id} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
      {status}
    </span>
  );
}

function OrderItems({ order }: { order: OrderRow }) {
  return (
    <ul className="mt-3 space-y-1 rounded-xl bg-secondary/60 p-3 text-sm">
      {order.order_items.map((item) => (
        <li key={item.id} className="flex justify-between gap-3">
          <span className="min-w-0">
            {item.product_name} × {item.quantity}
          </span>
          <span className="shrink-0 font-semibold">{formatCedis(Number(item.subtotal))}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusSelect({
  order,
  onChange,
}: {
  order: OrderRow;
  onChange: (status: OrderStatus) => void;
}) {
  return (
    <select
      aria-label={`Status for order ${order.order_number}`}
      className={`${selectClass} mt-3 lg:mt-0 lg:w-44`}
      value={order.status}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
    >
      {ORDER_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function PaymentStatusSelect({
  order,
  onChange,
}: {
  order: OrderRow;
  onChange: (paymentStatus: PaymentStatus) => void;
}) {
  return (
    <select
      aria-label={`Payment status for order ${order.order_number}`}
      className={`${selectClass} mt-3 lg:mt-0 lg:w-36`}
      value={order.payment_status}
      onChange={(e) => onChange(e.target.value as PaymentStatus)}
    >
      {PAYMENT_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function OrderHistory({ orderId }: { orderId: string }) {
  const load = useServerFn(getOrderHistory);
  const history = useQuery({
    queryKey: ["order-history", orderId],
    queryFn: () => load({ data: { id: orderId } }),
  });

  return (
    <div className="mt-3 rounded-xl border border-border p-3 text-sm">
      <p className="font-semibold">Change history</p>
      {history.isLoading ? (
        <p className="mt-1 text-muted-foreground">Loading history…</p>
      ) : (history.data?.length ?? 0) === 0 ? (
        <p className="mt-1 text-muted-foreground">No staff changes recorded yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {history.data?.map((entry) => (
            <li key={entry.id} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {entry.actionType === "payment_status" ? "Payment status" : "Order status"}
              </span>{" "}
              {entry.previousValue ?? "—"} → {entry.newValue ?? "—"} ·{" "}
              {new Date(entry.createdAt).toLocaleString()}
              {entry.staffEmail ? ` · ${entry.staffEmail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Instructions({ order }: { order: OrderRow }) {
  return (
    <div className="mt-3 rounded-xl border border-border p-3 text-sm">
      <p className="font-semibold">Additional Delivery Instructions</p>
      <p className="mt-1 text-muted-foreground">
        {order.additional_instructions?.trim() ? order.additional_instructions : "None provided"}
      </p>
    </div>
  );
}
