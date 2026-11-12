import { describe, expect, it } from "vitest";
import { appendTranscript } from "@/components/qc/voice-note";
import { healthFromAudit } from "@/components/qc/parity-audit";
import { COMPSET, HOTELS, auditCompetitors, hotelLabel } from "@/lib/qc-data";

describe("portfolio audit outcome", () => {
  it("turns a property's matched checks into a health score and flag count", () => {
    expect(healthFromAudit("US_90210_001")).toEqual({ score: 86, flags: 1 });
    expect(healthFromAudit("US_33139_003")).toEqual({ score: 100, flags: 0 });
    expect(hotelLabel("US_90210_001")).toBe("US_90210_001 - Grand Palm Resort");
  });

  it("logs a portfolio run against that hotel's competitors", () => {
    const names = auditCompetitors({ id: "US_90210_001", comps: 5 });
    expect(names).toEqual(["The Dorchester", "Claridge's", "The Connaught", "Four Seasons Hotel London at Park Lane", "The Ritz London"]);
    expect(names.every((name) => COMPSET.includes(name))).toBe(true);
  });

  it("maps every portfolio hotel onto 3–6 competitors from the master list", () => {
    expect(new Set(COMPSET).size).toBe(COMPSET.length);
    expect(COMPSET.length).toBeGreaterThanOrEqual(65);
    expect(COMPSET.length).toBeLessThanOrEqual(75);
    const used = new Set<string>();
    for (const hotel of HOTELS) {
      const names = auditCompetitors(hotel);
      expect(names.length).toBe(hotel.comps);
      expect(names.length).toBeGreaterThanOrEqual(3);
      expect(names.length).toBeLessThanOrEqual(6);
      expect(new Set(names).size).toBe(names.length);
      names.forEach((name) => used.add(name));
    }
    expect([...used].sort()).toEqual([...COMPSET].sort());
  });
});

describe("voice transcript", () => {
  it("appends spoken text onto an existing description", () => {
    expect(appendTranscript("", "  Check the pool is closed.  ")).toBe("Check the pool is closed.");
    expect(appendTranscript("Check the pool is closed.", "Confirm free Wi-Fi is listed.")).toBe(
      "Check the pool is closed. Confirm free Wi-Fi is listed.",
    );
  });
});
