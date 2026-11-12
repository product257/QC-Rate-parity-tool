import { describe, expect, it } from "vitest";
import { appendComparisons } from "@/lib/batches";
import { hotelEditFromInput, hotelFromInput } from "@/lib/new-hotel";
import type { Hotel } from "@/lib/qc-data";

const blank = { id: "US_90210_099", name: "New Stay", city: "New York, NY", comps: 3, bookingUrl: "", expediaUrl: "", agodaUrl: "" };

describe("new hotel", () => {
  it("requires a name and at least one valid platform URL", () => {
    expect(hotelFromInput({ ...blank, name: "  " }, [])).toEqual({ error: "Hotel name is required" });
    expect(hotelFromInput(blank, [])).toEqual({ error: "Add at least one platform URL" });
    expect(hotelFromInput({ ...blank, bookingUrl: "booking.com/hotel" }, [])).toEqual({ error: "Booking.com URL needs to start with http:// or https://" });
    const saved = hotelFromInput({ ...blank, bookingUrl: "https://www.booking.com/hotel/example" }, []);
    expect("hotel" in saved && saved.hotel.channels).toEqual(["Booking"]);
    expect("hotel" in saved && saved.hotel.id).toBe("US_90210_099");
  });

  it("rejects a BFI ID that is already in the portfolio", () => {
    expect(hotelFromInput({ ...blank, bookingUrl: "https://www.booking.com/hotel/example" }, [{ id: "US_90210_099" }])).toEqual({ error: "That BFI ID is already in the portfolio" });
  });

  it("updates a hotel without a new listing link and keeps its channels", () => {
    const current: Hotel = { id: "US_90210_001", name: "Grand Palm Resort", type: "Luxury 5-Star", city: "London, Mayfair", rooms: "142 Rooms", comps: 5, channels: ["Booking", "Expedia", "Agoda"], score: 96, flags: 0 };
    const saved = hotelEditFromInput({ ...blank, id: "US_90210_001", name: "Grand Palm", city: "London", comps: 4 }, current);
    expect("hotel" in saved && saved.hotel).toMatchObject({ id: "US_90210_001", name: "Grand Palm", city: "London", comps: 4, channels: ["Booking", "Expedia", "Agoda"] });
    expect(hotelEditFromInput({ ...blank, name: "  " }, current)).toEqual({ error: "Hotel name is required" });
    expect(hotelEditFromInput({ ...blank, name: "Grand Palm", bookingUrl: "not-a-url" }, current)).toEqual({ error: "Booking.com URL needs to start with http:// or https://" });
  });
});

describe("appendComparisons", () => {
  it("stores one batch per selected hotel", () => {
    const { created } = appendComparisons([], [
      { propertyId: "US_90210_001", competitors: ["The Ritz Mayfair"] },
      { propertyId: "US_10001_002", competitors: ["Claridge's"] },
    ], new Date("2026-10-30T06:30:00.000Z"));
    expect(created.map((batch) => batch.number)).toEqual(["B-001", "B-002"]);
    expect(created.map((batch) => batch.propertyId)).toEqual(["US_90210_001", "US_10001_002"]);
  });
});
