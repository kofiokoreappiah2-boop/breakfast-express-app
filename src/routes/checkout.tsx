import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import { BUSINESS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { useStorefront } from "@/lib/use-storefront";
import { createOrder } from "@/lib/orders.functions";
import { RECEIPT_STORAGE_KEY } from "@/lib/receipt";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Einyornose" },
      {
        name: "description",
        content: "Confirm your delivery hall, delivery period and payment method.",
      },
      { property: "og:title", content: "Checkout — Einyornose" },
      { property: "og:description", content: "Confirm delivery details and place your order." },
    ],
  }),
  component: CheckoutPage,
});

type Errors = Partial<Record<string, string>>;

const fieldClass =
  "h-12 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, total, clearCart } = useCart();
  const submitOrder = useServerFn(createOrder);
  const { data: storefront } = useStorefront();
  const settings = storefront?.settings;
  const locations = storefront?.locations ?? [];
  const windows = storefront?.windows ?? [];
  const paymentMethods: PaymentMethod[] = PAYMENT_METHODS.filter((method) =>
    method === "Mobile Money"
      ? (settings?.momoEnabled ?? true)
      : (settings?.podEnabled ?? true),
  );
  const acceptingOrders = settings?.acceptingOrders ?? true;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [window_, setWindow] = useState("");
  const [payment, setPayment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  // One id per checkout attempt: retries and double clicks reuse the same
  // order instead of creating a new one.
  const requestIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  function validate(): boolean {
    const next: Errors = {};
    if (name.trim().length < 2) next["name"] = "Please tell us your name.";
    if (!/^[0-9+\s-]{9,20}$/.test(phone.trim()))
      next["phone"] = "Please enter a valid phone number so we can reach you.";
    if (!location) next["location"] = "Please choose your delivery location.";
    if (!window_) next["window"] = "Please choose a delivery period.";
    if (!payment) next["payment"] = "Please choose how you'd like to pay.";
    if (items.length === 0) next["items"] = "Your cart is empty — add an item first.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlightRef.current) return;
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (!requestIdRef.current) {
      requestIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const receipt = await submitOrder({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryLocation: location,
          deliveryWindow: window_,
          paymentMethod: payment as PaymentMethod,
          additionalInstructions: instructions.trim(),
          clientRequestId: requestIdRef.current,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      });
      sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
      requestIdRef.current = null;
      clearCart();
      navigate({ to: "/order-confirmation" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "We couldn't place your order. Please try again.",
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        {!acceptingOrders ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p className="font-semibold">
              {settings?.closedMessage ??
                "We're currently not accepting orders. Please check back later."}
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
            >
              Back to menu
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p className="font-medium">You need at least one item to check out.</p>
            <Link
              to="/"
              className="mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
            >
              Back to menu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="surface-card space-y-4 p-5">
              <h2 className="font-display text-xl font-bold">Your details</h2>

              <Field label="Full name" error={errors["name"]} htmlFor="name">
                <input
                  id="name"
                  className={fieldClass}
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kofi Mensah"
                  autoComplete="name"
                />
              </Field>

              <Field label="Phone number" error={errors["phone"]} htmlFor="phone">
                <input
                  id="phone"
                  className={fieldClass}
                  value={phone}
                  maxLength={20}
                  inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0551234567"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Delivery location" error={errors["location"]} htmlFor="location">
                <select
                  id="location"
                  className={fieldClass}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Select your hall</option>
                  {locations.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Delivery period" error={errors["window"]} htmlFor="window">
                <select
                  id="window"
                  className={fieldClass}
                  value={window_}
                  onChange={(e) => setWindow(e.target.value)}
                >
                  <option value="">Select a delivery period</option>
                  {windows.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Additional delivery instructions (optional)"
                htmlFor="instructions"
              >
                <textarea
                  id="instructions"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border border-input bg-card p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Room number, landmark, call on arrival…"
                />
              </Field>
            </div>

            <div className="surface-card space-y-3 p-5">
              <h2 className="font-display text-xl font-bold">Payment method</h2>
              {errors["payment"] ? (
                <p className="text-sm font-medium text-destructive">{errors["payment"]}</p>
              ) : null}
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                      payment === method
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:bg-secondary/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={payment === method}
                      onChange={() => setPayment(method)}
                      className="h-5 w-5 accent-[var(--color-primary)]"
                    />
                    <span className="font-semibold">{method}</span>
                  </label>
                ))}
              </div>

              {payment === "Mobile Money" ? (
                <div className="rounded-xl bg-secondary p-4 text-sm">
                  <p className="font-semibold">Send your payment to:</p>
                  <p className="mt-2">
                    MoMo Number:{" "}
                    <span className="font-bold">{settings?.momoNumber ?? BUSINESS.momoNumber}</span>
                  </p>
                  <p>
                    Account Name: <span className="font-bold">
                      {settings?.momoAccountName ?? BUSINESS.momoAccountName}
                    </span>
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Payment is confirmed manually for now — place the order, then send the money.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="surface-card space-y-2 p-5">
              <h2 className="font-display text-xl font-bold">Order summary</h2>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.productId} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0 text-sm">
                      {item.name}
                      {item.size ? ` (${item.size})` : ""} × {item.quantity}
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatCedis(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatCedis(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatCedis(total)}
                </span>
              </div>
              {errors["items"] ? (
                <p className="text-sm font-medium text-destructive">{errors["items"]}</p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="mt-3 h-13 w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lift transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? "Placing your order…" : `Place order · ${formatCedis(total)}`}
              </button>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
