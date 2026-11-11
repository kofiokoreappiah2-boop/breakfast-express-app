import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Home, LogOut, Settings, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/staff/dashboard", label: "Morning", icon: Home },
  { to: "/admin", label: "Orders", icon: ClipboardList },
  { to: "/staff/finance", label: "Finance", icon: WalletCards },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function StaffNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-display text-xl font-bold text-primary">Einyornose Staff</p>
          <p className="text-xs text-muted-foreground">Morning operations and business records</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await supabase.auth.signOut();
              navigate({ to: "/staff", replace: true });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
