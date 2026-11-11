import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CircleCheckBig, Plus, ReceiptText } from "lucide-react";
import { StaffNav } from "@/components/StaffNav";
import { formatCedis } from "@/lib/format";
import { getMyAccess } from "@/lib/staff.functions";
import {
  addExpense,
  getFinanceSummary,
  reconcileOrder,
  voidExpense,
} from "@/lib/finance.functions";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from "@/lib/finance.schemas";

export const Route = createFileRoute("/_authenticated/staff/finance")({
  head: () => ({
    meta: [{ title: "Finance — Einyornose" }, { name: "robots", content: "noindex" }],
  }),
  component: FinancePage,
});

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;

function FinancePage() {
  const queryClient = useQueryClient();
  const loadAccess = useServerFn(getMyAccess);
  const loadFinance = useServerFn(getFinanceSummary);
  const createExpense = useServerFn(addExpense);
  const markReconciled = useServerFn(reconcileOrder);
  const markVoided = useServerFn(voidExpense);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [form, setForm] = useState({
    expenseDate: today(),
    category: EXPENSE_CATEGORIES[0],
    description: "",
    supplier: "",
    amount: "",
    paymentMethod: EXPENSE_PAYMENT_METHODS[0],
    notes: "",
  });
  const access = useQuery({ queryKey: ["my-access"], queryFn: () => loadAccess({}) });
  const finance = useQuery({
    queryKey: ["finance", startDate, endDate],
    queryFn: () => loadFinance({ data: { startDate, endDate } }),
    enabled: access.data?.isOwner === true,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance"] });
  const expenseMutation = useMutation({
    mutationFn: () => createExpense({ data: { ...form, amount: Number(form.amount) } }),
    onSuccess: () => {
      toast.success("Expense recorded");
      setForm((current) => ({ ...current, description: "", supplier: "", amount: "", notes: "" }));
      void refresh();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save expense."),
  });
  const reconcileMutation = useMutation({
    mutationFn: (id: string) => markReconciled({ data: { id } }),
    onSuccess: () => {
      toast.success("Payment reconciled");
      void refresh();
    },
    onError: () => toast.error("Could not reconcile payment."),
  });
  const voidMutation = useMutation({
    mutationFn: (id: string) => markVoided({ data: { id } }),
    onSuccess: () => {
      toast.success("Expense voided");
      void refresh();
    },
    onError: () => toast.error("Could not void expense."),
  });

  const summary = finance.data?.summary;
  const unreconciled = useMemo(
    () =>
      (finance.data?.orders ?? []).filter(
        (order) => order.status !== "Cancelled" && !order.reconciledAt,
      ),
    [finance.data?.orders],
  );

  if (access.isLoading) return <p className="p-10 text-center">Checking access…</p>;
  if (!access.data?.isOwner) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Owner access required</h1>
        <p className="mt-3 text-muted-foreground">Finance records are restricted to the owner.</p>
        <Link
          to="/staff/dashboard"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          Back to staff portal
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Owner only</p>
            <h1 className="mt-1 text-3xl font-bold">Finance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Income comes from website orders. Enter only business expenses manually.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-xs font-semibold">
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="text-xs font-semibold">
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </label>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Booked sales" value={formatCedis(summary?.bookedSales ?? 0)} />
          <Metric label="Income received" value={formatCedis(summary?.receivedIncome ?? 0)} />
          <Metric label="Outstanding" value={formatCedis(summary?.outstanding ?? 0)} />
          <Metric label="Expenses" value={formatCedis(summary?.expenses ?? 0)} />
          <Metric label="Net cash" value={formatCedis(summary?.netCash ?? 0)} highlight />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            className="surface-card p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!form.description.trim() || Number(form.amount) <= 0) {
                toast.error("Add a description and valid amount.");
                return;
              }
              expenseMutation.mutate();
            }}
          >
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Plus className="h-5 w-5 text-primary" /> Record expense
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Date
                <input
                  type="date"
                  className={`${fieldClass} mt-1`}
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                Amount
                <input
                  inputMode="decimal"
                  className={`${fieldClass} mt-1`}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold">
                Category
                <select
                  className={`${fieldClass} mt-1`}
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as typeof form.category })
                  }
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Paid with
                <select
                  className={`${fieldClass} mt-1`}
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })
                  }
                >
                  {EXPENSE_PAYMENT_METHODS.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Description
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What was purchased?"
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Supplier
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Notes
                <textarea
                  className="mt-1 min-h-20 w-full rounded-xl border border-input bg-card p-3 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
            </div>
            <button
              disabled={expenseMutation.isPending}
              className="mt-4 h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
            >
              {expenseMutation.isPending ? "Saving…" : "Save expense"}
            </button>
          </form>

          <div className="surface-card overflow-hidden">
            <div className="p-5">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <CircleCheckBig className="h-5 w-5 text-primary" /> Payment reconciliation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirm cash and MoMo that the business has actually received.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-secondary text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unreconciled.slice(0, 12).map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-semibold">{order.orderNumber}</td>
                      <td className="px-4 py-3">{order.paymentMethod}</td>
                      <td className="px-4 py-3">{formatCedis(order.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => reconcileMutation.mutate(order.id)}
                          className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary"
                        >
                          Mark received
                        </button>
                      </td>
                    </tr>
                  ))}
                  {unreconciled.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No payments waiting for reconciliation.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="surface-card mt-6 overflow-hidden">
          <div className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ReceiptText className="h-5 w-5 text-primary" /> Expense register
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-secondary text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(finance.data?.expenses ?? []).map((expense) => (
                  <tr key={expense.id} className={expense.status === "Voided" ? "opacity-50" : ""}>
                    <td className="px-4 py-3">{expense.expenseDate}</td>
                    <td className="px-4 py-3">{expense.category}</td>
                    <td className="px-4 py-3 font-semibold">{expense.description}</td>
                    <td className="px-4 py-3">{expense.supplier || "—"}</td>
                    <td className="px-4 py-3">{formatCedis(expense.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      {expense.status === "Posted" ? (
                        <button
                          onClick={() => voidMutation.mutate(expense.id)}
                          className="text-xs font-semibold text-destructive underline"
                        >
                          Void
                        </button>
                      ) : (
                        <span className="text-xs">Voided</span>
                      )}
                    </td>
                  </tr>
                ))}
                {finance.data?.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No expenses in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`surface-card p-4 ${highlight ? "border-primary bg-primary text-primary-foreground" : ""}`}
    >
      <p
        className={`text-xs font-semibold uppercase ${highlight ? "text-primary-foreground/75" : "text-muted-foreground"}`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
