import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { generateRecommendations } from "@/server/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan a trip — TravelEase Guide" },
      { name: "description", content: "Discover destinations and start planning your next adventure." },
    ],
  }),
  component: PlanPage,
});

const INTERESTS = [
  { id: "adventure", label: "🥾 Adventure" },
  { id: "food", label: "🍜 Food" },
  { id: "family", label: "👨‍👩‍👧 Family" },
  { id: "beach", label: "🏖️ Beach" },
  { id: "culture", label: "🏛️ Culture" },
  { id: "nightlife", label: "🌃 Nightlife" },
  { id: "nature", label: "🌲 Nature" },
  { id: "budget", label: "💸 Budget" },
];

function PlanPage() {
  const recsFn = useServerFn(generateRecommendations);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [where, setWhere] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Array<{ title: string; destination: string; reason: string; emoji: string }>>([]);

  const fetchIdeas = async (q?: string, interests?: string[]) => {
    setLoading(true);
    try {
      const r = await recsFn({ data: { destination: q || undefined, interests: interests ?? [] } });
      setIdeas(r.ideas ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load ideas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <AppShell>
      <PageHeader title="Plan a trip" subtitle="Pick a vibe, get inspired" />

      <div className="px-5 pt-4 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchIdeas(where, picked);
          }}
          className="flex items-center gap-2 rounded-2xl bg-card border border-border px-4 py-2.5 shadow-card"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Search a region (e.g. Southeast Asia)"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Go
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = picked.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => toggle(i.id)}
                className={
                  "rounded-full px-3 py-1.5 text-sm font-medium border transition active:scale-95 " +
                  (on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50")
                }
              >
                {i.label}
              </button>
            );
          })}
        </div>

        {picked.length > 0 && (
          <button
            type="button"
            onClick={() => fetchIdeas(where, picked)}
            className="w-full h-11 rounded-2xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Refresh ideas
          </button>
        )}

        <div className="grid gap-3 pb-6">
          {loading && ideas.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))
            : ideas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!user) {
                      toast.message("Sign in to start planning");
                      navigate({ to: "/auth" });
                      return;
                    }
                    navigate({ to: "/", search: {} as never }).then(() => {
                      // pass via storage so home picks it up
                      sessionStorage.setItem("te_prefill_destination", idea.destination);
                    });
                  }}
                  className="text-left rounded-2xl bg-card shadow-card p-4 flex items-start gap-4 active:scale-[.99] transition"
                >
                  <div className="text-3xl shrink-0">{idea.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{idea.title}</div>
                    <div className="text-xs text-muted-foreground">{idea.destination}</div>
                    <p className="mt-1 text-sm text-foreground/80 line-clamp-2">{idea.reason}</p>
                  </div>
                </button>
              ))}
        </div>
      </div>
    </AppShell>
  );
}
