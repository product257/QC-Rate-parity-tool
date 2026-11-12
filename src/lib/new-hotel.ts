import type { Hotel } from "@/lib/qc-data";

export type NewHotelInput = {
  id: string;
  name: string;
  city: string;
  comps: number;
  bookingUrl: string;
  expediaUrl: string;
  agodaUrl: string;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns an error message, or a hotel ready to add to the portfolio. */
export function hotelFromInput(input: NewHotelInput, existing: Pick<Hotel, "id">[]): { hotel: Hotel } | { error: string } {
  const id = input.id.trim().toUpperCase();
  const name = input.name.trim();
  const city = input.city.trim();
  if (!/^US_\d{5}_\d{3}$/.test(id)) return { error: "BFI ID should look like US_90210_001" };
  if (existing.some((hotel) => hotel.id.toUpperCase() === id)) return { error: "That BFI ID is already in the portfolio" };
  if (!name) return { error: "Hotel name is required" };
  const urls = [
    ["Booking.com", input.bookingUrl.trim(), "Booking"],
    ["Expedia", input.expediaUrl.trim(), "Expedia"],
    ["Agoda", input.agodaUrl.trim(), "Agoda"],
  ] as const;
  const filled = urls.filter(([, url]) => url);
  if (filled.length === 0) return { error: "Add at least one platform URL" };
  for (const [platform, url] of filled) {
    if (!isHttpUrl(url)) return { error: `${platform} URL needs to start with http:// or https://` };
  }
  const comps = Number.isFinite(input.comps) ? Math.max(1, Math.round(input.comps)) : 3;
  const hotel: Hotel = {
    id,
    name,
    city: city || "—",
    type: "Hotel",
    rooms: "—",
    comps,
    channels: urls.filter(([, url]) => url).map(([, , channel]) => channel),
    score: 0,
    flags: 0,
  };
  const bookingUrl = input.bookingUrl.trim();
  const expediaUrl = input.expediaUrl.trim();
  const agodaUrl = input.agodaUrl.trim();
  if (bookingUrl) hotel.bookingUrl = bookingUrl;
  if (expediaUrl) hotel.expediaUrl = expediaUrl;
  if (agodaUrl) hotel.agodaUrl = agodaUrl;
  return { hotel };
}

/** Updates a hotel already in the portfolio. The BFI ID stays put. Empty listing links keep the current channels. */
export function hotelEditFromInput(input: NewHotelInput, current: Hotel): { hotel: Hotel } | { error: string } {
  const name = input.name.trim();
  const city = input.city.trim();
  if (!name) return { error: "Hotel name is required" };
  const urls = [
    ["Booking.com", input.bookingUrl.trim(), "Booking", "bookingUrl"],
    ["Expedia", input.expediaUrl.trim(), "Expedia", "expediaUrl"],
    ["Agoda", input.agodaUrl.trim(), "Agoda", "agodaUrl"],
  ] as const;
  const filled = urls.filter(([, url]) => url);
  for (const [platform, url] of filled) {
    if (!isHttpUrl(url)) return { error: `${platform} URL needs to start with http:// or https://` };
  }
  const comps = Number.isFinite(input.comps) ? Math.max(1, Math.round(input.comps)) : current.comps;
  const hotel: Hotel = { ...current, name, city: city || "—", comps };
  if (filled.length === 0) return { hotel };
  hotel.channels = filled.map(([, , channel]) => channel);
  for (const [, url, , key] of urls) {
    if (url) hotel[key] = url;
    else delete hotel[key];
  }
  return { hotel };
}
