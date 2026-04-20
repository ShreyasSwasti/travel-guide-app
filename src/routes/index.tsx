import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Sparkles, Calendar, Users, DollarSign, MapPin, ArrowRight, LogIn } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateItinerary, generateRecommendations } from "@/server/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelEase Guide — Plan trips in minutes" },
      { name: "description", content: "Where to next? Build your personalized travel itinerary in seconds." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const generate = useServerFn(generateItinerary);
  const recsFn = useServerFn(generateRecommendations);

  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [budget, setBudget] = useState(1500);
  const [group, setGroup] = useState(1);
  const [loading, setLoading] = useState(false);

  const [recs, setRecs] = useState<Array<{ title: string; destination: string; reason: string; emoji: string }>>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setRecsLoading(true);
    recsFn({ data: { interests: [] } })
      .then((r) => {
        if (active) setRecs(r.ideas ?? []);
      })
      .catch(() => {})
      .finally(() => active && setRecsLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.message("Sign in to save your trip", { description: "Create a free account to generate and save itineraries." });
      navigate({ to: "/auth" });
      return;
    }
    if (!destination.trim()) {
      toast.error("Pick a destination first");
      return;
    }
    setLoading(true);
    try {
      const result = await generate({
        data: {
          destination: destination.trim(),
          startDate: start || undefined,
          endDate: end || undefined,
          budget,
          groupSize: group,
          interests: [],
        },
      });

      // Save trip + activities
      const { data: trip, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: result.title || `Trip to ${destination}`,
          destination: destination.trim(),
          start_date: start || null,
          end_date: end || null,
          budget_total: budget,
          group_size: group,
        })
        .select()
        .single();
      if (error || !trip) throw error || new Error("Failed to save trip");

      const rows = result.days.flatMap((day, di) =>
        day.activities.map((a, ai) => ({
          trip_id: trip.id,
          day_number: day.day_number || di + 1,
          name: a.name,
          type: a.type,
          start_time: a.start_time || null,
          cost: a.cost || 0,
          address: a.address || null,
          notes: a.notes || null,
          sort_order: ai,
        }))
      );
      if (rows.length) {
        const { error: aErr } = await supabase.from("activities").insert(rows);
        if (aErr) console.warn("activity insert", aErr);
      }
      toast.success("Itinerary ready!");
      navigate({ to: "/trips/$tripId", params: { tripId: trip.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-ocean px-5 pt-10 pb-20 text-primary-foreground rounded-b-[2.5rem]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span className="text-base">✈️</span> TravelEase
          </div>
          {!user && (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs font-medium hover:bg-white/25"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-6 text-4xl/tight font-extrabold tracking-tight"
        >
          Where to next?
        </motion.h1>
        <p className="mt-2 text-primary-foreground/85">Plan a complete trip in under a minute.</p>
      </section>

      {/* Search Card */}
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onSubmit={onSubmit}
        className="relative z-10 -mt-6 mx-4 rounded-3xl bg-card shadow-card p-5 space-y-3"
      >
        <Row icon={<MapPin className="h-5 w-5" />} label="Destination">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Lisbon, Portugal"
            className="w-full bg-transparent outline-none text-base font-medium"
          />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row icon={<Calendar className="h-5 w-5" />} label="Start">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Row>
          <Row icon={<Calendar className="h-5 w-5" />} label="End">
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
            />
          </Row>
        </div>
        <Row icon={<Users className="h-5 w-5" />} label="Travellers">
          <input
            type="number"
            min={1}
            max={20}
            value={group}
            onChange={(e) => setGroup(Math.max(1, Number(e.target.value) || 1))}
            className="w-full bg-transparent outline-none text-base font-medium"
          />
        </Row>
        <Row icon={<DollarSign className="h-5 w-5" />} label={`Budget · $${budget.toLocaleString()}`}>
          <input
            type="range"
            min={200}
            max={20000}
            step={100}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Row>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full h-14 rounded-2xl gradient-ocean text-primary-foreground font-semibold text-base shadow-soft inline-flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Sparkles className="h-5 w-5 animate-pulse" /> Crafting your trip…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" /> Generate AI itinerary
            </>
          )}
        </button>
      </motion.form>

      {/* Recs */}
      <section className="mt-10 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">For you</h2>
          <Link to="/plan" className="text-xs font-medium text-primary inline-flex items-center gap-1">
            More <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-3 -mx-5 overflow-x-auto px-5">
          <div className="flex gap-3 pb-2 min-w-max">
            {recsLoading && recs.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 w-56 shrink-0 rounded-2xl bg-muted animate-pulse"
                  />
                ))
              : recs.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(r.destination);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-left h-40 w-56 shrink-0 rounded-2xl bg-card shadow-card p-4 flex flex-col justify-between hover:shadow-soft transition active:scale-[.98]"
                  >
                    <div>
                      <div className="text-3xl">{r.emoji}</div>
                      <div className="mt-2 font-semibold leading-snug">{r.title}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {r.destination}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{r.reason}</p>
                    </div>
                  </button>
                ))}
            {!recsLoading && recs.length === 0 && (
              <div className="text-sm text-muted-foreground py-8">No suggestions right now — try the planner.</div>
            )}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-8 px-5 grid grid-cols-2 gap-3">
        <QuickCard to="/trips" emoji="🧳" title="My trips" subtitle="Saved itineraries" />
        <QuickCard to="/profile" emoji="⚙️" title="Profile" subtitle="Preferences & favorites" />
      </section>
    </AppShell>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-secondary/50 border border-border px-4 py-3 min-h-[60px] focus-within:ring-2 focus-within:ring-ring transition">
      <span className="text-primary shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
          {label}
        </span>
        <div className="text-foreground">{children}</div>
      </div>
    </label>
  );
}

function QuickCard({ to, emoji, title, subtitle }: { to: "/trips" | "/profile"; emoji: string; title: string; subtitle: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-card shadow-card p-4 active:scale-[.98] transition"
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Link>
  );
}

// Placeholder kept by tooling — overwritten above
export {};
