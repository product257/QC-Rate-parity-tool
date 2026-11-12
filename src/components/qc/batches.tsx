import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pill, Th } from "@/components/qc/ui";
import { useSelection } from "@/components/qc/selection";
import {
  batchesForProperty,
  batchScore,
  formatBatchTime,
  appendComparisons,
  createBatch,
  rememberBatch,
  seedBatches,
  PREVIOUS_BATCH_LIMIT,
  type BatchResult,
  type ComparisonBatch,
} from "@/lib/batches";
import { hotelLabel } from "@/lib/qc-data";

type ReportFocus = { propertyId: string; number: string };

type ResultPatch = Partial<Pick<BatchResult, "owner" | "note">>;

type AuditHealth = { score: number; flags: number };

type BatchApi = {
  batches: ComparisonBatch[];
  health: Record<string, AuditHealth>;
  runComparison: (propertyId: string, competitors: string[], platforms?: ComparisonBatch["platforms"]) => ComparisonBatch;
  runComparisons: (items: { propertyId: string; competitors: string[] }[]) => ComparisonBatch[];
  recordAudit: (propertyId: string, competitors: string[], outcome: AuditHealth) => ComparisonBatch;
  updateResult: (number: string, competitor: string, parameter: string, patch: ResultPatch) => void;
  reportFocus: ReportFocus | null;
  focusReport: (focus: ReportFocus) => void;
};

const Ctx = createContext<BatchApi | null>(null);

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<ComparisonBatch[]>(seedBatches);
  const [health, setHealth] = useState<Record<string, AuditHealth>>({});
  const [reportFocus, setReportFocus] = useState<ReportFocus | null>(null);
  const runComparison = (propertyId: string, competitors: string[], platforms?: ComparisonBatch["platforms"]) => {
    let created!: ComparisonBatch;
    setBatches((current) => {
      created = createBatch({ existing: current, propertyId, competitors, platforms, at: new Date() });
      return rememberBatch(current, created);
    });
    return created;
  };
  const runComparisons = (items: { propertyId: string; competitors: string[] }[]) => {
    let created: ComparisonBatch[] = [];
    setBatches((current) => {
      const next = appendComparisons(current, items, new Date());
      created = next.created;
      return next.batches;
    });
    return created;
  };
  const recordAudit = (propertyId: string, competitors: string[], outcome: AuditHealth) => {
    setHealth((current) => ({ ...current, [propertyId]: outcome }));
    return runComparison(propertyId, competitors);
  };
  const updateResult = (number: string, competitor: string, parameter: string, patch: ResultPatch) => {
    setBatches((current) => current.map((batch) => batch.number === number ? {
      ...batch,
      results: batch.results.map((row) => row.competitor === competitor && row.parameter === parameter ? { ...row, ...patch } : row),
    } : batch));
  };
  return <Ctx.Provider value={{ batches, health, runComparison, runComparisons, recordAudit, updateResult, reportFocus, focusReport: setReportFocus }}>{children}</Ctx.Provider>;
}

export function useBatches() {
  const value = useContext(Ctx);
  if (!value) throw new Error("BatchProvider missing");
  return value;
}

export function usePropertyBatch(propertyId: string) {
  const { batches, runComparison, updateResult } = useBatches();
  const history = batchesForProperty(batches, propertyId).slice(0, PREVIOUS_BATCH_LIMIT + 1);
  const latest = history[0] ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const selected = history.find((batch) => batch.number === picked) ?? latest;
  return { history, latest, selected, pick: setPicked, runComparison, updateResult };
}

function scoreTone(passed: number, total: number) {
  if (total > 0 && passed === total) return "success" as const;
  if (total > 0 && passed >= total - 1) return "warning" as const;
  return "danger" as const;
}

export function BatchRecordBar({ history, selected, onPick, audit = false }: {
  history: ComparisonBatch[];
  selected: ComparisonBatch | null;
  onPick: (number: string) => void;
  /** Test runner strip: batch, property, and timestamp on one line. */
  audit?: boolean;
}) {
  const nav = useNavigate();
  const { setReportProperty } = useSelection();
  const { focusReport } = useBatches();
  const [open, setOpen] = useState(false);
  const latest = history[0] ?? null;
  if (!selected || !latest) {
    return <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">No comparison batch yet for this property. Select competitors and run a comparison.</p>;
  }
  const viewingPrevious = selected.number !== latest.number;
  const openRun = (batch: ComparisonBatch) => {
    setReportProperty(batch.propertyId);
    focusReport({ propertyId: batch.propertyId, number: batch.number });
    setOpen(false);
    void nav({ to: "/report" });
  };
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-semibold">
          {viewingPrevious ? "Previous batch" : "Latest batch"} {selected.number}
          {audit && <> · {hotelLabel(selected.propertyId)} · {formatBatchTime(selected.createdAt)}</>}
        </p>
        {!audit && <p className="text-xs text-muted-foreground">{hotelLabel(selected.propertyId)} · {formatBatchTime(selected.createdAt)} · {selected.competitors.length} competitors · {selected.platforms.join(", ")}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {viewingPrevious && <Button variant="outline" size="sm" onClick={() => onPick(latest.number)}>Show latest</Button>}
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><History className="h-4 w-4" />Previous batches ({history.length})</Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Previous batches</SheetTitle>
            <SheetDescription>Every saved run for this hotel. Open a row to see that audit on the report.</SheetDescription>
          </SheetHeader>
          <div className="overflow-x-auto px-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Audit ID</Th><Th>Date & time</Th><Th>Run trigger</Th><Th>Total tests checked</Th><Th>Passed result score</Th></tr></thead>
              <tbody>
                {history.map((batch) => {
                  const score = batchScore(batch);
                  const tone = scoreTone(score.passed, score.total);
                  return (
                    <tr key={batch.number} onClick={() => openRun(batch)} className={`cursor-pointer border-t hover:bg-muted/40 ${batch.number === selected.number ? "bg-info-soft" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{batch.number}</td>
                      <td className="px-4 py-3 font-medium">{formatBatchTime(batch.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{batch.trigger}</td>
                      <td className="px-4 py-3 text-muted-foreground">{score.total} Cases</td>
                      <td className="px-4 py-3"><Pill tone={tone}>{score.passed} out of {score.total}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
