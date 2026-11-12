import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ImageIcon, Play, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FilterPill, Label, PageShell, PropertySelectors, Th, Pager, Pill, StatCard } from "@/components/qc/ui";
import { useSelection } from "@/components/qc/selection";
import { BatchRecordBar, useBatches, usePropertyBatch } from "@/components/qc/batches";
import { formatBatchTime, sameCompetitors, type BatchResult } from "@/lib/batches";
import { PLATFORMS, hotelLabel, paginate, type Platform } from "@/lib/qc-data";
import { useHotels } from "@/components/qc/hotels";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Reports — Hotel QC" },
      { name: "description", content: "How one hotel compares with its competitors." },
      { property: "og:title", content: "Reports — Hotel QC" },
      { property: "og:description", content: "How one hotel compares with its competitors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { hotels } = useHotels();
  const { reportProperty, setReportProperty, comps, otas, setOtas } = useSelection();
  const propertyId = reportProperty;
  const { reportFocus } = useBatches();
  const batch = usePropertyBatch(propertyId);
  const pickBatch = batch.pick;
  const selected = batch.selected;
  const rows = selected?.results ?? [];
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<{ competitor: string; parameter: string; note: string }[]>([]);
  const [shotRow, setShotRow] = useState<BatchResult | null>(null);
  const [shots, setShots] = useState<Record<string, { chat?: string; fix?: string }>>({});
  const shotKey = (row: BatchResult) => `${selected?.number ?? ""}:${row.competitor}:${row.parameter}`;
  const onShot = (row: BatchResult, kind: "chat" | "fix", file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setShots((current) => ({ ...current, [shotKey(row)]: { ...current[shotKey(row)], [kind]: url } }));
    toast.success(kind === "chat" ? "Owner chat screenshot added" : "Bug fix screenshot added");
  };
  useEffect(() => { setNoteDrafts([]); }, [selected?.number]);
  useEffect(() => {
    if (!reportFocus || reportFocus.propertyId !== propertyId) return;
    pickBatch(reportFocus.number);
    setPage(1);
  }, [reportFocus, propertyId, pickBatch]);
  const noteDraft = (row: BatchResult) => noteDrafts.find((item) => item.competitor === row.competitor && item.parameter === row.parameter);
  const startNote = (row: BatchResult) => {
    setNoteDrafts((current) => current.some((item) => item.competitor === row.competitor && item.parameter === row.parameter) ? current : [...current, { competitor: row.competitor, parameter: row.parameter, note: row.note }]);
  };
  const saveNotes = () => {
    if (!selected) return;
    for (const item of noteDrafts) batch.updateResult(selected.number, item.competitor, item.parameter, { note: item.note });
    setNoteDrafts([]);
    toast.success(noteDrafts.length === 1 ? "Note saved" : "Notes saved");
  };
  const hotel = hotels.find((item) => item.id === propertyId) ?? hotels[0]!;
  const pg = paginate(rows, page, 6);
  const actionable = rows.filter((row) => !row.favorable).length;
  const compsMatch = selected ? sameCompetitors(comps, selected.competitors) : true;
  const stamped = selected ? `${selected.number} · ${formatBatchTime(selected.createdAt)}` : "No batch";
  const runBot = () => {
    if (!propertyId) { toast.error("Select a property before running a comparison"); return; }
    if (comps.length === 0) { toast.error("Select at least one competitor"); return; }
    if (otas.length === 0) { toast.error("Choose at least one OTA"); return; }
    setRunning(true);
    setTimeout(() => {
      const created = batch.runComparison(propertyId, comps, otas);
      batch.pick(created.number);
      setPage(1);
      setRunning(false);
      toast.success(`Batch ${created.number} saved on ${otas.join(", ")}`);
    }, 700);
  };
  const toggleOta = (name: Platform) => {
    const next = otas.includes(name) ? otas.filter((item) => item !== name) : [...otas, name];
    setOtas(PLATFORMS.filter((item) => next.includes(item)));
  };

  return (
    <PageShell
      title="Report"
      subtitle="One hotel compared with the competitors you pick. Each row is from that run only."
      actions={<Button variant="outline" onClick={() => toast.success("PDF exported")}><Download className="h-4 w-4" /> Export PDF</Button>}
    >
      <PropertySelectors
        propertyId={propertyId}
        onProperty={setReportProperty}
        platforms={
          <>
            <Label>OTAs</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((name) => (
                <FilterPill key={name} active={otas.includes(name)} onClick={() => toggleOta(name)}>{name}</FilterPill>
              ))}
            </div>
          </>
        }
        action={<Button onClick={runBot} disabled={running || otas.length === 0}><Play className="h-4 w-4" /> {running ? "Running…" : "Run Bot ›"}</Button>}
      />
      <BatchRecordBar history={batch.history} selected={selected} onPick={(number) => { batch.pick(number); setPage(1); }} />
      {selected && !compsMatch && <p className="mt-2 text-xs text-warning">Selected competitors are not the ones stored on {selected.number}. These rows stay with that batch. Run a new comparison to record the current comp-set.</p>}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard label={`${hotelLabel(hotel.id)} · ${stamped}`} value={<>{hotel.score} <span className="text-sm font-normal text-muted-foreground">out of 100</span></>} hint={`${selected?.competitors.length ?? 0} competitors in this batch`} />
        <StatCard label="OTAs for this run" value={`${otas.length} OTAs`} hint={otas.length ? otas.join(", ") : "Choose at least one"} />
        <StatCard tone="danger" label="Action required" value={`${actionable} Actionable Items`} />
      </div>

      <div className="mt-5 rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="bg-muted/50"><tr><Th>Property</Th><Th>Competitor</Th><Th>Batch</Th><Th>Timestamp</Th><Th>Checks</Th><Th>Our value</Th><Th>Competitor value</Th><Th>Status</Th><Th>Owner action</Th><Th>Required action</Th><Th>Notes & resolution</Th><Th>Screenshots</Th></tr></thead>
            <tbody>
              {pg.rows.map((row) => (
                <tr key={`${row.competitor}-${row.parameter}`} className={row.favorable ? "border-t bg-success-soft/50" : "border-t bg-warning-soft"}>
                  <td className="px-4 py-3 font-medium">{hotelLabel(hotel.id)}</td>
                  <td className="px-4 py-3">{row.competitor}</td>
                  <td className="px-4 py-3 font-mono text-xs">{selected?.number}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{selected ? formatBatchTime(selected.createdAt) : ""}</td>
                  <td className="px-4 py-3 font-medium">{row.parameter}</td>
                  <td className={row.favorable ? "px-4 py-3 font-medium text-success" : "px-4 py-3 font-medium text-destructive"}>{row.ours}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.theirs}</td>
                  <td className="px-4 py-3">{row.favorable ? <Pill tone="success">▲ Favorable</Pill> : <Pill tone="warning">▼ Unfavorable Gap</Pill>}</td>
                  <td className="px-4 py-3">
                    <Select value={row.owner} onValueChange={(value) => selected && batch.updateResult(selected.number, row.competitor, row.parameter, { owner: value as BatchResult["owner"] })}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Actionable", "Non-Actionable", "Approved"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {row.favorable ? <span className="text-xs font-medium text-success">✓ {row.action}</span>
                      : <Button size="sm" className="bg-warning hover:bg-warning/90" onClick={() => toast.success(`${row.action} — task created`)}>{row.action} ›</Button>}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const draft = noteDraft(row);
                      if (!draft) return <button type="button" onClick={() => startNote(row)} className="max-w-56 text-left text-xs text-muted-foreground hover:text-foreground hover:underline">{row.note}</button>;
                      return <Textarea rows={3} autoFocus value={draft.note} onChange={(event) => setNoteDrafts((current) => current.map((item) => item.competitor === row.competitor && item.parameter === row.parameter ? { ...item, note: event.target.value } : item))} className="min-w-56 text-xs" />;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {(() => { const saved = shots[shotKey(row)] ?? {}; const count = (saved.chat ? 1 : 0) + (saved.fix ? 1 : 0); return (
                      <Button size="sm" variant="outline" onClick={() => setShotRow(row)}><ImageIcon className="size-3.5" /> {count ? `${count}/2 added` : "Add"}</Button>
                    ); })()}
                  </td>
                </tr>
              ))}
              {pg.rows.length === 0 && <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">Run a comparison for this property to create its first batch.</td></tr>}
            </tbody>
          </table>
        </div>
        {noteDrafts.length > 0 && (
          <div className="flex justify-end border-t px-4 py-3">
            <Button onClick={saveNotes}>Save</Button>
          </div>
        )}
        <Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {rows.length} results in {selected?.number ?? "no batch"} · {hotelLabel(hotel.id)}</>} />
      </div>

      <Sheet open={!!shotRow} onOpenChange={(open) => !open && setShotRow(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {shotRow && (
            <>
              <SheetHeader><SheetTitle>{shotRow.parameter}</SheetTitle><SheetDescription>{shotRow.competitor} · screenshots stay on {selected?.number}</SheetDescription></SheetHeader>
              <div className="space-y-5 px-4">
                {([["chat", "Chat with owner"], ["fix", "Bug fixed"]] as const).map(([kind, label]) => {
                  const url = shots[shotKey(shotRow)]?.[kind];
                  return (
                    <div key={kind} className="space-y-2">
                      <div className="text-sm font-medium">{label}</div>
                      {url ? (
                        <div className="relative">
                          <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={label} className="w-full rounded-md border" /></a>
                          <Button size="icon" variant="secondary" className="absolute right-2 top-2 size-7" aria-label={`Remove ${label}`}
                            onClick={() => setShots((current) => ({ ...current, [shotKey(shotRow)]: { ...current[shotKey(shotRow)], [kind]: undefined } }))}><X className="size-4" /></Button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-xs text-muted-foreground hover:bg-muted/50">
                          <Upload className="size-5" /> Upload {label.toLowerCase()} screenshot
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => onShot(shotRow, kind, event.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <SheetFooter><Button onClick={() => setShotRow(null)}>Done</Button></SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
