import { DEFAULT_COMPETITORS, DISCREPANCIES, PLATFORMS, REPORT_ROWS, type Discrepancy, type Platform, type ReportRow } from "@/lib/qc-data";

/** Latest batch plus this many older runs, per property. */
export const PREVIOUS_BATCH_LIMIT = 20;

export type BatchResult = {
  competitor: string;
  parameter: string;
  ours: string;
  theirs: string;
  favorable: boolean;
  owner: ReportRow["owner"];
  action: string;
  note: string;
};

export type RunTrigger = "Scheduled Bot" | "Manual Run";

/** One comparison run: one property, the competitors selected for that run, and every competitor result from it. */
export type ComparisonBatch = {
  number: string;
  createdAt: string;
  propertyId: string;
  competitors: string[];
  /** OTAs this run checked. Older batches default to all three. */
  platforms: Platform[];
  /** How this run was started. A new Run Bot is a manual run. */
  trigger: RunTrigger;
  results: BatchResult[];
  /** OTA checks captured for this run. The test runner shows only this list. */
  checks: Discrepancy[];
};

export function batchScore(batch: Pick<ComparisonBatch, "results">) {
  const total = batch.results.length;
  const passed = batch.results.filter((row) => row.favorable).length;
  return { total, passed };
}

export function formatBatchTime(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function nextBatchNumber(existing: Pick<ComparisonBatch, "number">[]) {
  const max = existing.reduce((highest, batch) => {
    const sequence = Number(batch.number.slice(2));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `B-${String(max + 1).padStart(3, "0")}`;
}

/** Property-scoped OTA checks for one run. `varyIndex` 0 keeps the current audit; later runs mark one matched check as a prior finding. */
export function snapshotChecks(propertyId: string, varyIndex: number): Discrepancy[] {
  const checks = DISCREPANCIES
    .filter((row) => row.property === "all" || row.property === propertyId)
    .map((row) => ({ ...row }));
  const matched = checks.filter((row) => row.status === "MATCHED" && row.property === propertyId);
  if (varyIndex <= 0 || matched.length === 0) return checks;
  const target = matched[(varyIndex - 1) % matched.length];
  if (target) {
    target.status = "WARNING";
    target.live = `${target.hotel} (prior run)`;
  }
  return checks;
}

export function buildBatchResults(competitors: string[], vary: boolean): BatchResult[] {
  return competitors.flatMap((competitor, index) =>
    REPORT_ROWS.map((row) => ({
      competitor,
      parameter: row.param,
      ours: row.ours,
      theirs: index % 2 === 0 ? row.comp1 : row.comp2,
      favorable: vary && index % 2 === 1 ? !row.favorable : row.favorable,
      owner: row.owner,
      action: row.action,
      note: row.note,
    })),
  );
}

export function createBatch(input: {
  existing: Pick<ComparisonBatch, "number">[];
  propertyId: string;
  competitors: string[];
  platforms?: Platform[];
  trigger?: RunTrigger;
  at: Date;
  vary?: boolean;
  checks?: Discrepancy[];
}): ComparisonBatch {
  const competitors = [...new Set(input.competitors)];
  const platforms = input.platforms?.length ? [...new Set(input.platforms)] : [...PLATFORMS];
  const number = nextBatchNumber(input.existing);
  const varyIndex = input.vary === false ? 0 : Number(number.slice(2));
  return {
    number,
    createdAt: input.at.toISOString(),
    propertyId: input.propertyId,
    competitors,
    platforms,
    trigger: input.trigger ?? "Manual Run",
    results: buildBatchResults(competitors, input.vary ?? true),
    checks: input.checks ?? snapshotChecks(input.propertyId, varyIndex),
  };
}

/** One update for every selected hotel, so each run gets the next batch number. */
export function appendComparisons(
  existing: ComparisonBatch[],
  items: { propertyId: string; competitors: string[] }[],
  at: Date,
) {
  const created: ComparisonBatch[] = [];
  const batches = items.reduce((current, item) => {
    const batch = createBatch({ existing: current, propertyId: item.propertyId, competitors: item.competitors, at });
    created.push(batch);
    return rememberBatch(current, batch);
  }, existing);
  return { batches, created };
}

export function rememberBatch(existing: ComparisonBatch[], batch: ComparisonBatch) {
  const ordered = [batch, ...existing.filter((item) => item.number !== batch.number)];
  const kept: ComparisonBatch[] = [];
  const counts = new Map<string, number>();
  for (const item of ordered) {
    const count = counts.get(item.propertyId) ?? 0;
    if (count >= PREVIOUS_BATCH_LIMIT + 1) continue;
    counts.set(item.propertyId, count + 1);
    kept.push(item);
  }
  return kept;
}

export function batchesForProperty(batches: ComparisonBatch[], propertyId: string) {
  return batches.filter((batch) => batch.propertyId === propertyId);
}

export function sameCompetitors(left: string[], right: string[]) {
  return left.length === right.length && left.every((name) => right.includes(name));
}

const SEED: { propertyId: string; competitors: string[]; at: string; vary: boolean }[] = [
  { propertyId: "US_90210_001", competitors: ["The Ritz London", "Claridge's"], at: "2026-09-25T15:30:00.000Z", vary: true },
  { propertyId: "US_90210_001", competitors: ["The Ritz London", "The Dorchester"], at: "2026-10-09T10:00:00.000Z", vary: true },
  { propertyId: "US_10001_002", competitors: ["The Savoy", "Corinthia London"], at: "2026-10-16T09:00:00.000Z", vary: false },
  { propertyId: "US_90210_001", competitors: [...DEFAULT_COMPETITORS], at: "2026-10-23T10:14:00.000Z", vary: false },
];

export function seedBatches() {
  return SEED.reduce<ComparisonBatch[]>((existing, spec) => rememberBatch(existing, createBatch({
    existing,
    propertyId: spec.propertyId,
    competitors: spec.competitors,
    at: new Date(spec.at),
    vary: spec.vary,
    trigger: "Scheduled Bot",
  })), []);
}
