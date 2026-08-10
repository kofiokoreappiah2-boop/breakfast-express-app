import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { BUSINESS } from "@/lib/constants";
import { useStorefront } from "@/lib/use-storefront";

export function SiteHeader() {
  const { itemCount } = useCart();
  const { data } = useStorefront();
  const name = data?.settings.businessName ?? BUSINESS.name;
  const parent = data?.settings.parentName ?? BUSINESS.parent;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="warm-gradient grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-base font-bold text-primary-foreground">
            E
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-tight">
              {name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              by {parent}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/"
            hash="menu"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Menu
          </Link>
          <Link
            to="/"
            hash="contact"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Contact
          </Link>
          <Link
            to="/cart"
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <span className="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
              {itemCount}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
