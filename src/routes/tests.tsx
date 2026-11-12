import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell, PropertySelectors, FilterPill, Th, Pager, Pill, Label } from "@/components/qc/ui";
import { SCHEDULE_FREQUENCIES, usePropertySchedule } from "@/components/qc/schedules";
import { useSelection } from "@/components/qc/selection";
import { BatchRecordBar, useBatches, usePropertyBatch } from "@/components/qc/batches";
import { ParityAudit, auditScore } from "@/components/qc/parity-audit";
import { TestCaseSheet } from "@/components/qc/test-case-sheet";
import { useTestCases } from "@/components/qc/test-cases";
import { batchesForProperty, formatBatchTime } from "@/lib/batches";
import { PLATFORMS, auditCompetitors, checksForActiveCases, shortName, paginate, type TestCase } from "@/lib/qc-data";
import { useHotels } from "@/components/qc/hotels";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Run checks — Hotel QC" },
      { name: "description", content: "Run the bot for the hotels you pick." },
      { property: "og:title", content: "Run checks — Hotel QC" },
      { property: "og:description", content: "Run the bot for the hotels you pick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RunChecksPage,
});

const EMPTY: TestCase = { id: "", properties: [], platform: "Booking.com", title: "", description: "", active: true };

function RunChecksPage() {
  const { hotels } = useHotels();
  const { cases, setActive, save: store } = useTestCases();
  const { runnerProperties, setRunnerProperties } = useSelection();
  const propertyIds = runnerProperties;
  const propertyId = propertyIds[0] ?? "";
  const { schedule, update: updateSchedule } = usePropertySchedule(propertyId);
  const { batches, runComparisons } = useBatches();
  const batch = usePropertyBatch(propertyId);
  const selected = batch.selected;
  const auditRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TestCase | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [score, setScore] = useState(() => auditScore(propertyId, selected?.checks));
  const groups = useMemo(() => propertyIds.map((id) => {
    const latest = batchesForProperty(batches, id)[0];
    const hotel = hotels.find((item) => item.id === id);
    return {
      id,
      label: hotel?.name ?? shortName(id),
      ...(latest ? { batchLabel: `${latest.number} · ${formatBatchTime(latest.createdAt)}` } : {}),
      rows: checksForActiveCases(latest?.checks ?? [], cases, id),
    };
  }), [propertyIds, batches, hotels, cases]);
  const onScore = useCallback((next: { passed: number; total: number }) => {
    setScore((current) => current.passed === next.passed && current.total === next.total ? current : next);
  }, []);

  useEffect(() => {
    if (propertyIds.length > 1) {
      const rows = groups.flatMap((group) => group.rows);
      setScore({ passed: rows.filter((row) => row.status === "MATCHED").length, total: rows.length });
      return;
    }
    setScore(auditScore(propertyId, checksForActiveCases(selected?.checks ?? [], cases, propertyId)));
  }, [propertyId, propertyIds.length, selected, groups, cases]);
  useEffect(() => {
    if (!notice) return;
    toast.success(notice);
    setNotice(null);
  }, [notice]);

  const listed = useMemo(() => {
    const visible = (test: TestCase) =>
      (platform === "All" || test.platform === platform) &&
      (q === "" || `${test.id} ${test.title} ${test.properties === "all" ? "" : test.properties.map(shortName).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
    const ids = propertyIds.length > 0 ? propertyIds : [""];
    return ids.flatMap((id) => cases
      .filter((test) => visible(test) && (id === "" || test.properties === "all" || test.properties.includes(id)))
      .map((test) => ({ test, propertyId: id })));
  }, [cases, platform, q, propertyIds]);
  const pg = paginate(listed, page, 8);
  const setListedActive = (active: boolean) => {
    setActive([...new Set(listed.map((row) => row.test.id))], active);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title is required"); return; }
    store(editing);
    toast.success(editing.id ? `${editing.id} updated` : "Test case created");
    setEditing(null);
  };

  const showBatch = (number: string) => {
    batch.pick(number);
    requestAnimationFrame(() => auditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const runBot = () => {
    if (propertyIds.length === 0) { toast.error("Select at least one hotel"); return; }
    setRunning(true);
    setTimeout(() => {
      const created = runComparisons(propertyIds.map((id) => {
        const hotel = hotels.find((item) => item.id === id);
        return { propertyId: id, competitors: hotel ? auditCompetitors(hotel) : [] };
      }));
      const first = created[0];
      if (propertyIds.length === 1 && first) batch.pick(first.number);
      setRunning(false);
      setNotice(propertyIds.length === 1 && first ? `Batch ${first.number} saved — ${formatBatchTime(first.createdAt)}` : `Audit saved for ${created.length} hotels`);
      requestAnimationFrame(() => auditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }, 700);
  };

  return (
    <PageShell
      title="Run checks"
      subtitle="Checks the bot runs for the hotels you pick."
      actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4" /> New test case</Button>}
    >
      <PropertySelectors
        showComps={false}
        compact
        multiple
        propertyIds={propertyIds}
        onProperties={setRunnerProperties}
      />

      {propertyIds.length === 1 && (
        <div className="mt-4 flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
          <div className="min-w-48">
            <Label>Schedule</Label>
            <Select value={schedule.frequency} onValueChange={(frequency) => {
              updateSchedule({ frequency: frequency as typeof schedule.frequency });
              toast.success(frequency === "Off" ? `${shortName(propertyId)} is not scheduled` : `${shortName(propertyId)} runs ${frequency.toLowerCase()} at ${schedule.time}`);
            }}>
              <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{SCHEDULE_FREQUENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {schedule.frequency !== "Off" && (
            <div>
              <Label>Time</Label>
              <Input type="time" value={schedule.time} onChange={(event) => {
                const time = event.target.value || schedule.time;
                updateSchedule({ time });
                toast.success(`${shortName(propertyId)} runs ${schedule.frequency.toLowerCase()} at ${time}`);
              }} className="w-36 bg-card" />
            </div>
          )}
          <p className="pb-2 text-sm text-muted-foreground">
            {schedule.frequency === "Off" ? `${shortName(propertyId)} has no schedule. Run Bot still works by hand.` : `${shortName(propertyId)} is scheduled ${schedule.frequency.toLowerCase()} at ${schedule.time}.`}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search test cases or property" className="pl-9" />
          </div>
          {["All", ...PLATFORMS].map((p) => (
            <FilterPill key={p} active={platform === p} onClick={() => { setPlatform(p); setPage(1); }}>{p}</FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium">Turn every test case on or off in one click</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setListedActive(true)} disabled={listed.length === 0}>Activate all</Button>
            <Button size="sm" variant="outline" onClick={() => setListedActive(false)} disabled={listed.length === 0}>Deactivate all</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Applied property</Th><Th>Platform</Th><Th>Title & check description</Th><Th>Active</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {pg.rows.map((row, index) => {
                const previous = pg.rows[index - 1];
                const showHotel = row.propertyId !== "" && previous?.propertyId !== row.propertyId;
                return (
                  <Fragment key={`${row.propertyId}-${row.test.id}`}>
                    {showHotel && <tr className="border-t bg-muted/70"><td colSpan={6} className="px-4 py-2 text-sm font-semibold">{shortName(row.propertyId)}</td></tr>}
                    <tr className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{row.test.id}</td>
                      <td className="px-4 py-3"><span className="rounded border border-info/30 bg-info-soft px-2 py-0.5 text-xs text-info">{row.propertyId ? shortName(row.propertyId) : "All Selected Properties"}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{row.test.platform}</td>
                      <td className={row.test.active ? "px-4 py-3 font-medium" : "px-4 py-3 text-muted-foreground"}>{row.test.title}</td>
                      <td className="px-4 py-3">
                        <Switch checked={row.test.active} onCheckedChange={(v) => setActive([row.test.id], v)} className="data-[state=checked]:bg-success" />
                      </td>
                      <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setEditing({ ...row.test })}>Edit</Button></td>
                    </tr>
                  </Fragment>
                );
              })}
              {pg.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No test cases match.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {listed.length} test cases</>} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={runBot} disabled={running}><Play className="h-4 w-4" /> {running ? "Running…" : "Run Bot ›"}</Button>
        <Pill tone="success">{score.passed} / {score.total} Passed</Pill>
      </div>
      {propertyIds.length <= 1 && <BatchRecordBar history={batch.history} selected={selected} audit onPick={showBatch} />}

      {propertyIds.length === 1 && selected && (
        <div ref={auditRef}>
          <ParityAudit
            key={`${selected.number}:${cases.filter((item) => item.active).map((item) => item.id).join(",")}`}
            propertyId={propertyId}
            initialRows={checksForActiveCases(selected.checks, cases, propertyId)}
            batchLabel={`${selected.number} · ${formatBatchTime(selected.createdAt)}`}
            onScore={onScore}
          />
        </div>
      )}
      {propertyIds.length > 1 && (
        <div ref={auditRef}>
          <ParityAudit
            key={`${groups.map((group) => `${group.id}:${group.batchLabel ?? "none"}`).join("|")}:${cases.filter((item) => item.active).map((item) => item.id).join(",")}`}
            propertyId={propertyId}
            groups={groups}
            onScore={onScore}
          />
        </div>
      )}

      <TestCaseSheet editing={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={save} />
    </PageShell>
  );
}
