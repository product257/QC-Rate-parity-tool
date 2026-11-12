export type ClientCheck = {
  id: string; title: string; platform: string; benchmark: string; observed: string;
  status: "Pass" | "Fail" | "Site changed"; action: "Pending Fix" | "Action Closed" | "Action Not Taken" | "Under QA Review" | "Not Required";
  evidence: string; benefit: string;
};

// Illustrative client audit, not live OTA measurements or a revenue forecast.
export const CLIENT_CHECKS: ClientCheck[] = [
  { id: "deposit", title: "Security Deposit vs. Comp-Set", platform: "Expedia", benchmark: "Deposit ≤ $50 · comp-set average $50", observed: "$150.00 (High Risk)", status: "Fail", action: "Pending Fix", evidence: "Screenshot · Have Team Fix", benefit: "+14% booking probability" },
  { id: "reviews", title: "Review Score Parity", platform: "Booking.com", benchmark: "Score ≥ 8.5 out of 10 · comp-set average 9.0", observed: "6.2 / 10 (Critical Deficit)", status: "Fail", action: "Pending Fix", evidence: "Review score comparison", benefit: "Improve OTA ranking" },
  { id: "late-checkout", title: "Late Check-Out Fee Flexibility", platform: "Booking.com", benchmark: "Free late checkout > 1pm", observed: "$35 Fee Charged", status: "Fail", action: "Action Not Taken", evidence: "Owner reason: housekeeping", benefit: "Policy preserved" },
  { id: "response", title: "Host Response Rate Threshold", platform: "Booking.com", benchmark: "Response rate ≥ 90%", observed: "96% (Pass)", status: "Pass", action: "Not Required", evidence: "Response rate on listing", benefit: "Optimal inquiries" },
  { id: "taxes", title: "Taxes & Fees Disclosed", platform: "Expedia", benchmark: "City tax clearly disclosed", observed: "Compliant (Disclosed)", status: "Pass", action: "Not Required", evidence: "Verified on checkout", benefit: "Zero regulatory risk" },
  { id: "breakfast", title: "Breakfast Included Badge Position", platform: "Expedia", benchmark: "Amenity badge on card", observed: "Page layout updated by OTA", status: "Site changed", action: "Under QA Review", evidence: "Show DOM trace", benefit: "Display protection" },
  { id: "review-count", title: "Guest Review Count Present", platform: "Booking.com", benchmark: "Visible review count > 100", observed: "342 Reviews (Verified)", status: "Pass", action: "Not Required", evidence: "Guest review count", benefit: "Guest confidence" },
  { id: "cancellation", title: "Cancellation Policy Display", platform: "Booking.com", benchmark: "Free cancel up to 24h", observed: "Confirmed on checkout", status: "Pass", action: "Not Required", evidence: "Cancellation policy", benefit: "Flexible bookings" },
];

export type FixPlan = "once" | "ongoing";
export type ClientDecision = { help: "team" | "self"; plan: FixPlan; note: string };
export const FIX_ISSUES = ["deposit", "reviews", "late-checkout"] as const;
export type FixIssue = (typeof FIX_ISSUES)[number];
export const CLIENT_IMPACT: Record<FixIssue, { loss: number; gain: number }> = {
  deposit: { loss: 18400, gain: 24500 },
  reviews: { loss: 9200, gain: 12800 },
  "late-checkout": { loss: 6400, gain: 8100 },
};

export function asFixIssue(id: string): FixIssue | null {
  return (FIX_ISSUES as readonly string[]).includes(id) ? id as FixIssue : null;
}

export function applyClientDecision(checks: ClientCheck[], id: string, decision: ClientDecision): ClientCheck[] {
  return checks.map((check) => check.id !== id ? check : {
    ...check,
    action: decision.help === "team" ? "Pending Fix" : "Action Not Taken",
    evidence: decision.help === "team" ? `Team requested · ${decision.plan === "once" ? "One-time fix" : "Ongoing care"}` : "Owner handling independently",
  });
}

export function downloadClientCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}