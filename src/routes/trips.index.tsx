import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Calendar, Trash2, Copy, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
  cover_image: string | null;
}

export const Route = createFileRoute("/trips/")({
  head: () => ({
    meta: [
      { title: "My trips — TravelEase Guide" },
      { name: "description", content: "View and manage all your saved travel itineraries." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("id,title,destination,start_date,end_date,budget_total,cover_image")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTrips((data as Trip[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this trip and all its activities?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTrips((t) => t.filter((x) => x.id !== id));
    toast.success("Trip deleted");
  };

  const duplicate = async (id: string) => {
    if (!user) return;
    const { data: src } = await supabase.from("trips").select("*").eq("id", id).single();
    if (!src) return;
    const { data: copy, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        title: `${src.title} (copy)`,
        destination: src.destination,
        start_date: src.start_date,
        end_date: src.end_date,
        budget_total: src.budget_total,
        group_size: src.group_size,
      })
      .select()
      .single();
    if (error || !copy) return toast.error(error?.message || "Failed");
    const { data: acts } = await supabase.from("activities").select("*").eq("trip_id", id);
    if (acts && acts.length) {
      await supabase.from("activities").insert(
        acts.map((a) => ({
          trip_id: copy.id,
          day_number: a.day_number,
          name: a.name,
          type: a.type,
          lat: a.lat,
          lng: a.lng,
          address: a.address,
          cost: a.cost,
          start_time: a.start_time,
          rating: a.rating,
          image_url: a.image_url,
          notes: a.notes,
          booking_url: a.booking_url,
          sort_order: a.sort_order,
        }))
      );
    }
    toast.success("Trip duplicated");
    load();
  };

  return (
    <AppShell>
      <PageHeader
        title="My trips"
        subtitle={trips.length ? `${trips.length} saved` : "Your adventures"}
        right={
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        }
      />
      <div className="px-4 pt-4 space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))
          : trips.length === 0
            ? <EmptyTrips />
            : trips.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl bg-card shadow-card overflow-hidden"
                >
                  <Link
                    to="/trips/$tripId"
                    params={{ tripId: t.id }}
                    className="block p-4 active:scale-[.99] transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-bold truncate">{t.title}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {t.destination}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-primary">
                          ${Number(t.budget_total).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">budget</div>
                      </div>
                    </div>
                    {(t.start_date || t.end_date) && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {t.start_date ? format(new Date(t.start_date), "MMM d") : "—"} →{" "}
                        {t.end_date ? format(new Date(t.end_date), "MMM d, yyyy") : "—"}
                      </div>
                    )}
                  </Link>
                  <div className="flex border-t border-border">
                    <button
                      onClick={() => duplicate(t.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium hover:bg-muted"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                    <span className="w-px bg-border" />
                    <button
                      onClick={() => remove(t.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </motion.div>
              ))}
      </div>
    </AppShell>
  );
}

function EmptyTrips() {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto w-16 h-16 rounded-2xl gradient-ocean flex items-center justify-center text-primary-foreground">
        <Briefcase className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold">No trips yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Start by generating an itinerary from the home screen.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-ocean text-primary-foreground px-5 py-3 font-semibold shadow-soft"
      >
        <Plus className="h-4 w-4" /> Plan your first trip
      </Link>
    </div>
  );
}
