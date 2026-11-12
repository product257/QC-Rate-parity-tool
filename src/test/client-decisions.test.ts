import { describe, it, expect } from "vitest";
import { CLIENT_CHECKS, CLIENT_IMPACT, FIX_ISSUES, applyClientDecision } from "@/lib/client-data";

describe("Client decisions", () => {
  it("records a team request without claiming the OTA issue is fixed", () => {
    const result = applyClientDecision(CLIENT_CHECKS, "deposit", { help: "team", plan: "ongoing", note: "" });
    expect(result.find((r) => r.id === "deposit")?.action).toBe("Pending Fix");
    expect(result.find((r) => r.id === "deposit")?.status).toBe("Fail");
    expect(result.find((r) => r.id === "reviews")).toEqual(CLIENT_CHECKS.find((r) => r.id === "reviews"));
  });
  it("keeps an owner-managed issue unresolved", () => {
    const result = applyClientDecision(CLIENT_CHECKS, "reviews", { help: "self", plan: "once", note: "" });
    expect(result.find((r) => r.id === "reviews")?.action).toBe("Action Not Taken");
    expect(result.find((r) => r.id === "reviews")?.status).toBe("Fail");
  });
  it("gives every recommendation a revenue loss and a revenue gain", () => {
    for (const issue of FIX_ISSUES) {
      expect(CLIENT_IMPACT[issue].loss).toBeGreaterThan(0);
      expect(CLIENT_IMPACT[issue].gain).toBeGreaterThan(0);
    }
  });
});