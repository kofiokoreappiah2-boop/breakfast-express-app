import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageOff, Trash2 } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import { useStorefront } from "@/lib/use-storefront";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Einyornose" },
      { name: "description", content: "Review your Einyornose breakfast order before checkout." },
      { property: "og:title", content: "Your Cart — Einyornose" },
      { property: "og:description", content: "Review your breakfast order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  const { data: storefront } = useStorefront();
  const promotion = storefront?.promotion;
  const estimatedDiscount =
    promotion?.available && promotion.remaining > 0
      ? Math.min(promotion.discountAmount, subtotal)
      : 0;
  const estimatedTotal = subtotal - estimatedDiscount;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-3xl font-bold">Your cart</h1>

        {items.length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p className="text-base font-medium">Your cart is empty.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add something warm from the menu to get started.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground"
            >
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {items.map((item) => {
                const label = item.size ? `${item.name} — ${item.size}` : item.name;
                const currentProduct = storefront?.products.find(
                  (product) => product.id === item.productId,
                );
                const imageUrl = currentProduct?.imageUrl;
                return (
                  <li key={item.productId} className="surface-card flex gap-3 p-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={label}
                        loading="lazy"
                        width={800}
                        height={800}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                        <span className="sr-only">No image available for {label}</span>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCedis(item.price)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${label} from cart`}
                          onClick={() => removeItem(item.productId)}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <QuantityStepper
                          value={item.quantity}
                          min={1}
                          label={label}
                          onChange={(value) => setQuantity(item.productId, value)}
                        />
                        <p className="font-display text-lg font-bold text-primary">
                          {formatCedis(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="surface-card mt-6 space-y-2 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatCedis(subtotal)}</span>
              </div>
              {estimatedDiscount > 0 ? (
                <div className="flex items-center justify-between text-sm font-semibold text-primary">
                  <span>Founder&apos;s Day discount</span>
                  <span>−{formatCedis(estimatedDiscount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold text-primary">
                  {formatCedis(estimatedTotal)}
                </span>
              </div>
              {estimatedDiscount > 0 && promotion ? (
                <p className="text-xs text-muted-foreground">
                  {promotion.remaining} offer{promotion.remaining === 1 ? "" : "s"} remaining. Your
                  discount is secured when your order is successfully placed.
                </p>
              ) : null}
              <Link
                to="/checkout"
                className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
              >
                Continue to checkout
              </Link>
              <Link
                to="/"
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Add more items
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
