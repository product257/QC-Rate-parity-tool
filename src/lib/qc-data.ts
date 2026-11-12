export type Hotel = {
  id: string;
  name: string;
  type: string;
  city: string;
  rooms: string;
  comps: number;
  channels: string[];
  score: number;
  flags: number;
  bookingUrl?: string;
  expediaUrl?: string;
  agodaUrl?: string;
};

const base: Omit<Hotel, "id">[] = [
  { name: "Grand Palm Resort", type: "Luxury 5-Star", city: "London, Mayfair", rooms: "142 Rooms", comps: 5, channels: ["Booking", "Expedia", "Agoda"], score: 96, flags: 0 },
  { name: "Grand Hotel London", type: "City Boutique", city: "London, Westminster", rooms: "98 Rooms", comps: 5, channels: ["Booking", "Expedia", "Agoda"], score: 83, flags: 2 },
  { name: "Mayfair Luxury Suites", type: "Serviced Apts", city: "London, Mayfair", rooms: "45 Suites", comps: 4, channels: ["Booking", "Expedia"], score: 98, flags: 0 },
  { name: "Victoria Court Hotel", type: "Classic Hotel", city: "London, Victoria", rooms: "120 Rooms", comps: 6, channels: ["Booking", "Expedia", "Agoda"], score: 95, flags: 0 },
  { name: "Oxford Riverside Resort", type: "Country Lodge", city: "Oxfordshire, Thames", rooms: "74 Rooms", comps: 5, channels: ["Booking", "Expedia"], score: 92, flags: 0 },
  { name: "Cambridge Park Lodge", type: "Business Hotel", city: "Cambridge, Center", rooms: "88 Rooms", comps: 4, channels: ["Booking", "Agoda"], score: 95, flags: 0 },
  { name: "Manchester City Grand", type: "Convention Center", city: "Manchester, Center", rooms: "210 Rooms", comps: 8, channels: ["Booking", "Expedia", "Agoda"], score: 86, flags: 1 },
  { name: "Edinburgh Royal Mile Suites", type: "Heritage Hotel", city: "Edinburgh, Old Town", rooms: "115 Rooms", comps: 5, channels: ["Booking", "Expedia", "Agoda"], score: 97, flags: 0 },
];
const extraNames: [string, string][] = [
  ["Bath Spa Retreat", "Bath, Centre"], ["Brighton Seafront Inn", "Brighton, Seafront"], ["York Minster House", "York, Old City"],
  ["Liverpool Docks Hotel", "Liverpool, Albert Dock"], ["Bristol Harbour Stay", "Bristol, Harbourside"], ["Leeds Central Plaza", "Leeds, Center"],
  ["Glasgow Merchant Hotel", "Glasgow, Merchant City"], ["Cardiff Bay Suites", "Cardiff, Bay"], ["Kensington Garden Hotel", "London, Kensington"],
  ["Soho Loft Rooms", "London, Soho"], ["Camden Lock Lodge", "London, Camden"], ["Windsor Castle View", "Windsor, Centre"],
  ["Lake District Manor", "Cumbria, Windermere"], ["Cotswolds Stone Inn", "Cotswolds, Bibury"], ["Canterbury Abbey Hotel", "Kent, Canterbury"],
  ["Newcastle Quayside", "Newcastle, Quayside"], ["Nottingham Castle Hotel", "Nottingham, Center"], ["Birmingham Canal Suites", "Birmingham, Brindleyplace"],
];
/** US zip for each hotel, in HOTELS order. Serial is 001, 002, … so the id reads US_90210_001. */
const BFI_ZIPS = [
  "90210", "10001", "33139", "94102", "60601",
  "02139", "03101", "15222", "84101", "80202",
  "44114", "70130", "37201", "55401", "97201",
  "20001", "20008", "10012", "11215", "22101",
  "59801", "28801", "29401", "27701", "43215",
  "35203",
];

