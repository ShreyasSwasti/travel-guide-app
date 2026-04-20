import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plane, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TravelEase Guide" },
      { name: "description", content: "Sign in or create an account to save your trips." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created — let's plan your first trip!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="gradient-ocean pt-12 pb-16 px-6 text-primary-foreground">
        <Link to="/" className="inline-flex items-center gap-2 text-sm/none opacity-90 hover:opacity-100">
          <Plane className="h-4 w-4 -rotate-12" /> TravelEase
        </Link>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Start your journey"}
        </h1>
        <p className="mt-2 text-primary-foreground/80">
          {mode === "signin" ? "Sign in to access your trips." : "Create an account in seconds."}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="-mt-8 mx-4 rounded-3xl bg-card p-6 shadow-card space-y-4 max-w-md sm:mx-auto sm:w-full"
      >
        {mode === "signup" && (
          <Field icon={<UserIcon className="h-5 w-5" />} label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              placeholder="Alex Rivera"
              className="w-full bg-transparent outline-none text-base"
            />
          </Field>
        )}
        <Field icon={<Mail className="h-5 w-5" />} label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full bg-transparent outline-none text-base"
          />
        </Field>
        <Field icon={<Lock className="h-5 w-5" />} label="Password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="At least 6 characters"
            className="w-full bg-transparent outline-none text-base"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-2xl gradient-ocean text-primary-foreground font-semibold shadow-soft active:scale-[.98] transition disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to TravelEase?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-primary"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          Continue as guest →
        </Link>
      </form>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-input bg-secondary/40 px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="flex-1">
        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {children}
      </div>
    </label>
  );
}
