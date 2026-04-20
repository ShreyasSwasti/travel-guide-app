import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, Heart, Settings, Moon, Sun, Map } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMapboxToken, setMapboxToken, clearMapboxToken } from "@/lib/runtime-settings";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TravelEase Guide" },
      { name: "description", content: "Your preferences, favorites, and settings." },
    ],
  }),
  component: ProfilePage,
});

const INTERESTS = ["adventure", "food", "family", "beach", "culture", "nightlife", "nature", "budget"];

interface Prefs {
  budget_range: "low" | "mid" | "high";
  interests: string[];
  units: "metric" | "imperial";
  dark_mode: boolean;
}

function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({
    budget_range: "mid",
    interests: [],
    units: "metric",
    dark_mode: false,
  });
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name,preferences")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name || "");
          setPrefs({ ...prefs, ...(data.preferences as unknown as Prefs) });
        }
      });
    setHasToken(!!getMapboxToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", prefs.dark_mode);
  }, [prefs.dark_mode]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ name, preferences: prefs as unknown as Record<string, unknown> })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const saveToken = () => {
    if (!token.trim()) return;
    setMapboxToken(token);
    setHasToken(true);
    setToken("");
    toast.success("Mapbox token saved on this device");
  };

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle={user?.email ?? ""} />
      <div className="px-4 pt-4 space-y-4">
        <Card>
          <Section icon={<UserIcon className="h-4 w-4" />} title="Account" />
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none text-base font-medium"
              placeholder="Your name"
            />
          </Field>
        </Card>

        <Card>
          <Section icon={<Settings className="h-4 w-4" />} title="Preferences" />
          <Field label="Budget range">
            <div className="flex gap-2">
              {(["low", "mid", "high"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setPrefs({ ...prefs, budget_range: b })}
                  className={
                    "flex-1 rounded-xl py-2 text-xs font-semibold capitalize border transition " +
                    (prefs.budget_range === b
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card")
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Interests">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = prefs.interests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        interests: on
                          ? prefs.interests.filter((x) => x !== i)
                          : [...prefs.interests, i],
                      })
                    }
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium border transition " +
                      (on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card")
                    }
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Units">
            <div className="flex gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setPrefs({ ...prefs, units: u })}
                  className={
                    "flex-1 rounded-xl py-2 text-xs font-semibold capitalize border transition " +
                    (prefs.units === u
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card")
                  }
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>
          <button
            onClick={() => setPrefs({ ...prefs, dark_mode: !prefs.dark_mode })}
            className="flex items-center justify-between w-full rounded-xl bg-secondary/50 border border-border px-4 py-3"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              {prefs.dark_mode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Dark mode
            </span>
            <span
              className={
                "h-6 w-11 rounded-full p-0.5 transition " +
                (prefs.dark_mode ? "bg-primary" : "bg-muted")
              }
            >
              <span
                className={
                  "block h-5 w-5 rounded-full bg-white transition " +
                  (prefs.dark_mode ? "translate-x-5" : "")
                }
              />
            </span>
          </button>

          <button
            onClick={save}
            className="w-full h-12 rounded-2xl gradient-ocean text-primary-foreground font-semibold shadow-soft active:scale-[.98]"
          >
            Save changes
          </button>
        </Card>

        <Card>
          <Section icon={<Map className="h-4 w-4" />} title="Mapbox token" />
          <p className="text-xs text-muted-foreground -mt-1">
            Required to view interactive maps. Stored on this device only. Get a free public token at{" "}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
            .
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "Token saved — paste to replace" : "pk.eyJ1Ijo…"}
              className="flex-1 rounded-xl bg-secondary/50 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={saveToken}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
            >
              Save
            </button>
          </div>
          {hasToken && (
            <button
              onClick={() => {
                clearMapboxToken();
                setHasToken(false);
                toast.success("Mapbox token removed");
              }}
              className="text-xs text-destructive font-medium"
            >
              Remove saved token
            </button>
          )}
        </Card>

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="w-full h-12 rounded-2xl bg-card border border-border text-destructive font-semibold inline-flex items-center justify-center gap-2 active:scale-[.98]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-card shadow-card p-4 space-y-3">{children}</div>;
}
function Section({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
      {icon} {title}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
        {label}
      </span>
      <div className="rounded-xl bg-secondary/50 border border-border px-3 py-2.5">{children}</div>
    </label>
  );
}
