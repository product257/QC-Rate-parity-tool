import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Play, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell, FilterPill, Th, Pager, Pill, StatCard } from "@/components/qc/ui";
import { AddHotelSheet } from "@/components/qc/add-hotel";
import { useHotels } from "@/components/qc/hotels";
import { useSelection } from "@/components/qc/selection";
import { useBatches } from "@/components/qc/batches";
import { healthFromAudit } from "@/components/qc/parity-audit";
import { auditCompetitors, paginate, type Hotel } from "@/lib/qc-data";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Hotels — Hotel QC" },
      { name: "description", content: "Every hotel in the portfolio, with competitors and health." },
      { property: "og:title", content: "Hotels — Hotel QC" },
      { property: "og:description", content: "Every hotel in the portfolio, with competitors and health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function PortfolioPage() {
  const nav = useNavigate();
  const { hotels: catalog } = useHotels();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { ours, setOurs, setRunnerProperties, setReportProperty } = useSelection();
  const { recordAudit, health: audited } = useBatches();
  const busy = useRef(false);
  const hotels = useMemo(
    () => catalog.map((hotel) => audited[hotel.id] ? { ...hotel, ...audited[hotel.id] } : hotel),
    [audited, catalog],
  );
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    toast.success(notice);
    setNotice(null);
  }, [notice]);

  const filters = useMemo(() => [
    { k: "all", l: `All (${hotels.length})`, f: () => true, danger: false },
    { k: "live", l: `Live & Active (${hotels.filter((hotel) => !hotel.flags).length})`, f: (hotel: Hotel) => !hotel.flags, danger: false },
    { k: "review", l: `Needs Review (${hotels.filter((hotel) => hotel.flags).length})`, f: (hotel: Hotel) => hotel.flags > 0, danger: true },
    { k: "london", l: `London (${hotels.filter((hotel) => hotel.city.startsWith("London")).length})`, f: (hotel: Hotel) => hotel.city.startsWith("London"), danger: false },
    { k: "regional", l: `Regional UK (${hotels.filter((hotel) => !hotel.city.startsWith("London")).length})`, f: (hotel: Hotel) => !hotel.city.startsWith("London"), danger: false },
  ], [hotels]);

  const filtered = useMemo(() => {
    const match = filters.find((item) => item.k === filter)!.f;
    return hotels.filter((hotel) => match(hotel) && `${hotel.name} ${hotel.id} ${hotel.city}`.toLowerCase().includes(q.toLowerCase()));
  }, [hotels, q, filter, filters]);
  const pg = paginate(filtered, page, 8);
  const flagged = hotels.filter((hotel) => hotel.flags).length;
  const openReport = (id: string) => {
    setReportProperty(id);
    void nav({ to: "/report" });
  };

  const runHotels = async (targets: Hotel[]) => {
    if (busy.current || targets.length === 0) return;
    busy.current = true;
    const batch = targets.length > 1;
    if (batch) setProgress({ current: 1, total: targets.length });
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const hotel = targets[index]!;
        setRunningId(hotel.id);
        if (batch) setProgress({ current: index + 1, total: targets.length });
        await wait(targets.length === 1 ? 700 : 320);
        recordAudit(hotel.id, auditCompetitors(hotel), healthFromAudit(hotel.id));
      }
      const finished = targets.length === 1 ? targets[0] : null;
      setNotice(finished ? `QC audit completed for ${finished.name}` : `QC audit completed for ${targets.length} hotels`);
    } finally {
      busy.current = false;
      setRunningId(null);
      setProgress(null);
    }
  };

  const runSelected = () => {
    const targets = ours.length ? hotels.filter((hotel) => ours.includes(hotel.id)) : hotels;
    if (!ours.length) setOurs(hotels.map((hotel) => hotel.id));
    void runHotels(targets);
  };

  return (
    <PageShell
      title="Hotels"
      subtitle="Every hotel in the portfolio, who it is compared with, and whether it needs a look."
      actions={
        <>
          <Button variant="outline" onClick={() => toast.success("Syncing all channels…")}><RefreshCw className="h-4 w-4" /> Sync channels</Button>
          <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add hotel</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Hotels" value={hotels.length} hint="In this portfolio" />
        <StatCard tone="success" label="Fine" value={hotels.length - flagged} hint="No open flags" />
        <StatCard tone="danger" label="Needs a look" value={flagged} hint="Rate or policy issues" />
      </div>

      <div className="mt-5 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by hotel name, ID, or city…" className="pl-9" />
          </div>
          {filters.map((item) => <FilterPill key={item.k} tone={item.danger ? "danger" : undefined} active={filter === item.k} onClick={() => { setFilter(item.k); setPage(1); }}>{item.l}</FilterPill>)}
          <Button variant="outline" size="sm" className="border-info/40 text-info" disabled={!!runningId} onClick={runSelected}>
            {progress ? <Loader2 className="animate-spin" /> : null}
            {progress ? `Running ${progress.current} / ${progress.total}…` : ours.length > 0 && ours.length < hotels.length ? `Run Audit (${ours.length})` : `Select All ${hotels.length} for Audit`}
          </Button>
          {ours.length > 0 && !runningId && <Button variant="outline" size="sm" onClick={() => setOurs([])}>Clear Audit Selection</Button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><Th /><Th>Property ID & name</Th><Th>City / Region</Th><Th>Comp-set size</Th><Th>Active channels</Th><Th>Health score</Th><Th>QC status</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {pg.rows.map((hotel) => (
                <tr key={hotel.id} className={hotel.flags ? "border-t bg-warning-soft" : "border-t hover:bg-muted/40"}>
                  <td className="pl-4"><Checkbox checked={ours.includes(hotel.id)} disabled={!!runningId} onCheckedChange={(value) => setOurs(value ? [...ours, hotel.id] : ours.filter((id) => id !== hotel.id))} aria-label={`Select ${hotel.name}`} /></td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left hover:underline" onClick={() => openReport(hotel.id)}>
                      <p className="font-medium">{hotel.name}</p>
                      <p className="text-xs text-info">{hotel.id} · {hotel.type}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{hotel.city}</td>
                  <td className="px-4 py-3"><Pill tone="info">{hotel.comps} Competitors</Pill></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{hotel.channels.join(", ")}</td>
                  <td className="px-4 py-3 text-xs"><span className={hotel.flags ? "font-semibold text-warning" : "font-semibold text-success"}>{hotel.score}</span> out of 100</td>
                  <td className="px-4 py-3">{hotel.flags ? <Pill tone="warning">▼ {hotel.flags} Flag{hotel.flags > 1 ? "s" : ""} to Fix</Pill> : <Pill tone="success">✓ Live & Monitored</Pill>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(hotel.id)}>Edit</Button>
                      <Button size="sm" disabled={!!runningId} onClick={() => void runHotels([hotel])}>
                        {runningId === hotel.id ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
                        {runningId === hotel.id ? "Running..." : "Run Bot ›"}
                      </Button>
                      {hotel.flags > 0 && <Button size="sm" className="bg-warning hover:bg-warning/90" onClick={() => { setRunnerProperties([hotel.id]); nav({ to: "/tests" }); }}>Resolve</Button>}
                      <Button size="sm" variant="outline" onClick={() => openReport(hotel.id)}>View Report</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing <b>{pg.from}–{pg.to}</b> of {filtered.length} total properties across UK portfolio</>} />
      </div>

      <AddHotelSheet open={adding} onOpenChange={setAdding} />
      <AddHotelSheet open={!!editingId} hotel={catalog.find((item) => item.id === editingId) ?? null} onOpenChange={(next) => { if (!next) setEditingId(null); }} />
    </PageShell>
  );
}
