import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Map as MapIcon, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — TravelEase Guide" },
      { name: "description", content: "View your trip itineraries on an interactive map." },
    ],
  }),
  component: MapIndexPage,
});

interface TripRow {
  id: string;
  title: string;
  destination: string;
}

function MapIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRow[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trips")
      .select("id,title,destination")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTrips((data as TripRow[]) || []));
  }, [user]);

  return (
    <AppShell>
      <PageHeader title="Map" subtitle="Pick a trip to explore" />
      <div className="px-4 pt-4 space-y-3">
        {trips.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-ocean flex items-center justify-center text-primary-foreground">
              <MapIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold">No trips to map</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a trip to see it on the map.</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-ocean text-primary-foreground px-5 py-3 font-semibold shadow-soft"
            >
              Plan a trip
            </Link>
          </div>
        ) : (
          trips.map((t) => (
            <Link
              key={t.id}
              to="/trips/$tripId/map"
              params={{ tripId: t.id }}
              className="flex items-center justify-between rounded-2xl bg-card shadow-card p-4 active:scale-[.99] transition"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">{t.destination}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
