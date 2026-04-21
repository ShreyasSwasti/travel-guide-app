import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, X, Map as MapIcon, Share2, Printer,
  Hotel, Plane, UtensilsCrossed, Camera, Mountain, ExternalLink, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  bookingComUrl, expediaFlightsUrl, uberUrl, restaurantSearchUrl,
} from "@/lib/booking";
import { cn } from "@/lib/utils";

type ActivityType = "eat" | "see" | "do" | "stay";

interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
}

interface Activity {
  id: string;
  trip_id: string;
  day_number: number;
  name: string;
  type: ActivityType;
  cost: number;
  start_time: string | null;
  address: string | null;
  notes: string | null;
  booking_url: string | null;
  sort_order: number;
}

export const Route = createFileRoute("/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip planner — TravelEase Guide" },
      { name: "description", content: "Plan your day-by-day itinerary, track your budget, and book essentials." },
    ],
  }),
  component: TripDetailPage,
});

function TripDetailPage() {
  const { tripId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [adding, setAdding] = useState<{ day: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    setLoading(true);
    const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).single();
    if (!t) {
      setLoading(false);
      return;
    }
    setTrip(t as Trip);
    const { data: a } = await supabase
      .from("activities")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number")
      .order("sort_order");
    setActivities((a as Activity[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tripId]);

  const totalSpent = useMemo(
    () => activities.reduce((s, a) => s + Number(a.cost || 0), 0),
    [activities]
  );
  const remaining = (trip?.budget_total ?? 0) - totalSpent;
  const pct = trip?.budget_total ? Math.min(100, (totalSpent / Number(trip.budget_total)) * 100) : 0;

  const days = useMemo(() => {
    if (trip?.start_date && trip?.end_date) {
      return Math.max(1, differenceInCalendarDays(new Date(trip.end_date), new Date(trip.start_date)) + 1);
    }
    const max = activities.reduce((m, a) => Math.max(m, a.day_number), 1);
    return Math.max(1, max);
  }, [trip, activities]);

  const grouped = useMemo(() => {
    const m: Record<number, Activity[]> = {};
    for (let d = 1; d <= days; d++) m[d] = [];
    activities.forEach((a) => {
      m[a.day_number] = m[a.day_number] || [];
      m[a.day_number].push(a);
    });
    return m;
  }, [activities, days]);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Loading…" back="/trips" />
        <div className="px-4 pt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!trip) {
    return (
      <AppShell>
        <PageHeader title="Trip not found" back="/trips" />
        <div className="px-6 py-10 text-center text-muted-foreground">
          This trip doesn't exist or you don't have access.
        </div>
      </AppShell>
    );
  }

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text: `Trip to ${trip.destination}`, url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Trip link copied");
  };

  return (
    <AppShell>
      <PageHeader
        title={trip.title}
        subtitle={trip.destination}
        back="/trips"
        right={
          <div className="flex items-center gap-1">
            <Link
              to="/trips/$tripId/map"
              params={{ tripId: trip.id }}
              aria-label="Open map"
              className="h-10 w-10 rounded-full hover:bg-muted inline-flex items-center justify-center"
            >
              <MapIcon className="h-5 w-5" />
            </Link>
            <button onClick={share} className="h-10 w-10 rounded-full hover:bg-muted inline-flex items-center justify-center" aria-label="Share">
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => window.print()}
              className="h-10 w-10 rounded-full hover:bg-muted inline-flex items-center justify-center"
              aria-label="Print / PDF"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {/* Budget */}
      <section className="px-4 pt-4">
        <div className="rounded-3xl gradient-ocean text-primary-foreground p-5 shadow-soft">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Budget</div>
              <div className="text-2xl font-extrabold">
                ${Number(trip.budget_total).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-80">Remaining</div>
              <div
                className={cn(
                  "text-2xl font-extrabold",
                  remaining < 0 ? "text-warning" : ""
                )}
              >
                ${remaining.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", pct > 100 ? "bg-warning" : "bg-white")}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] opacity-80">
            Spent ${totalSpent.toLocaleString()} of ${Number(trip.budget_total).toLocaleString()}
          </div>
        </div>

        {/* Booking quick links */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <BookingChip
            href={bookingComUrl(trip.destination, trip.start_date, trip.end_date)}
            icon={<Hotel className="h-4 w-4" />}
            label="Hotels"
          />
          <BookingChip
            href={expediaFlightsUrl(trip.destination)}
            icon={<Plane className="h-4 w-4" />}
            label="Flights"
          />
          <BookingChip
            href={restaurantSearchUrl(trip.destination)}
            icon={<UtensilsCrossed className="h-4 w-4" />}
            label="Eats"
          />
          <BookingChip
            href={uberUrl(trip.destination)}
            icon={<Camera className="h-4 w-4" />}
            label="Rides"
          />
        </div>
      </section>

      {/* Days */}
      <section className="px-4 pt-6 space-y-5">
        {Array.from({ length: days }).map((_, i) => {
          const dayNum = i + 1;
          const items = grouped[dayNum] || [];
          const dayCost = items.reduce((s, a) => s + Number(a.cost || 0), 0);
          const dayDate = trip.start_date
            ? format(new Date(new Date(trip.start_date).getTime() + i * 86400000), "EEE, MMM d")
            : `Day ${dayNum}`;

          return (
            <div key={dayNum}>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Day {dayNum}
                  </div>
                  <div className="text-base font-bold">{dayDate}</div>
                </div>
                <div className="text-xs font-semibold text-primary">
                  ${dayCost.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((a) => (
                    <ActivityRow
                      key={a.id}
                      activity={a}
                      onEdit={() => setEditing(a)}
                      onDelete={async () => {
                        await supabase.from("activities").delete().eq("id", a.id);
                        setActivities((prev) => prev.filter((x) => x.id !== a.id));
                      }}
                    />
                  ))}
                </AnimatePresence>
                <button
                  onClick={() => setAdding({ day: dayNum })}
                  className="w-full rounded-2xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add activity
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Editor sheet */}
      <AnimatePresence>
        {(editing || adding) && (
          <ActivitySheet
            initial={
              editing ?? {
                id: "",
                trip_id: trip.id,
                day_number: adding?.day || 1,
                name: "",
                type: "see",
                cost: 0,
                start_time: null,
                address: null,
                notes: null,
                booking_url: null,
                sort_order: 0,
              }
            }
            isNew={!editing}
            onClose={() => {
              setEditing(null);
              setAdding(null);
            }}
            onSaved={(saved, isNew) => {
              setActivities((prev) => {
                if (isNew) return [...prev, saved].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order);
                return prev.map((x) => (x.id === saved.id ? saved : x));
              });
              setEditing(null);
              setAdding(null);
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function BookingChip({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl bg-card shadow-card py-2.5 inline-flex flex-col items-center justify-center gap-0.5 active:scale-95 transition"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </a>
  );
}

const TYPE_META: Record<ActivityType, { color: string; bg: string; accent: string; icon: React.ReactNode; label: string }> = {
  eat:  { color: "text-eat",  bg: "bg-[var(--eat)]/10",  accent: "bg-[var(--eat)]",  icon: <UtensilsCrossed className="h-4 w-4" />, label: "Eat" },
  see:  { color: "text-see",  bg: "bg-[var(--see)]/10",  accent: "bg-[var(--see)]",  icon: <Camera className="h-4 w-4" />, label: "See" },
  do:   { color: "text-do",   bg: "bg-[var(--do)]/10",   accent: "bg-[var(--do)]",   icon: <Mountain className="h-4 w-4" />, label: "Do" },
  stay: { color: "text-stay", bg: "bg-[var(--stay)]/10", accent: "bg-[var(--stay)]", icon: <Hotel className="h-4 w-4" />, label: "Stay" },
};

function ActivityRow({
  activity, onEdit, onDelete,
}: {
  activity: Activity; onEdit: () => void; onDelete: () => void;
}) {
  const meta = TYPE_META[activity.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="relative overflow-hidden rounded-[16px] bg-card shadow-card hover:shadow-lg transition-shadow p-4 pl-5 flex items-start gap-3"
    >
      {/* Left colored border accent */}
      <span className={cn("absolute left-0 top-0 bottom-0 w-1.5", meta.accent)} aria-hidden />

      <div className={cn("h-10 w-10 rounded-xl inline-flex items-center justify-center shrink-0", meta.bg, meta.color)}>
        {meta.icon}
      </div>
      <button onClick={onEdit} className="flex-1 min-w-0 text-left">
        <div className="text-[15px] font-medium leading-snug truncate text-foreground">
          {activity.name}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className={cn("font-semibold uppercase tracking-wide", meta.color)}>{meta.label}</span>
          {activity.start_time && (
            <>
              <span aria-hidden>·</span>
              <span>{activity.start_time}</span>
            </>
          )}
          {activity.address && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{activity.address}</span>
            </>
          )}
        </div>
        {activity.notes && (
          <div className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{activity.notes}</div>
        )}
      </button>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-sm font-semibold">${Number(activity.cost).toLocaleString()}</div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="h-7 w-7 rounded-lg hover:bg-muted inline-flex items-center justify-center" aria-label="Edit">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive inline-flex items-center justify-center" aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ActivitySheet({
  initial, isNew, onClose, onSaved,
}: {
  initial: Activity;
  isNew: boolean;
  onClose: () => void;
  onSaved: (a: Activity, isNew: boolean) => void;
}) {
  const [draft, setDraft] = useState<Activity>(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Name is required");
    setSaving(true);
    if (isNew) {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          trip_id: draft.trip_id,
          day_number: draft.day_number,
          name: draft.name,
          type: draft.type,
          cost: draft.cost,
          start_time: draft.start_time,
          address: draft.address,
          notes: draft.notes,
          booking_url: draft.booking_url,
          sort_order: 999,
        })
        .select()
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message || "Failed");
      onSaved(data as Activity, true);
      toast.success("Added");
    } else {
      const { data, error } = await supabase
        .from("activities")
        .update({
          name: draft.name,
          type: draft.type,
          cost: draft.cost,
          start_time: draft.start_time,
          address: draft.address,
          notes: draft.notes,
          booking_url: draft.booking_url,
          day_number: draft.day_number,
        })
        .eq("id", draft.id)
        .select()
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message || "Failed");
      onSaved(data as Activity, false);
      toast.success("Saved");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{isNew ? "Add activity" : "Edit activity"}</h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full hover:bg-muted inline-flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {(["eat", "see", "do", "stay"] as ActivityType[]).map((t) => {
              const meta = TYPE_META[t];
              const on = draft.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft({ ...draft, type: t })}
                  className={cn(
                    "rounded-xl py-2.5 text-xs font-semibold border inline-flex flex-col items-center gap-0.5 transition",
                    on ? cn(meta.bg, meta.color, "border-transparent") : "bg-card border-border"
                  )}
                >
                  <span className={cn(on ? "" : "text-muted-foreground")}>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
          <SheetField label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full bg-transparent outline-none text-base font-medium"
              placeholder="Sunset dinner at Time Out Market"
            />
          </SheetField>
          <div className="grid grid-cols-2 gap-3">
            <SheetField label="Day">
              <input
                type="number" min={1}
                value={draft.day_number}
                onChange={(e) => setDraft({ ...draft, day_number: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full bg-transparent outline-none text-sm font-medium"
              />
            </SheetField>
            <SheetField label="Time">
              <input
                value={draft.start_time ?? ""}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value || null })}
                placeholder="19:00"
                className="w-full bg-transparent outline-none text-sm"
              />
            </SheetField>
          </div>
          <SheetField label="Cost (USD)">
            <input
              type="number" min={0} step="0.01"
              value={draft.cost}
              onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })}
              className="w-full bg-transparent outline-none text-sm"
            />
          </SheetField>
          <SheetField label="Address">
            <input
              value={draft.address ?? ""}
              onChange={(e) => setDraft({ ...draft, address: e.target.value || null })}
              className="w-full bg-transparent outline-none text-sm"
              placeholder="Avenida 24 de Julho, Lisbon"
            />
          </SheetField>
          <SheetField label="Notes">
            <textarea
              rows={3}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
              className="w-full bg-transparent outline-none text-sm resize-none"
              placeholder="Reservation needed, vegetarian options…"
            />
          </SheetField>
          <SheetField label="Booking URL">
            <input
              value={draft.booking_url ?? ""}
              onChange={(e) => setDraft({ ...draft, booking_url: e.target.value || null })}
              className="w-full bg-transparent outline-none text-sm"
              placeholder="https://…"
            />
          </SheetField>

          {draft.booking_url && (
            <a
              href={draft.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              Open booking <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full h-12 rounded-2xl gradient-ocean text-primary-foreground font-semibold shadow-soft active:scale-[.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isNew ? <><Sparkles className="h-4 w-4" /> Add</> : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        {label}
      </span>
      <div className="rounded-xl bg-secondary/50 border border-border px-3 py-2.5">{children}</div>
    </label>
  );
}
