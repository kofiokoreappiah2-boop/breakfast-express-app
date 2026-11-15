import { useState, type UIEvent } from "react";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import type { StorefrontProduct } from "@/lib/storefront.functions";

type ProductKey = "porridge" | "smallPuff" | "largePuff" | "koose" | "groundnuts" | "milk";

type PairingDefinition = {
  name: string;
  image: string;
  alt: string;
  items: Array<{ product: ProductKey; quantity: number; label: string }>;
};

const PAIRINGS: PairingDefinition[] = [
  {
    name: "The Morning Classic",
    image: "/pairings/morning-classic-square.webp",
    alt: "A bag of Hausa koko with one small golden puff-puff",
    items: [
      { product: "porridge", quantity: 1, label: "Hausa Koko" },
      { product: "smallPuff", quantity: 1, label: "1 Small Puff-Puff" },
    ],
  },
  {
    name: "Koko & Koose",
    image: "/pairings/koko-and-koose-square.webp",
    alt: "A bag of Hausa koko with three golden koose",
    items: [
      { product: "porridge", quantity: 1, label: "Hausa Koko" },
      { product: "koose", quantity: 3, label: "3 Koose" },
    ],
  },
  {
    name: "The Quick Bite",
    image: "/pairings/quick-bite-square.webp",
    alt: "One large golden puff-puff served with roasted groundnuts",
    items: [
      { product: "largePuff", quantity: 1, label: "1 Large Puff-Puff" },
      { product: "groundnuts", quantity: 1, label: "Groundnuts" },
    ],
  },
  {
    name: "The Full Morning",
    image: "/pairings/full-morning-square.webp",
    alt: "A bag of Hausa koko with one large puff-puff and roasted groundnuts",
    items: [
      { product: "porridge", quantity: 1, label: "Hausa Koko" },
      { product: "largePuff", quantity: 1, label: "1 Large Puff-Puff" },
      { product: "groundnuts", quantity: 1, label: "Groundnuts" },
    ],
  },
  {
    name: "The Triple Treat",
    image: "/pairings/triple-treat-square.webp",
    alt: "A bag of Hausa koko with three koose and one sachet of milk",
    items: [
      { product: "porridge", quantity: 1, label: "Hausa Koko" },
      { product: "koose", quantity: 3, label: "3 Koose" },
      { product: "milk", quantity: 1, label: "Sachet Milk" },
    ],
  },
  {
    name: "The Double Puff-Puff",
    image: "/pairings/double-puff-puff-square.webp",
    alt: "A bag of Hausa koko with two small golden puff-puffs",
    items: [
      { product: "porridge", quantity: 1, label: "Hausa Koko" },
      { product: "smallPuff", quantity: 2, label: "2 Small Puff-Puffs" },
    ],
  },
];

function productKey(product: StorefrontProduct): ProductKey | null {
  if (product.name === "Hausa Porridge") return "porridge";
  if (product.name === "Koose") return "koose";
  if (product.name === "Roasted Groundnut") return "groundnuts";
  if (product.name === "Sachet Milk") return "milk";
  if (product.name === "Puff Puff / Bofloat" && product.size === "Small") return "smallPuff";
  if (product.name === "Puff Puff / Bofloat" && product.size === "Large") return "largePuff";
  return null;
}

export function BreakfastPairings({
  products,
  orderingOpen = true,
}: {
  products: StorefrontProduct[];
  orderingOpen?: boolean;
}) {
  const { addItems } = useCart();
  const [activeCard, setActiveCard] = useState(0);
  const productMap = new Map<ProductKey, StorefrontProduct>();

  for (const product of products) {
    const key = productKey(product);
    if (key) productMap.set(key, product);
  }

  const updateActiveCard = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-pairing-card]"));
    if (cards.length === 0) return;

    const containerLeft = container.getBoundingClientRect().left;
    const nearestIndex = cards.reduce(
      (nearest, card, index) =>
        Math.abs(card.getBoundingClientRect().left - containerLeft) < nearest.distance
          ? { index, distance: Math.abs(card.getBoundingClientRect().left - containerLeft) }
          : nearest,
      { index: 0, distance: Number.POSITIVE_INFINITY },
    ).index;

    setActiveCard(nearestIndex);
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8" aria-labelledby="pairings-heading">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Made for your mornings
        </p>
        <h2 id="pairings-heading" className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          Not sure what to order?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          We&apos;ve put together a few breakfast favourites to make choosing easier.
        </p>
      </div>

      <div
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
        onScroll={updateActiveCard}
        aria-label="Breakfast pairing suggestions"
      >
        {PAIRINGS.map((pairing) => {
          const resolved = pairing.items.map((item) => ({
            ...item,
            productDetails: productMap.get(item.product),
          }));
          const available = resolved.every(
            (item) => item.productDetails?.available && item.productDetails.kind !== "combo",
          );
          const total = available
            ? resolved.reduce((sum, item) => sum + item.productDetails!.price * item.quantity, 0)
            : null;

          return (
            <article
              key={pairing.name}
              data-pairing-card
              className="surface-card flex w-[82vw] max-w-[330px] shrink-0 snap-start flex-col overflow-hidden sm:w-auto sm:max-w-none"
            >
              <img
                src={pairing.image}
                alt={pairing.alt}
                loading="lazy"
                width={1200}
                height={1200}
                className="aspect-square w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-lg font-bold leading-snug">{pairing.name}</h3>
                <ul className="mt-3 space-y-1.5" aria-label={`Included in ${pairing.name}`}>
                  {pairing.items.map((item) => (
                    <li
                      key={`${item.product}-${item.quantity}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-5">
                  <p className="font-display text-2xl font-bold text-primary">
                    {total === null ? "Temporarily unavailable" : formatCedis(total)}
                  </p>
                  <button
                    type="button"
                    disabled={!available || !orderingOpen}
                    onClick={() => {
                      if (!available || !orderingOpen) return;
                      addItems(
                        resolved.map((item) => ({
                          item: {
                            productId: item.productDetails!.id,
                            name: item.productDetails!.name,
                            size: item.productDetails!.size,
                            price: item.productDetails!.price,
                          },
                          quantity: item.quantity,
                        })),
                      );
                      toast.success(`${pairing.name} added to your cart`, {
                        description: pairing.items.map((item) => item.label).join(" · "),
                        action: {
                          label: "View cart",
                          onClick: () => window.location.assign("/cart"),
                        },
                      });
                    }}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {!available
                      ? "Unavailable"
                      : orderingOpen
                        ? "Add pairing to cart"
                        : "Orders closed"}
                    {available && orderingOpen ? (
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    ) : null}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-center gap-1.5 sm:hidden" aria-hidden="true">
        {PAIRINGS.map((pairing, index) => (
          <span
            key={pairing.name}
            className={`h-1.5 rounded-full transition-all ${index === activeCard ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
        Suggested pairings. Items are added individually at current menu prices.
      </p>
    </section>
  );
}
