import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS } from "@/lib/constants";

const fieldClass =
  "h-12 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

export function StaffLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/staff/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/staff/dashboard" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      navigate({ to: "/staff/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 block text-center">
          <img
            src="/einyornose-wordmark.webp"
            alt={BUSINESS.name}
            width={1312}
            height={267}
            className="mx-auto h-12 w-auto"
          />
        </Link>
        <div className="surface-card p-6">
          <h1 className="text-2xl font-bold">
            {mode === "signin" ? "Staff login" : "Create staff account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers do not need an account. This entrance is for the Einyornose team.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                autoComplete="email"
                className={`${fieldClass} mt-1.5`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={`${fieldClass} mt-1.5`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-sm font-medium text-muted-foreground underline hover:text-foreground"
          >
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
