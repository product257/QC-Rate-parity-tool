import { describe, expect, it } from "vitest";
import { REPORT_ROWS } from "@/lib/qc-data";
import { batchesForProperty, createBatch, rememberBatch, seedBatches } from "@/lib/batches";

describe("comparison batches", () => {
  it("gives each run the next unused batch number and stores every competitor result", () => {
    const at = new Date("2026-10-30T06:30:00.000Z");
    const first = createBatch({
      existing: [],
      propertyId: "US_90210_001",
      competitors: ["The Ritz Mayfair", "The Ritz Mayfair", "Savoy Strand Suite"],
      at,
    });
    const second = createBatch({
      existing: [first],
      propertyId: "US_10001_002",
      competitors: ["Claridge's"],
      at,
    });

    expect(first.number).toBe("B-001");
    expect(second.number).toBe("B-002");
    expect(first.createdAt).toBe("2026-10-30T06:30:00.000Z");
    expect(first.propertyId).toBe("US_90210_001");
    expect(first.trigger).toBe("Manual Run");
    expect(first.competitors).toEqual(["The Ritz Mayfair", "Savoy Strand Suite"]);
    expect(first.results).toHaveLength(REPORT_ROWS.length * 2);
    expect(first.results.every((row) => row.ours && row.theirs && row.parameter)).toBe(true);
    expect(new Set(first.results.map((row) => row.competitor))).toEqual(new Set(first.competitors));
    expect(first.checks.find((row) => row.field === "Check-out Time")?.status).toBe("WARNING");
    const canonical = createBatch({
      existing: [first],
      propertyId: "US_90210_001",
      competitors: ["The Ritz Mayfair"],
      at,
      vary: false,
    });
    expect(canonical.checks.find((row) => row.field === "Check-out Time")?.status).toBe("MATCHED");
    expect(canonical.checks.find((row) => row.field === "Swimming Pool")?.status).toBe("MISMATCH");
  });

  it("keeps the latest batch and 20 previous batches for each property", () => {
    let stored = seedBatches();
    for (let day = 0; day < 22; day += 1) {
      const batch = createBatch({
        existing: stored,
        propertyId: "US_90210_001",
        competitors: ["The Ritz Mayfair"],
        at: new Date(Date.UTC(2026, 0, day + 1, 12, 0, 0)),
      });
      stored = rememberBatch(stored, batch);
    }

    const palm = batchesForProperty(stored, "US_90210_001");
    const other = batchesForProperty(stored, "US_10001_002");
    expect(palm).toHaveLength(21);
    expect(palm[0]?.number).toBe("B-026");
    expect(palm.some((batch) => batch.number === "B-001")).toBe(false);
    expect(new Set(palm.map((batch) => batch.number)).size).toBe(21);
    expect(other.map((batch) => batch.number)).toEqual(["B-003"]);
  });
});
