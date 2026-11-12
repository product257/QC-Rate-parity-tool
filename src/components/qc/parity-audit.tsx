import { Fragment, useEffect, useMemo, useState } from "react";
import { ExternalLink, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterPill, Pager, Pill, Th } from "@/components/qc/ui";
import { DISCREPANCIES, hotelLabel, paginate, shortName, type Discrepancy } from "@/lib/qc-data";

const STEPS = ["Log in to Agoda YCS portal", "Navigate to Property Facilities", "Mark Swimming Pool as Closed", "Click Save and Publish updates"];

export function auditScore(propertyId: string, rows: Discrepancy[] = DISCREPANCIES) {
  const scoped = rows.filter((row) => !propertyId || row.property === "all" || row.property === propertyId);
  return { passed: scoped.filter((row) => row.status === "MATCHED").length, total: scoped.length };
}

/** Health score out of 100, and the number of checks that still need a fix. */
export function healthFromAudit(propertyId: string) {
  const { passed, total } = auditScore(propertyId);
  return { score: total ? Math.round((passed / total) * 100) : 0, flags: total - passed };
}

export type AuditGroup = { id: string; label: string; batchLabel?: string; rows: Discrepancy[] };
type AuditRow = Discrepancy & { groupId: string };

function flattenGroups(groups: AuditGroup[]): AuditRow[] {
  return groups.flatMap((group) => group.rows.map((row) => ({ ...row, groupId: group.id })));
}

