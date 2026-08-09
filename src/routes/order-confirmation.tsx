import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { formatCedis } from "@/lib/format";
import { BUSINESS } from "@/lib/constants";
import { readReceipt, type StoredReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/order-confirmation")({
  head: () => ({
    meta: [
      { title: "Order Received — Einyornose" },
      { name: "description", content: "Your Einyornose breakfast order has been received." },
      { property: "og:title", content: "Order Received — Einyornose" },
      { property: "og:description", content: "Your breakfast order has been received." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReceipt(readReceipt());
    setReady(true);
  }, []);

  function buildPlainText(r: StoredReceipt): string {
    const lines = [
      `${BUSINESS.name} — Order #${r.orderNumber}`,
      `Name: ${r.customerName}`,
      `Phone: ${r.customerPhone}`,
      `Delivery location: ${r.deliveryLocation}`,
      `Delivery window: ${r.deliveryWindow}`,
      `Payment method: ${r.paymentMethod}`,
      `Payment status: ${r.paymentStatus}`,
      `Instructions: ${r.additionalInstructions || "None"}`,
      "Items:",
      ...r.items.map(
        (i) =>
          `  - ${i.name}${i.size ? ` (${i.size})` : ""} x${i.quantity} = ${formatCedis(i.subtotal)}`,
      ),
      `Total: ${formatCedis(r.total)}`,
    ];
    return lines.join("\n");
  }

  async function shareOrder() {
    if (!receipt) return;
    const text = buildPlainText(receipt);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `Order #${receipt.orderNumber}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Order details copied to your clipboard.");
    } catch {
      // User cancelled the share sheet — nothing to report.
    }
  }

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {!ready ? null : !receipt ? (
          <div className="surface-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold">No recent order found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your order details are only kept for this browsing session.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
            >
              Back to Menu
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Order Received! 🎉</h1>
              <p className="mt-2 font-display text-2xl font-bold text-primary">
                #{receipt.orderNumber}
              </p>
            </div>

            <div className="surface-card mt-6 space-y-4 p-5">
              <Row label="Customer" value={receipt.customerName} />
              <Row label="Phone" value={receipt.customerPhone} />
              <Row label="Delivery location" value={receipt.deliveryLocation} />
              <Row label="Delivery window" value={receipt.deliveryWindow} />
              <Row label="Payment method" value={receipt.paymentMethod} />
              <Row label="Payment status" value={receipt.paymentStatus} />
              <Row
                label="Additional delivery instructions"
                value={receipt.additionalInstructions || "None"}
              />


              <div className="border-t border-border pt-3">
                <p className="text-sm font-semibold">Items ordered</p>
                <ul className="mt-2 divide-y divide-border">
                  {receipt.items.map((item, index) => (
                    <li
                      key={`${item.name}-${index}`}
                      className="flex items-start justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        {item.name}
                        {item.size ? ` (${item.size})` : ""} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-semibold">{formatCedis(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total amount</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatCedis(receipt.total)}
                </span>
              </div>
            </div>

            {receipt.paymentMethod === "Mobile Money" ? (
              <div className="surface-card mt-4 p-5 text-sm">
                <p className="font-semibold">Complete your Mobile Money payment</p>
                <p className="mt-2">
                  MoMo Number: <span className="font-bold">{BUSINESS.momoNumber}</span>
                </p>
                <p>
                  Account Name: <span className="font-bold">{BUSINESS.momoAccountName}</span>
                </p>
              </div>
            ) : null}

            <p className="mt-6 text-center text-base">
              Thank you for ordering from {BUSINESS.name}. Your breakfast will be delivered during
              your selected delivery period.
            </p>

            <Link
              to="/"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            >
              Back to Menu
            </Link>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
