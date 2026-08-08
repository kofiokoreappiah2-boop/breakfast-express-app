import { Link } from "@tanstack/react-router";
import { BUSINESS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="font-display text-xl font-bold">{BUSINESS.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A subsidiary of {BUSINESS.parent}. {BUSINESS.subTagline}
        </p>
        <p className="mt-4 text-sm">
          Call or WhatsApp us on{" "}
          <a className="font-semibold text-primary underline" href={`tel:${BUSINESS.phone}`}>
            {BUSINESS.phone}
          </a>
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {BUSINESS.name}</span>
          <Link to="/auth" className="underline hover:text-foreground">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
