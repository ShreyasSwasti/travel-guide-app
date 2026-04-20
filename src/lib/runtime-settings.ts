// User-managed runtime settings stored in localStorage (browser only).
// Currently used for the Mapbox public token.

const MAPBOX_KEY = "te_mapbox_token";

export function getMapboxToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MAPBOX_KEY);
}

export function setMapboxToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MAPBOX_KEY, token.trim());
}

export function clearMapboxToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MAPBOX_KEY);
}