export function ParityAudit({ propertyId, initialRows, batchLabel, groups, onScore }: {
  propertyId: string;
  initialRows?: Discrepancy[];
  batchLabel?: string;
  /** Latest checks for each selected hotel. Enables the hotel filter and grouped rows. */
  groups?: AuditGroup[];
  onScore?: (score: { passed: number; total: number }) => void;
}) {
  const multi = (groups?.length ?? 0) > 1;
  const [rows, setRows] = useState<AuditRow[]>(() => groups ? flattenGroups(groups) : (initialRows ?? DISCREPANCIES).map((row) => ({ ...row, groupId: propertyId })));
  const [channel, setChannel] = useState("All");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AuditRow | null>(null);
  const [steps, setSteps] = useState<boolean[]>(STEPS.map(() => false));
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const scoped = useMemo(() => {
    if (groups) return rows;
    return rows.filter((row) => !propertyId || row.property === "all" || row.property === propertyId);
  }, [rows, propertyId, groups]);
  const filtered = useMemo(() => scoped.filter((row) =>
    channel === "All" ? true : channel === "Mismatches" ? row.status !== "MATCHED" : row.channel === channel), [scoped, channel]);
  const pg = paginate(filtered, page, 6);
  const scored = groups ? rows : scoped;
  const passed = scored.filter((row) => row.status === "MATCHED").length;
  const issues = scoped.filter((row) => row.status !== "MATCHED").length;

  useEffect(() => { onScore?.({ passed, total: scored.length }); }, [onScore, passed, scored.length]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setRows((current) => current.map((row) => (target && row.field === target.field && row.groupId === target.groupId ? { ...row, live: row.hotel, status: "MATCHED" } : row)));
      toast.success(`${target?.field} re-verified — now matched`);
      setCountdown(null);
      setTarget(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, target]);

  const openFix = (row: AuditRow) => { setTarget(row); setSteps(STEPS.map(() => false)); setConfirmed(false); setCountdown(null); };
  const groupLabel = (id: string) => groups?.find((group) => group.id === id)?.label ?? shortName(id);

  return (
    <div className="mt-5 rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="font-semibold">OTA Parity Audit and Discrepancies</h2>
        <p className="text-xs text-muted-foreground">{multi ? "Latest run for each selected hotel." : `${propertyId ? hotelLabel(propertyId) : "Selected property"} · ${batchLabel ?? "live OTA channel check"}`}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["All", "Agoda", "Booking.com", "Expedia"].map((name) => (
            <FilterPill key={name} active={channel === name} onClick={() => { setChannel(name); setPage(1); }}>{name === "All" ? "All Channels" : name}</FilterPill>
          ))}
          <FilterPill tone="danger" active={channel === "Mismatches"} onClick={() => { setChannel("Mismatches"); setPage(1); }}>● Mismatches Only ({issues})</FilterPill>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><Th>Field name</Th><Th>Properties</Th><Th>Hotel value</Th><Th>Channel</Th><Th>Live value</Th><Th>Status</Th><Th>Action</Th></tr></thead>
          <tbody>
            {pg.rows.map((row, index) => {
              const previous = pg.rows[index - 1];
              const showGroup = multi && (!previous || previous.groupId !== row.groupId);
              return (
              <Fragment key={`${row.groupId}-${row.field}-${row.channel}`}>
              {showGroup && <tr className="border-t bg-muted/70"><td colSpan={7} className="px-4 py-2 text-sm font-semibold">{groupLabel(row.groupId)}{groups?.find((group) => group.id === row.groupId)?.batchLabel ? ` · ${groups.find((group) => group.id === row.groupId)?.batchLabel}` : ""}</td></tr>}
              <tr className={row.status === "MISMATCH" ? "border-t bg-danger-soft" : "border-t hover:bg-muted/40"}>
                <td className="px-4 py-3"><p className="font-medium">{row.field}</p><p className="text-xs text-muted-foreground">{row.sub}</p></td>
                <td className="px-4 py-3"><span className="rounded border border-info/30 bg-info-soft px-2 py-0.5 text-xs text-info">{shortName(row.property === "all" ? (row.groupId || propertyId) : row.property) || "All Selected Properties"}</span></td>
                <td className="px-4 py-3">{row.status === "MISMATCH" ? <Pill tone="danger">{row.hotel}</Pill> : row.hotel}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.channel}</td>
                <td className="px-4 py-3">{row.status === "MISMATCH" ? <Pill tone="success">{row.live}</Pill> : <span className={row.status === "WARNING" ? "font-medium text-warning" : ""}>{row.live}</span>}</td>
                <td className="px-4 py-3"><Pill tone={row.status === "MATCHED" ? "success" : row.status === "WARNING" ? "warning" : "danger"}>{row.status}</Pill></td>
                <td className="px-4 py-3">
                  {row.status === "MISMATCH" ? <Button size="sm" variant="destructive" onClick={() => openFix(row)}>Fix Now</Button>
                    : row.status === "WARNING" ? <Button size="sm" variant="outline" onClick={() => openFix(row)}>Review</Button>
                    : <span className="text-xs text-muted-foreground">Synced</span>}
                </td>
              </tr>
              </Fragment>
              );
            })}
            {pg.rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{groups?.every((group) => group.rows.length === 0) ? "No audit yet. Run the bot to check these hotels." : "No channel discrepancies for this view."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-6 border-t bg-muted/30 px-4 py-2 text-xs font-medium">
        <span>Audited for {multi ? `${groups?.length ?? 0} hotels` : propertyId ? shortName(propertyId) : "the selected property"}: {scoped.length} items</span>
        <span className="text-success">{scoped.length - issues} Matched</span>
        <span className="text-destructive">{issues} Require Correction</span>
      </div>
      {multi && groups?.some((group) => group.rows.length === 0) && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">No audit yet for {groups.filter((group) => group.rows.length === 0).map((group) => group.label).join(", ")}.</p>
      )}
      <Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {filtered.length} items</>} />

      <Sheet open={!!target} onOpenChange={(open) => { if (!open) { setTarget(null); setCountdown(null); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {target && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" /> Resolve Discrepancy <Pill tone="muted">{target.channel}</Pill></SheetTitle>
                <SheetDescription className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Target: {target.property === "all" ? hotelLabel(propertyId) : hotelLabel(target.property)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="rounded-lg border border-destructive/30 bg-danger-soft p-3 text-sm">
                  <p className="font-semibold text-destructive">Mismatch Detected</p>
                  <p className="mt-1 text-destructive">Live {target.channel} listing shows {target.field} <b>{target.live}</b>.</p>
                  <p className="text-destructive">Hotel record is <b>{target.hotel}</b>.</p>
                </div>
                <Button variant="default" className="w-full bg-info hover:bg-info/90" onClick={() => window.open("https://ycs.agoda.com", "_blank", "noopener")}>
                  Open {target.channel} Extranet <ExternalLink className="h-4 w-4" />
                </Button>
                <div>
                  <p className="mb-2 text-sm font-semibold">Resolution Checklist</p>
                  <div className="space-y-2">
                    {STEPS.map((step, index) => (
                      <label key={step} className="flex cursor-pointer items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-info font-mono text-[10px] text-primary-foreground">{index + 1}</span>
                        <span className={steps[index] ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{step}</span>
                        <Checkbox checked={!!steps[index]} onCheckedChange={(value) => setSteps((current) => current.map((item, itemIndex) => (itemIndex === index ? !!value : item)))} />
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-md border border-info/30 bg-info-soft p-3 text-sm">
                  <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(!!value)} className="mt-0.5" />
                  <span><b>I have updated settings on {target.channel}</b><br /><span className="text-xs text-muted-foreground">Required before re-verification</span></span>
                </label>
                <Button className="w-full bg-success hover:bg-success/90" disabled={!confirmed || countdown !== null} onClick={() => setCountdown(60)}>
                  {countdown !== null ? `Re-verifying in ${countdown}s…` : "Mark Resolved and Re-verify"}
                </Button>
                {countdown !== null && <Button variant="ghost" size="sm" className="w-full" onClick={() => setCountdown(0)}>Skip wait — re-check now</Button>}
                <p className="text-center text-xs text-muted-foreground">Auto-recheck will execute in 60 seconds</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
