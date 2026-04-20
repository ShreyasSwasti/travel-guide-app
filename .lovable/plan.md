
# TravelEase Guide — MVP Plan

A mobile-first travel planning app with a calming ocean-blue palette, built thumb-friendly with bottom-tab navigation.

## Scope (v1)
Auth + Home + Trip Planner + Map + My Trips + Profile. AI recommendations via Lovable AI. Mapbox for maps. Booking links open Booking.com/Expedia/Uber search URLs in a new tab. PWA, offline downloads, weather, currency, community reviews, emergency contacts, and live location share will be follow-ups.

## Design System
- **Primary:** Ocean blue `#007BFF` · **Success accent:** green `#28A745` · **Background:** white/cream
- **Font:** Inter (sans-serif), large headings, readable body
- **Layout:** Mobile-first, bottom tab bar (Home · Plan · Map · Trips · Profile), top search bar, large tappable areas, subtle fade/slide animations, high-contrast accessible buttons

## Data Model (Lovable Cloud / Supabase)
- **profiles** — id (→ auth.users), name, preferences (jsonb: budget range, interests[], units, dark_mode)
- **trips** — id, user_id, title, destination, start_date, end_date, budget_total, cover_image, created_at
- **activities** — id, trip_id, day_number, name, type (eat/see/do/stay), lat, lng, address, cost, start_time, rating, image_url, notes, booking_url, sort_order
- **favorites** — user_id, activity_id (composite PK)
- RLS on all tables — users only see their own rows

## Screens

### 1. Landing / Home
- Hero with "Where to next?" search: destination input, date range, budget slider, group size
- "Generate AI Itinerary" CTA → calls Lovable AI to draft a multi-day plan, saves as a trip, redirects to Planner
- Personalized recs carousel (AI-generated based on prefs once logged in)
- Login/Signup buttons (guest mode allowed for browsing recs)

### 2. Auth
- Email + password (Lovable Cloud, auto-confirm on for fast testing). Profile auto-created via trigger.

### 3. Trip Planner (`/trips/$tripId`)
- Day-by-day timeline of activities (sortable list, type icons)
- Add activity manually OR via AI ("Add a sunset dinner to Day 2")
- Edit name, type, time, cost, notes, booking URL
- Real-time **budget tracker**: total vs spent (mini ring chart), per-day breakdown
- "Get booking link" buttons → Booking.com (stay), Expedia (flights), Uber deep-link (transport), restaurant search
- Share link (read-only public view) + Export PDF (browser print)

### 4. Map (`/trips/$tripId/map`)
- Full-screen Mapbox map with pins for all activities, color-coded by type
- Tap pin → bottom sheet with activity details + "navigate" link (opens Apple/Google Maps)
- Filter chips (Eat / See / Do / Stay)
- Centers on trip destination

### 5. My Trips
- Card grid: cover image, title, destination, dates, budget bar
- Actions: open, duplicate, delete

### 6. Profile
- Name, preferences (interest chips, budget range, units, dark mode toggle)
- Favorites list, trip history
- Sign out

## Tech
- **Auth/DB:** Lovable Cloud (Supabase) with RLS
- **AI:** Lovable AI Gateway (`google/gemini-3-flash-preview`) via server function for itinerary generation, recs, and chat
- **Maps:** Mapbox GL JS — public token stored as a runtime setting (you'll add it once; I'll prompt when ready)
- **Routing:** TanStack Start file routes, protected layout for authed pages
- **PWA / offline / weather / currency / AI chat / reviews / emergency / live location** → follow-up iterations

## Build Order
1. Cloud + auth + schema + RLS
2. Layout shell (bottom tabs, top search, theme tokens)
3. Home + AI itinerary generator
4. Trip Planner (timeline, budget, edit, booking links)
5. My Trips + Profile
6. Mapbox integration on Map screen
