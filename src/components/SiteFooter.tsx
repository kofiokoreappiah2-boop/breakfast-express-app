import { Link } from "@tanstack/react-router";
import { BUSINESS } from "@/lib/constants";
import { useStorefront } from "@/lib/use-storefront";

export function SiteFooter() {
  const { data } = useStorefront();
  const name = data?.settings.businessName ?? BUSINESS.name;
  const parent = data?.settings.parentName ?? BUSINESS.parent;
  const phone = data?.settings.contactPhone ?? BUSINESS.phone;
  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="font-display text-xl font-bold">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A subsidiary of {parent}. {BUSINESS.subTagline}
        </p>
        <p className="mt-4 text-sm">
          Call or WhatsApp us on{" "}
          <a className="font-semibold text-primary underline" href={`tel:${phone}`}>
            {phone}
          </a>
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {name}</span>
          <Link to="/auth" className="underline hover:text-foreground">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
