// Smart redirect link builders
export function bookingComUrl(destination: string, start?: string | null, end?: string | null) {
  const params = new URLSearchParams({ ss: destination });
  if (start) params.set("checkin", start);
  if (end) params.set("checkout", end);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function expediaFlightsUrl(destination: string) {
  return `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=to:${encodeURIComponent(destination)}`;
}

export function uberUrl(destination?: string) {
  if (!destination) return "https://m.uber.com/";
  return `https://m.uber.com/looking?drop[0]=${encodeURIComponent(JSON.stringify({ addressLine1: destination }))}`;
}

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsNavUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function restaurantSearchUrl(destination: string, type = "restaurants") {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${type} in ${destination}`)}`;
}
