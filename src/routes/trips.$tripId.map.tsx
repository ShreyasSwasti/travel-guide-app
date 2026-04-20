import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { type Map as MbMap, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, ExternalLink, MapPin, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMapboxToken } from "@/lib/runtime-settings";
import { googleMapsNavUrl, googleMapsSearchUrl } from "@/lib/booking";
import { cn } from "@/lib/utils";

type ActivityType = "eat" | "see" | "do" | "stay";

interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  lat: number | null;
  lng: number | null;
  address: string | null;
  cost: number;
  day_number: number;
  start_time: string | null;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
}

export const Route = createFileRoute("/trips/$tripId/map")({
  head: () => ({
    meta: [
      { title: "Trip map — TravelEase Guide" },
      { name: "description", content: "View your trip's activities on an interactive map." },
    ],
  }),
  component: TripMapPage,
});

const TYPE_COLOR: Record<ActivityType, string> = {
  eat: "#e8743b",
  see: "#007BFF",
  do: "#28A745",
  stay: "#7c3aed",
};

const FILTERS: Array<{ id: ActivityType | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "eat", label: "Eat" },
  { id: "see", label: "See" },
  { id: "do", label: "Do" },
  { id: "stay", label: "Stay" },
];

function TripMapPage() {
  const { tripId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [selected, setSelected] = useState<Activity | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("trips").select("id,title,destination").eq("id", tripId).single().then(({ data }) => {
      if (data) setTrip(data as Trip);
    });
    supabase.from("activities").select("*").eq("trip_id", tripId).then(({ data }) => {
      setActivities((data as Activity[]) || []);
    });
  }, [user, tripId]);

  const filtered = useMemo(
    () => activities.filter((a) => (filter === "all" ? true : a.type === filter)),
    [activities, filter]
  );

  // Geocode missing coords using Mapbox geocoder
  useEffect(() => {
    const token = getMapboxToken();
    if (!token || !trip) return;
    const need = activities.filter((a) => a.lat == null || a.lng == null);
    if (!need.length) return;
    let cancelled = false;
    (async () => {
      const updates: Array<{ id: string; lat: number; lng: number }> = [];
      for (const a of need) {
        const q = encodeURIComponent(`${a.address || a.name}, ${trip.destination}`);
        try {
          const r = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?limit=1&access_token=${token}`
          );
          if (!r.ok) continue;
          const j = await r.json();
          const c = j.features?.[0]?.center;
          if (c && Array.isArray(c) && c.length === 2) {
            updates.push({ id: a.id, lat: c[1], lng: c[0] });
          }
        } catch {/* skip */}
      }
      if (cancelled || !updates.length) return;
      // persist
      await Promise.all(
        updates.map((u) =>
          supabase.from("activities").update({ lat: u.lat, lng: u.lng }).eq("id", u.id)
        )
      );
      setActivities((prev) =>
        prev.map((a) => {
          const u = updates.find((x) => x.id === a.id);
          return u ? { ...a, lat: u.lat, lng: u.lng } : a;
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activities, trip]);

  // Init map
  useEffect(() => {
    const token = getMapboxToken();
    if (!token) {
      setTokenMissing(true);
      return;
    }
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [0, 20],
        zoom: 1.5,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
    } catch (e) {
      setMapError(e instanceof Error ? e.message : "Failed to initialize map");
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Fit + render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withCoords = filtered.filter((a) => a.lat != null && a.lng != null);
    if (!withCoords.length) {
      // Try centering on destination
      const token = getMapboxToken();
      if (!token || !trip) return;
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trip.destination
        )}.json?limit=1&access_token=${token}`
      )
        .then((r) => r.json())
        .then((j) => {
          const c = j.features?.[0]?.center;
          if (c) map.flyTo({ center: c, zoom: 11 });
        })
        .catch(() => {});
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    withCoords.forEach((a) => {
      const el = document.createElement("button");
      el.className =
        "h-9 w-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer";
      el.style.backgroundColor = TYPE_COLOR[a.type];
      el.textContent = a.day_number.toString();
      el.onclick = (e) => {
        e.stopPropagation();
        setSelected(a);
        map.flyTo({ center: [a.lng!, a.lat!], zoom: 14 });
      };
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([a.lng!, a.lat!])
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([a.lng!, a.lat!]);
    });

    if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 13 });
    } else {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    }
  }, [filtered, trip]);

  return (
    <AppShell>
      <PageHeader
        title={trip?.title ?? "Map"}
        subtitle={trip?.destination}
        back={`/trips/${tripId}`}
      />

      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            const color = f.id === "all" ? "var(--primary)" : TYPE_COLOR[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition",
                  on ? "text-white border-transparent" : "bg-card border-border text-foreground"
                )}
                style={on ? { backgroundColor: color } : undefined}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="relative rounded-2xl overflow-hidden shadow-card border border-border h-[60vh]">
          {tokenMissing ? (
            <TokenMissing />
          ) : mapError ? (
            <div className="h-full flex items-center justify-center text-sm text-destructive p-4 text-center">
              {mapError}
            </div>
          ) : (
            <div ref={mapContainer} className="absolute inset-0" />
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-x-0 bottom-20 z-40 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-w-2xl rounded-3xl bg-card shadow-card p-4"
            role="dialog"
            aria-label="Activity details"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-[10px] uppercase font-bold tracking-wider"
                  style={{ color: TYPE_COLOR[selected.type] }}
                >
                  Day {selected.day_number} · {selected.type}
                </div>
                <div className="font-bold truncate">{selected.name}</div>
                {selected.address && (
                  <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {selected.address}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="h-8 w-8 rounded-full hover:bg-muted inline-flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={
                  selected.lat != null && selected.lng != null
                    ? googleMapsNavUrl(selected.lat, selected.lng)
                    : googleMapsSearchUrl(`${selected.name} ${selected.address ?? ""}`)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-10 rounded-xl gradient-ocean text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                Navigate <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {selected.cost > 0 && (
                <div className="px-3 h-10 rounded-xl bg-secondary inline-flex items-center text-sm font-semibold">
                  ${Number(selected.cost).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function TokenMissing() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-secondary/40">
      <div className="h-12 w-12 rounded-2xl bg-warning/15 text-warning inline-flex items-center justify-center">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-bold">Mapbox token needed</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs">
        Add a free public Mapbox token in your Profile to enable the interactive map.
      </p>
      <Link
        to="/profile"
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
      >
        Go to Profile
      </Link>
    </div>
  );
}
