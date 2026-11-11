import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, PackageCheck, Route as RouteIcon, WalletCards } from "lucide-react";
import { StaffNav } from "@/components/StaffNav";
import { formatCedis } from "@/lib/format";
import { getMyAccess } from "@/lib/staff.functions";
import { getMorningOperations } from "@/lib/operations.functions";

export const Route = createFileRoute("/_authenticated/staff/dashboard")({
  head: () => ({ meta: [{ title: "Staff — Einyornose" }, { name: "robots", content: "noindex" }] }),
  component: StaffDashboard,
});

function StaffDashboard() {
  const loadAccess = useServerFn(getMyAccess);
  const loadOperations = useServerFn(getMorningOperations);
  const access = useQuery({ queryKey: ["my-access"], queryFn: () => loadAccess({}) });
  const operations = useQuery({
    queryKey: ["morning-operations"],
    queryFn: () => loadOperations({}),
    enabled: access.data?.isStaff === true,
  });

  if (access.isLoading) return <p className="p-10 text-center">Checking staff access…</p>;
  if (!access.data?.isStaff) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Staff access required</h1>
        <p className="mt-3 text-muted-foreground">Ask the owner to activate your account.</p>
        <Link
          to="/admin"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          Set up owner access
        </Link>
      </main>
    );
  }

  const data = operations.data;
  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
              Morning control
            </p>
            <h1 className="mt-1 text-3xl font-bold">Today’s run</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.deliveryDate ?? "Loading…"} · {data?.windowLabel ?? "6:30 AM – 7:15 AM"}
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground"
          >
            <ClipboardList className="h-4 w-4" /> Open orders
          </Link>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Orders" value={String(data?.orderCount ?? 0)} />
          <Metric label="Expected sales" value={formatCedis(data?.expectedSales ?? 0)} />
          <Metric label="Payments marked paid" value={String(data?.paidOrders ?? 0)} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <PackageCheck className="h-5 w-5 text-primary" /> Supplier totals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Final quantities to collect after the 5:45 AM cutoff.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {(data?.supplierTotals ?? []).map((item) => (
                <li key={item.name} className="flex justify-between gap-4 py-3">
                  <span>{item.name}</span>
                  <strong>{item.quantity}</strong>
                </li>
              ))}
              {data && data.supplierTotals.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">No orders yet.</li>
              ) : null}
            </ul>
          </div>
          <div className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <RouteIcon className="h-5 w-5 text-primary" /> Delivery stops
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Orders grouped by collection point.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {(data?.locations ?? []).map((location) => (
                <li key={location.name} className="flex justify-between gap-4 py-3">
                  <span>{location.name}</span>
                  <strong>{location.orders}</strong>
                </li>
              ))}
              {data && data.locations.length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">No delivery stops yet.</li>
              ) : null}
            </ul>
          </div>
        </section>

        {access.data.isOwner ? (
          <Link
            to="/staff/finance"
            className="surface-card mt-6 flex items-center justify-between gap-4 p-5 hover:border-primary"
          >
            <span>
              <strong className="block text-lg">Finance</strong>
              <span className="text-sm text-muted-foreground">
                Record expenses and reconcile income.
              </span>
            </span>
            <WalletCards className="h-6 w-6 text-primary" />
          </Link>
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
