import { Link } from "@tanstack/react-router";
import { Construction, MessageCircle } from "lucide-react";

import { BUSINESS } from "@/lib/constants";
import type { StorefrontSettings } from "@/lib/storefront.functions";

type MaintenancePageProps = {
  settings?: StorefrontSettings;
};

export function MaintenancePage({ settings }: MaintenancePageProps) {
  const businessName = settings?.businessName ?? BUSINESS.name;
  const parentName = settings?.parentName ?? BUSINESS.parent;
  const message =
    settings?.closedMessage ??
    "We are temporarily closed while we prepare a refreshed experience. We will be back soon.";
  const whatsappUrl = settings?.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`
    : BUSINESS.whatsappUrl;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center gap-3">
          <span className="warm-gradient grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-primary-foreground shadow-soft">
            E
          </span>
          <span>
            <span className="block font-display text-xl font-bold leading-tight">
              {businessName}
            </span>
            <span className="block text-xs text-muted-foreground">by {parentName}</span>
          </span>
        </header>

        <section className="flex flex-1 items-center py-12 sm:py-16">
          <div className="surface-card w-full overflow-hidden p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-secondary-foreground">
              <Construction className="h-4 w-4" aria-hidden="true" />
              Website renovation in progress
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
              We&apos;re preparing something better.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {message}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Online ordering is paused during the renovation. Existing orders and customer records
              remain safely preserved.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              General enquiries
            </a>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5 text-xs text-muted-foreground">
          <span>Breakfast will be back soon.</span>
          <Link to="/auth" className="rounded-md px-2 py-1 font-medium hover:text-foreground">
            Staff sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}

export function MaintenancePageLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="flex items-center gap-3 text-muted-foreground" role="status">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        <span className="text-sm font-medium">Checking availability…</span>
      </div>
    </div>
  );
}
