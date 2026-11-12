import { describe, expect, it } from "vitest";
import { DISCREPANCIES, TEST_CASES, checksForActiveCases } from "@/lib/qc-data";

describe("checks for active test cases", () => {
  it("returns one result for every active test case on that hotel", () => {
    const fields = checksForActiveCases(DISCREPANCIES, TEST_CASES, "US_90210_001").map((row) => row.field);

    expect(fields).toEqual([
      "Response rate meets threshold (SLA >= 90%)",
      "Swimming Pool",
      "City Tax",
      "Cancellation policy display integrity (Free 24h cancellation)",
      "Free Wi-Fi",
      "Check-out Time",
    ]);
  });

  it("drops a check when its test case is switched off", () => {
    const cases = TEST_CASES.map((test) => (test.id === "TC-028" ? { ...test, active: false } : test));
    const fields = checksForActiveCases(DISCREPANCIES, cases, "US_90210_001").map((row) => row.field);

    expect(fields).not.toContain("Swimming Pool");
    expect(fields).toContain("Check-out Time");
  });

  it("shows a selected test case even when no stored check matches it", () => {
    const cases = TEST_CASES.map((test) => ({ ...test, active: ["TC-031", "TC-067", "TC-091", "TC-108"].includes(test.id) }));
    const rows = checksForActiveCases(DISCREPANCIES, cases, "US_90210_001");

    expect(rows.map((row) => row.field)).toEqual([
      "City Tax",
      "Cancellation policy display integrity (Free 24h cancellation)",
      "Breakfast included badge position check",
      "Free Wi-Fi",
    ]);
    expect(rows.find((row) => row.sub === "TC-091")?.channel).toBe("Expedia");
    expect(rows.find((row) => row.sub === "TC-067")?.status).toBe("MATCHED");
    expect(rows.every((row) => row.property === "US_90210_001")).toBe(true);
  });

  it("repeats a shared active case under each hotel with that hotel's name", () => {
    const cases = TEST_CASES.map((test) => ({ ...test, active: test.id === "TC-108" || test.id === "TC-052" }));
    const palm = checksForActiveCases(DISCREPANCIES, cases, "US_90210_001");
    const london = checksForActiveCases(DISCREPANCIES, cases, "US_10001_002");

    expect(palm.map((row) => row.field)).toEqual(["Free Wi-Fi"]);
    expect(palm[0]?.property).toBe("US_90210_001");
    expect(london.map((row) => row.field)).toEqual(["Security Deposit", "Free Wi-Fi"]);
    expect(london.every((row) => row.property === "US_10001_002")).toBe(true);
  });
});
