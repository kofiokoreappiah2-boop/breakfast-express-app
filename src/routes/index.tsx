import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, ShoppingBag } from "lucide-react";

import heroImage from "@/assets/hero-breakfast.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { BUSINESS } from "@/lib/constants";
import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import { useStorefront } from "@/lib/use-storefront";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Einyornose — Fresh Breakfast Delivered to You" },
      {
        name: "description",
        content:
          "Hausa porridge, puff puff, koose and more. Order breakfast on your phone and get it delivered to your hall in Ghana cedis.",
      },
      { property: "og:title", content: "Einyornose — Fresh Breakfast Delivered to You" },
      {
        property: "og:description",
        content: "Your neighbourhood breakfast, made easy. Delivered to your hall.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { title: "Pick your breakfast", body: "Choose your items and quantities from the menu." },
  { title: "Tell us where", body: "Select your hall and the delivery period that suits you." },
  { title: "Eat well", body: "Pay by MoMo or on delivery. We bring it hot and fresh." },
];

function HomePage() {
  const { itemCount, total } = useCart();
  const { data, isLoading } = useStorefront();

  const settings = data?.settings;
  const products = data?.products ?? [];
  const locations = data?.locations ?? [];
  const windows = data?.windows ?? [];
  const businessName = settings?.businessName ?? BUSINESS.name;
  const phone = settings?.contactPhone ?? BUSINESS.phone;
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
    : BUSINESS.whatsappUrl;

  return (
    <div className="min-h-screen pb-24">
      <SiteHeader />

      {settings?.promoEnabled && settings.promoMessage ? (
        <p className="warm-gradient px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
          {settings.promoMessage}
        </p>
      ) : null}

      {settings && !settings.acceptingOrders ? (
        <p className="border-b border-border bg-secondary px-4 py-3 text-center text-sm font-semibold">
          {settings.closedMessage}
        </p>
      ) : null}

      <main>
        <section className="relative overflow-hidden">
          <img
            src={settings?.heroImageUrl ?? heroImage}
            alt="A spread of Ghanaian breakfast: porridge, puff puff, koose and groundnuts"
            width={1200}
            height={912}
            className="h-72 w-full object-cover sm:h-96"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
          <div className="relative mx-auto -mt-28 max-w-5xl px-4 pb-8 sm:-mt-36">
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
              {businessName}
            </h1>
            <p className="mt-2 text-lg font-semibold text-primary sm:text-2xl">
              {settings?.heroHeading ?? BUSINESS.tagline}
            </p>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {settings?.heroSubheading ?? BUSINESS.subTagline}
            </p>
            <a
              href="#menu"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lift transition-transform active:scale-[0.98]"
            >
              Order Now
            </a>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">This morning's menu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fresh every morning. Prices in Ghana cedis.
          </p>

          {isLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="surface-card h-80 animate-pulse bg-muted" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No items are available right now. Please check back soon.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="font-display text-2xl font-bold">How ordering works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="surface-card p-4">
                <span className="warm-gradient grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" /> Delivery locations
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {locations.map((location) => (
                  <li key={location} className="rounded-lg bg-secondary px-3 py-2 font-medium">
                    {location}
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" /> Delivery periods
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {windows.map((window) => (
                  <li key={window} className="rounded-lg bg-secondary px-3 py-2 font-medium">
                    {window}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-6">
          <div className="surface-card warm-gradient p-6 text-primary-foreground">
            <h2 className="font-display text-xl font-bold">Questions? Talk to us</h2>
            <p className="mt-1 text-sm opacity-90">
              Call or WhatsApp {businessName} any morning.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-card px-5 text-base font-semibold text-foreground"
            >
              <Phone className="h-5 w-5" aria-hidden="true" /> {phone}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"} in cart
              </p>
              <p className="font-display text-xl font-bold">{formatCedis(total)}</p>
            </div>
            <Link
              to="/cart"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" /> View cart
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
