import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ExternalLink, ImageOff, MapPin, Phone, ShoppingBag } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { MaintenancePage, MaintenancePageLoading } from "@/components/MaintenancePage";
import { BUSINESS } from "@/lib/constants";
import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import { useStorefront } from "@/lib/use-storefront";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Einyornose — Breakfast delivery for busy mornings" },
      {
        name: "description",
        content:
          "Order convenient breakfast delivery from Einyornose and start your busy morning without the hassle.",
      },
      { property: "og:title", content: "Einyornose — Breakfast for busy mornings" },
      {
        property: "og:description",
        content:
          "Your mornings are busy enough. Einyornose brings breakfast right to you, so you can start your day without the hassle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { title: "Pick your breakfast", body: "Choose your items and quantities from the menu." },
  {
    title: "Tell us where",
    body: "Select your delivery point. We deliver in one early-morning run.",
  },
  { title: "Start your morning", body: "Pay by MoMo or on delivery. We bring it hot and fresh." },
];

const RENOVATION_MODE = false;

function PromotionCountdown({ startsAt }: { startsAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(startsAt).getTime() - Date.now()),
  );

  useEffect(() => {
    let reloaded = false;
    const update = () => {
      const next = Math.max(0, new Date(startsAt).getTime() - Date.now());
      setRemaining(next);
      if (next === 0 && !reloaded) {
        reloaded = true;
        window.setTimeout(() => window.location.reload(), 500);
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [startsAt]);

  const totalSeconds = Math.ceil(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");

  return <span>Offer begins in {time}</span>;
}

function HomePage() {
  const { itemCount, total } = useCart();
  const { data, isLoading } = useStorefront();

  if (RENOVATION_MODE) return <MaintenancePage />;

  const settings = data?.settings;
  const products = data?.products ?? [];
  const combos = products.filter((product) => product.kind === "combo");
  const individualItems = products.filter((product) => product.kind !== "combo");
  const gallery = data?.gallery ?? [];
  const promotion = data?.promotion ?? null;
  const locations = data?.locations ?? [];
  const windows = data?.windows ?? [];
  const ordering = data?.ordering;
  const businessName = settings?.businessName ?? BUSINESS.name;
  const phone = settings?.contactPhone ?? BUSINESS.phone;
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
    : BUSINESS.whatsappUrl;

  if (isLoading) return <MaintenancePageLoading />;
  if (settings && !settings.acceptingOrders) return <MaintenancePage settings={settings} />;

  return (
    <div className="min-h-screen pb-24">
      <SiteHeader />

      {settings?.promoEnabled && settings.promoMessage ? (
        <p className="warm-gradient px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
          {settings.promoMessage}
        </p>
      ) : null}

      <main>
        <section className="relative overflow-hidden">
          {isLoading ? (
            <div className="h-72 w-full animate-pulse bg-muted sm:h-96" />
          ) : settings?.heroImageUrl ? (
            <img
              src={settings.heroImageUrl}
              alt="A spread of Ghanaian breakfast: porridge, puff puff, koose and groundnuts"
              width={1200}
              height={912}
              className="h-72 w-full object-cover sm:h-96"
            />
          ) : (
            <div className="warm-gradient h-72 w-full sm:h-96" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
          <div className="relative mx-auto -mt-36 max-w-5xl px-4 pb-8 sm:-mt-44">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              {businessName}
            </p>
            <h1 className="mt-2 max-w-3xl font-sans text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl">
              Breakfast for busy mornings.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7">
              Your mornings are busy enough. We bring breakfast right to you, so you can start your
              day without the hassle.
            </p>
            <p className="mt-3 text-base font-semibold text-primary sm:text-lg">
              Good food. Right where you are.
            </p>
            <a
              href="#menu"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lift transition-transform active:scale-[0.98]"
            >
              Order Breakfast
            </a>
          </div>
        </section>

        {ordering ? (
          <section className="mx-auto max-w-5xl px-4 pb-4 pt-2 sm:pb-6 sm:pt-4">
            <div
              className={`surface-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center ${ordering.open ? "border-primary/30" : "border-accent/50"}`}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {ordering.open ? "Orders are open" : "Next morning run"}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {new Intl.DateTimeFormat("en-GH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "Africa/Accra",
                  }).format(new Date(`${ordering.deliveryDate}T12:00:00Z`))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ordering.windowLabel} · Sunday to Friday
                </p>
              </div>
              <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
                <strong className="block">Orders close at 5:45 AM</strong>
                <span className="text-muted-foreground">
                  {ordering.open ? "Order now for this run." : "Ordering reopens at 5:00 PM."}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {promotion ? (
          <section className="mx-auto max-w-5xl px-4 py-4" aria-label="Founder's Day offer">
            {!promotion.started && promotion.startsAt ? (
              <a
                href="#menu"
                className="surface-card group relative block scroll-mt-20 overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Founder's Day promotion begins at 7 AM Ghana time. Go to the menu."
              >
                <img
                  src="/founders-day-promo.webp"
                  alt="Be one of the first 10 app customers and get GH₵5 off your Einyornose breakfast"
                  width={1600}
                  height={800}
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-card/95 px-3 py-1.5 text-xs font-bold text-foreground shadow-lift sm:bottom-5 sm:right-5 sm:text-sm">
                  <PromotionCountdown startsAt={promotion.startsAt} />
                </span>
              </a>
            ) : promotion.available ? (
              <a
                href="#menu"
                className="surface-card group relative block scroll-mt-20 overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Founder's Day offer: ${promotion.remaining} of ${promotion.redemptionLimit} discounts remaining. Go to the menu.`}
              >
                <img
                  src="/founders-day-promo.webp"
                  alt="Be one of the first 10 app customers and get GH₵5 off your Einyornose breakfast"
                  width={1600}
                  height={800}
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-card/95 px-3 py-1.5 text-xs font-bold text-foreground shadow-lift sm:bottom-5 sm:right-5 sm:text-sm">
                  {promotion.remaining} offer{promotion.remaining === 1 ? "" : "s"} remaining
                </span>
              </a>
            ) : (
              <div className="surface-card relative overflow-hidden">
                <img
                  src="/founders-day-promo.webp"
                  alt="Founder's Day Einyornose promotion"
                  width={1600}
                  height={800}
                  className="h-auto w-full opacity-35 grayscale"
                />
                <div className="absolute inset-0 grid place-items-center bg-background/55 px-5 text-center">
                  <p className="rounded-xl bg-card px-5 py-3 font-display text-xl font-bold shadow-lift sm:text-3xl">
                    Founder&apos;s Day offer fully claimed
                  </p>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section id="menu" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Choose your breakfast</h2>
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
            <>
              {combos.length > 0 ? (
                <div className="mt-6">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">Ready-made combos</h3>
                      <p className="text-sm text-muted-foreground">
                        One tap, a complete morning order. Combo prices equal the individual items.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {combos.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        orderingOpen={ordering?.open}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-8">
                <h3 className="text-xl font-bold">Build your own breakfast</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {individualItems.map((product) => (
                    <ProductCard key={product.id} product={product} orderingOpen={ordering?.open} />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {gallery.length > 0 ? (
          <section className="mx-auto max-w-5xl px-4 py-6">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Offers &amp; updates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Current promotions and news from {businessName}.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((item) => (
                <article key={item.id} className="surface-card overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      width={1200}
                      height={800}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-48 place-items-center bg-secondary text-muted-foreground">
                      <ImageOff className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-display text-lg font-bold">{item.title}</h3>
                    {item.caption ? (
                      <p className="mt-1 text-sm text-muted-foreground">{item.caption}</p>
                    ) : null}
                    {item.linkUrl ? (
                      <a
                        href={item.linkUrl}
                        target={item.linkUrl.startsWith("http") ? "_blank" : undefined}
                        rel={item.linkUrl.startsWith("http") ? "noreferrer" : undefined}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Learn more <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" /> Morning delivery
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {windows.map((window) => (
                  <li key={window} className="rounded-lg bg-secondary px-3 py-2 font-medium">
                    {window}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Orders close at 5:45 AM. Saturday is our weekly rest day.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-6">
          <div className="surface-card warm-gradient p-6 text-primary-foreground">
            <h2 className="font-display text-xl font-bold">Questions? Talk to us</h2>
            <p className="mt-1 text-sm opacity-90">Call or WhatsApp {businessName} any morning.</p>
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