/** Master competitor catalog. Portfolio hotels draw a local subset; the dashboard counts distinct names from here. */
export const COMPSET = [
  "The Dorchester", "Claridge's", "The Connaught", "Four Seasons Hotel London at Park Lane", "The Ritz London",
  "The Lanesborough", "Mandarin Oriental Hyde Park", "The Savoy", "Corinthia London", "Raffles London at The OWO",
  "Hilton London Bankside", "Park Plaza Westminster Bridge", "Apex City of London", "The Ned", "The Berkeley",
  "The Peninsula London", "Ham Yard Hotel", "Hotel Café Royal", "The Hoxton Shoreditch", "St. Pancras Renaissance Hotel",
  "Kimpton Fitzroy London", "Rosewood London",
  "Old Bank Hotel", "The Randolph Hotel", "Malmaison Oxford", "The University Arms", "Hilton Cambridge City Centre",
  "The Gonville Hotel", "Kimpton Clocktower Manchester", "King Street Townhouse", "The Midland Manchester", "Dakota Manchester",
  "Leonardo Hotel Manchester Piccadilly", "The Balmoral", "Gleneagles Townhouse", "Prestonfield", "The Glasshouse Edinburgh",
  "The Gainsborough Bath Spa", "The Royal Crescent Hotel", "Apex City of Bath Hotel", "The Grand Brighton", "Brighton Harbour Hotel",
  "The Grand York", "Hotel Indigo York", "The Milner York", "Titanic Hotel Liverpool", "Hope Street Hotel", "Malmaison Liverpool",
  "Bristol Harbour Hotel", "Hotel du Vin Bristol", "Dakota Leeds", "Quebecs Leeds", "Blythswood Square Hotel", "Dakota Glasgow",
  "The Parkgate Hotel", "Hotel Indigo Cardiff", "Castle Hotel Windsor", "Harte and Garter Hotel", "The Samling",
  "Gilpin Hotel & Lake House", "The Lygon Arms", "Whatley Manor", "ABode Canterbury", "Canterbury Cathedral Lodge",
  "Malmaison Newcastle", "Vermont Hotel", "Hart's Hotel", "St. James Hotel Nottingham", "The Grand Hotel Birmingham",
  "Hotel du Vin Birmingham",
];

/** 3–6 competitors for each of the 26 portfolio hotels, chosen from the same city or a neighbouring market. */
const COMPETITOR_LINKS: Record<string, readonly string[]> = {
  "Grand Palm Resort": ["The Dorchester", "Claridge's", "The Connaught", "Four Seasons Hotel London at Park Lane", "The Ritz London"],
  "Mayfair Luxury Suites": ["The Lanesborough", "Mandarin Oriental Hyde Park", "The Berkeley", "The Peninsula London"],
  "Grand Hotel London": ["The Savoy", "Corinthia London", "Raffles London at The OWO", "Rosewood London", "The Ned"],
  "Victoria Court Hotel": ["Hilton London Bankside", "Park Plaza Westminster Bridge", "Apex City of London", "The Ned", "The Savoy", "Corinthia London"],
  "Kensington Garden Hotel": ["The Berkeley", "Mandarin Oriental Hyde Park", "The Peninsula London", "The Lanesborough", "Claridge's"],
  "Soho Loft Rooms": ["Ham Yard Hotel", "Hotel Café Royal", "Rosewood London", "The Ned"],
  "Camden Lock Lodge": ["St. Pancras Renaissance Hotel", "Kimpton Fitzroy London", "The Hoxton Shoreditch", "Hotel Café Royal"],
  "Oxford Riverside Resort": ["Old Bank Hotel", "The Randolph Hotel", "Malmaison Oxford", "The Lygon Arms"],
  "Cambridge Park Lodge": ["The University Arms", "Hilton Cambridge City Centre", "The Gonville Hotel"],
  "Manchester City Grand": ["Kimpton Clocktower Manchester", "King Street Townhouse", "The Midland Manchester", "Dakota Manchester", "Leonardo Hotel Manchester Piccadilly"],
  "Edinburgh Royal Mile Suites": ["The Balmoral", "Gleneagles Townhouse", "Prestonfield", "The Glasshouse Edinburgh"],
  "Bath Spa Retreat": ["The Gainsborough Bath Spa", "The Royal Crescent Hotel", "Apex City of Bath Hotel"],
  "Brighton Seafront Inn": ["The Grand Brighton", "Brighton Harbour Hotel", "The Savoy"],
  "York Minster House": ["The Grand York", "Hotel Indigo York", "The Milner York"],
  "Liverpool Docks Hotel": ["Titanic Hotel Liverpool", "Hope Street Hotel", "Malmaison Liverpool"],
  "Bristol Harbour Stay": ["Bristol Harbour Hotel", "Hotel du Vin Bristol", "The Gainsborough Bath Spa"],
  "Leeds Central Plaza": ["Dakota Leeds", "Quebecs Leeds", "The Grand York"],
  "Glasgow Merchant Hotel": ["Blythswood Square Hotel", "Dakota Glasgow", "The Balmoral"],
  "Cardiff Bay Suites": ["The Parkgate Hotel", "Hotel Indigo Cardiff", "Bristol Harbour Hotel"],
  "Windsor Castle View": ["Castle Hotel Windsor", "Harte and Garter Hotel", "The Savoy"],
  "Lake District Manor": ["The Samling", "Gilpin Hotel & Lake House", "The Midland Manchester"],
  "Cotswolds Stone Inn": ["The Lygon Arms", "Whatley Manor", "The Randolph Hotel"],
  "Canterbury Abbey Hotel": ["ABode Canterbury", "Canterbury Cathedral Lodge", "The Savoy"],
  "Newcastle Quayside": ["Malmaison Newcastle", "Vermont Hotel", "The Grand York"],
  "Nottingham Castle Hotel": ["Hart's Hotel", "St. James Hotel Nottingham", "The Grand Hotel Birmingham"],
  "Birmingham Canal Suites": ["The Grand Hotel Birmingham", "Hotel du Vin Birmingham", "Hart's Hotel"],
};

/** Competitors pre-selected on the report for the default hotel. Matches that hotel's latest saved batch. */
export const DEFAULT_COMPETITORS = ["The Dorchester", "Claridge's", "The Connaught"];

export const HOTELS: Hotel[] = [
  ...base,
  ...extraNames.map(([name, city], i) => ({
    name, city, type: ["Business Hotel", "Boutique", "Country Lodge", "Classic Hotel"][i % 4] ?? "Hotel",
    rooms: `${60 + ((i * 17) % 120)} Rooms`, comps: 3 + (i % 5),
    channels: i % 3 === 0 ? ["Booking", "Expedia"] : ["Booking", "Expedia", "Agoda"],
    score: 90 + ((i * 7) % 9), flags: 0,
  })),
].map((h, i) => {
  const zip = BFI_ZIPS[i];
  if (!zip) throw new Error(`Missing BFI zip for ${h.name}`);
  const competitors = COMPETITOR_LINKS[h.name];
  if (!competitors) throw new Error(`Missing competitors for ${h.name}`);
  return { ...h, comps: competitors.length, id: `US_${zip}_${String(i + 1).padStart(3, "0")}` };
});

/** Competitors stored with a portfolio QC run so the property's batch history has that audit. */
export function auditCompetitors(hotel: Pick<Hotel, "id" | "comps">) {
  const known = HOTELS.find((item) => item.id === hotel.id);
  const linked = known ? COMPETITOR_LINKS[known.name] : undefined;
  if (linked) return [...linked];
  const count = Math.min(Math.max(hotel.comps, 1), COMPSET.length);
  const start = Number(hotel.id.replace(/\D/g, "")) % COMPSET.length;
  return Array.from({ length: count }, (_, index) => COMPSET[(start + index) % COMPSET.length]!);
}
export const PLATFORMS = ["Booking.com", "Expedia", "Agoda"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Hotels added in this visit. The catalog provider keeps this in sync so labels include them. */
let liveHotels: Hotel[] = HOTELS;
export function syncLiveHotels(hotels: Hotel[]) {
  liveHotels = hotels;
}
export function lookupHotel(id: string) {
  return liveHotels.find((hotel) => hotel.id === id) ?? HOTELS.find((hotel) => hotel.id === id);
}

/** Full selector and table label: `US_90210_001 - Grand Palm Resort`. */
export const hotelLabel = (id: string) => {
  const h = lookupHotel(id);
  return h ? `${h.id} - ${h.name}` : id;
};
export const shortName = (id: string) => hotelLabel(id);

/** Detect hotels mentioned in free text by BFI id (US_90210_001 or us_zipcode_001) or hotel name. */
export const detectProperties = (text: string): string[] => {
  const t = text.toLowerCase();
  const found = new Set<string>();
  for (const m of t.matchAll(/us_zipcode[_-](\d+)/g)) {
    const serial = m[1]?.padStart(3, "0");
    if (!serial) continue;
    const hotel = HOTELS.find((h) => h.id.endsWith(`_${serial}`));
    if (hotel) found.add(hotel.id);
  }
  for (const h of HOTELS) {
    if (t.includes(h.id.toLowerCase()) || t.includes(h.name.toLowerCase())) found.add(h.id);
  }
  return [...found];
};

const STOPWORDS = new Set(["the", "and", "for", "with", "check", "test", "case", "that", "this", "from", "meets", "against", "status", "display"]);

/**
 * Given a test-case title (no ids), find properties linked to similar existing
 * test cases by word overlap, e.g. "swimming pool maintenance" -> TC-028's hotels.
 */
export const matchTestCaseProperties = (title: string): string[] => {
  const words = title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  if (words.length === 0) return [];
  const found = new Set<string>();
  for (const tc of TEST_CASES) {
    const tcWords = tc.title.toLowerCase().split(/[^a-z0-9]+/).filter((tw) => tw.length >= 2);
    const hits = words.filter((w) => tcWords.some((tw) => tw.startsWith(w) || w.startsWith(tw))).length;
    if (hits >= 2 && tc.properties !== "all") tc.properties.forEach((p) => found.add(p));
  }
  return [...found];
};

export type TestCase = {
  id: string; properties: string[] | "all"; platform: string; title: string; description: string; active: boolean;
};
function checkText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** A check belongs to a test case when the case title names that field. */
export function testCaseCoversCheck(test: TestCase, row: Discrepancy) {
  const title = checkText(test.title);
  const field = checkText(row.field);
  const stemmed = field.replace(/s\b/g, "").replace(/\s+/g, " ").trim();
  if (title.includes(field) || (stemmed.length >= 4 && title.includes(stemmed))) return true;
  const first = field.split(" ")[0] ?? "";
  return first.length >= 6 && title.includes(first);
}

/** One result per Active test case. Stored checks fill in the row when the title matches; every other selected case still appears. */
export function checksForActiveCases(checks: Discrepancy[], cases: TestCase[], propertyId: string): Discrepancy[] {
  const active = cases.filter((test) => test.active && (test.properties === "all" || (propertyId !== "" && test.properties.includes(propertyId))));
  return active.map((test) => {
    const match = checks.find((row) => (row.property === "all" || row.property === propertyId) && testCaseCoversCheck(test, row));
    if (match) return { ...match, property: propertyId };
    return {
      field: test.title,
      sub: test.id,
      property: propertyId,
      hotel: "Recorded",
      channel: test.platform,
      live: "Recorded",
      status: "MATCHED",
    };
  });
}

export const TEST_CASES: TestCase[] = [
  { id: "TC-014", properties: "all", platform: "Booking.com", title: "Response rate meets threshold (SLA >= 90%)", description: "Check that the property response rate on Booking.com meets or exceeds the threshold of 90%.\nOpen the property page for the target hotel, read the response rate value shown on the card, and confirm it is >= 90.\nNotes: Flag as fail if the value is below 90. Do not connect platform data - report only.", active: true },
  { id: "TC-022", properties: ["US_10001_002"], platform: "Booking.com", title: "Review score parity (Matched against 3 Selected Comp-Sets)", description: "Compare review score of the property against the selected comp-set.", active: true },
  { id: "TC-028", properties: ["US_90210_001"], platform: "Agoda", title: "Swimming pool maintenance status sync", description: "Verify pool open/closed status matches the hotel record.", active: true },
  { id: "TC-052", properties: ["US_10001_002"], platform: "Expedia", title: "Security deposit benchmark (Median of 3 Selected Comp-Sets)", description: "Compare security deposit with median of comp-set.", active: true },
  { id: "TC-031", properties: "all", platform: "Expedia", title: "Mandatory city taxes & resort fees disclosed at checkout", description: "Ensure taxes and fees are disclosed before payment.", active: true },
  { id: "TC-067", properties: ["US_90210_001"], platform: "Booking.com", title: "Cancellation policy display integrity (Free 24h cancellation)", description: "Check that free 24h cancellation is displayed.", active: true },
  { id: "TC-045", properties: "all", platform: "Booking.com", title: "Guest review count visibility check", description: "Ensure review count is visible on listing.", active: false },
  { id: "TC-091", properties: ["US_90210_001"], platform: "Expedia", title: "Breakfast included badge position check", description: "Verify breakfast badge appears on rate card.", active: false },
  { id: "TC-103", properties: ["US_10001_002"], platform: "Agoda", title: "Check-in time consistency", description: "Compare check-in time on Agoda with hotel record.", active: true },
  { id: "TC-108", properties: "all", platform: "Booking.com", title: "Free Wi-Fi amenity listed", description: "Ensure free Wi-Fi is listed as amenity.", active: true },
  { id: "TC-112", properties: ["US_90210_001"], platform: "Agoda", title: "Check-out time consistency", description: "Compare check-out time with hotel record.", active: true },
  { id: "TC-120", properties: ["US_10001_002"], platform: "Expedia", title: "Room photo count >= 10", description: "Check at least 10 room photos exist.", active: true },
];

export type Discrepancy = {
  field: string; sub: string; property: string; hotel: string; channel: string; live: string;
  status: "MISMATCH" | "WARNING" | "MATCHED";
};
export const DISCREPANCIES: Discrepancy[] = [
  { field: "Swimming Pool", sub: "Facility Status", property: "US_90210_001", hotel: "CLOSED", channel: "Agoda", live: "OPEN", status: "MISMATCH" },
  { field: "Check-in Time", sub: "Front Desk Policy", property: "US_10001_002", hotel: "02:00 PM", channel: "Expedia", live: "03:00 PM", status: "WARNING" },
  { field: "Security Deposit", sub: "Incidental Fee", property: "US_10001_002", hotel: "$100.00", channel: "Booking.com", live: "$100.00", status: "MATCHED" },
  { field: "Check-out Time", sub: "Front Desk Policy", property: "US_90210_001", hotel: "11:00 AM", channel: "Agoda", live: "11:00 AM", status: "MATCHED" },
  { field: "Free Wi-Fi", sub: "Amenity", property: "all", hotel: "Included", channel: "Agoda", live: "Included", status: "MATCHED" },
  { field: "Breakfast Service", sub: "Dining Plan", property: "US_10001_002", hotel: "Included", channel: "Booking.com", live: "Included", status: "MATCHED" },
  { field: "Parking Fee", sub: "Facility Charge", property: "US_90210_001", hotel: "£25.00", channel: "Expedia", live: "£25.00", status: "MATCHED" },
  { field: "Pet Policy", sub: "House Rules", property: "US_10001_002", hotel: "Not allowed", channel: "Booking.com", live: "Not allowed", status: "MATCHED" },
  { field: "Room Photos", sub: "Content", property: "US_90210_001", hotel: "14", channel: "Agoda", live: "14", status: "MATCHED" },
  { field: "City Tax", sub: "Mandatory Fee", property: "all", hotel: "Disclosed", channel: "Expedia", live: "Disclosed", status: "MATCHED" },
  { field: "Spa Hours", sub: "Facility", property: "US_90210_001", hotel: "9AM–8PM", channel: "Booking.com", live: "9AM–8PM", status: "MATCHED" },
  { field: "Late Check-out", sub: "Policy", property: "US_10001_002", hotel: "£35.00", channel: "Agoda", live: "£35.00", status: "MATCHED" },
];

export type ReportRow = {
  param: string; ours: string; comp1: string; comp2: string; favorable: boolean;
  owner: "Actionable" | "Non-Actionable" | "Approved"; action: string; note: string;
};
export const REPORT_ROWS: ReportRow[] = [
  { param: "Security Deposit Level", ours: "$100.00 Required", comp1: "$50.00", comp2: "$50.00", favorable: false, owner: "Actionable", action: "Adjust to $50", note: "Fix in progress — reducing deposit to match $50." },
  { param: "Check-In Arrival Time", ours: "02:00 PM", comp1: "03:00 PM", comp2: "03:00 PM", favorable: true, owner: "Non-Actionable", action: "Maintain Strategy", note: "+1h early check-in market edge." },
  { param: "Check-Out Departure Time", ours: "01:00 PM", comp1: "12:00 PM", comp2: "11:00 AM", favorable: true, owner: "Non-Actionable", action: "Maintain Strategy", note: "+1h to +2h late checkout gain." },
  { param: "Cancellation Policy Strictness", ours: "Free cancel up to 24h", comp1: "Non-refundable", comp2: "Free cancel up to 48h", favorable: true, owner: "Approved", action: "Keep As Is", note: "Higher conversion probability." },
  { param: "Late Check-Out Fee Flexibility", ours: "$35.00 Fee", comp1: "Complimentary", comp2: "$25.00 Fee", favorable: false, owner: "Non-Actionable", action: "Review Policy", note: "Owner: Keep As Is — housekeeping exception approved." },
  { param: "Deluxe Room Size", ours: "34 sqm", comp1: "28 sqm", comp2: "30 sqm", favorable: true, owner: "Approved", action: "Maintain Advantage", note: "+4 to +6 sqm larger than comps." },
];

export type Audit = { id: string; date: string; trigger: "Scheduled Bot" | "Manual Run"; tests: number; passed: number };
export const AUDITS: Audit[] = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(2026, 9, 23 - i * 14);
  const passed = [11, 12, 12, 10, 12, 11, 12, 12][i % 8] ?? 12;
  return {
    id: `AUD-2026-${String(104 - i).padStart(3, "0")}`,
    date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) + (i === 0 ? " · 10:14 AM" : i === 2 ? " · 03:30 PM" : " · 10:00 AM"),
    trigger: i === 2 || i % 5 === 4 ? "Manual Run" : "Scheduled Bot",
    tests: 12,
    passed,
  };
});

export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(page, pages);
  return { rows: items.slice((p - 1) * size, p * size), pages, page: p, from: items.length ? (p - 1) * size + 1 : 0, to: Math.min(p * size, items.length) };
}
