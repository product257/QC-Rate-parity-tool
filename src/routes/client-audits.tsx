import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ClientShell, ClientPropertyBar, EmailStaffButton, useClientProperty } from "@/components/qc/client-ui";
import { StatCard, Th, Pager, Pill, Label } from "@/components/qc/ui";
import { AUDITS, paginate, type Audit } from "@/lib/qc-data";

export const Route = createFileRoute("/client-audits")({ head: () => ({ meta: [
  { title: "Client Past Audits — Hotel QC" }, { name: "description", content: "Review historical hotel quality audits, results and run times." }, { property: "og:title", content: "Client Past Audits — Hotel QC" }, { property: "og:description", content: "Historical hotel quality audits, results and run times." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: ClientAuditsPage });

function ClientAuditsPage() {
  const { hotel } = useClientProperty();
  const [frequency, setFrequency] = useState("Monthly");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Audit | null>(null);
  if (!hotel) return null;
  const filtered = AUDITS.filter((a) => filter === "All" || a.trigger === filter);
  const pg = paginate(filtered, page, 8);
  const tone = (a: Audit) => a.passed === a.tests ? "success" : a.passed < 11 ? "danger" : "warning";
  return <ClientShell title="Past Audits" subtitle="Historical audit logs & compliance timeline" actions={<><Button variant="outline" asChild><Link to="/client"><ArrowLeft />Back to Dashboard</Link></Button><EmailStaffButton /></>}>
    <ClientPropertyBar><Pill tone="info">{AUDITS.length} Past Audits</Pill><div className="w-40 sm:ml-auto"><Label>Audit frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger className="bg-card"><SelectValue /></SelectTrigger><SelectContent>{["Daily", "Weekly", "Monthly"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div></ClientPropertyBar>
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Average health score" value="96 / 100" tone="success" /><StatCard label="Channels monitored" value="3 OTAs" hint="Booking, Expedia, Agoda" /><StatCard label="Last audit completed" value="Oct 23, 2026" hint="10:14 AM" /></div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-3"><h2 className="font-semibold">Past Audit History</h2><div className="flex flex-wrap gap-2">{["All", "Scheduled Bot", "Manual Run"].map((f) => <Button key={f} size="sm" variant={f === filter ? "default" : "outline"} onClick={() => { setFilter(f); setPage(1); }}>{f}{f !== "All" && ` (${AUDITS.filter((a) => a.trigger === f).length})`}</Button>)}</div></div>
    <div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/50"><tr><Th>Audit ID</Th><Th>Date & time</Th><Th>Run trigger</Th><Th>Total tests checked</Th><Th>Passed result score</Th></tr></thead><tbody>{pg.rows.map((a) => <tr key={a.id} className={`border-t ${tone(a) === "danger" ? "bg-danger-soft" : tone(a) === "warning" ? "bg-warning-soft" : ""}`}><td className="px-4 py-3"><Button variant="link" size="sm" className="px-0 font-mono text-xs" onClick={() => setSelected(a)}>{a.id}</Button></td><td className="px-4 py-3 font-medium">{a.date}</td><td className="px-4 py-3 text-muted-foreground">{a.trigger}</td><td className="px-4 py-3">{a.tests} Cases</td><td className="px-4 py-3"><Pill tone={tone(a)}>{a.passed} out of {a.tests}</Pill></td></tr>)}</tbody></table></div><Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {filtered.length} historical audits · {hotel.name}</>} /></div>
    <div className="mt-4 flex gap-3 border-l-2 border-info bg-info-soft p-4"><History className="h-5 w-5 shrink-0 text-info" /><div><p className="text-sm font-semibold text-info">Audit Archive & Compliance Records</p><p className="mt-1 text-xs text-muted-foreground">Preferred frequency: {frequency}. Scheduling is not connected in this sample portal.</p></div></div>
    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-md">{selected && <><SheetHeader><SheetTitle>{selected.id}</SheetTitle><SheetDescription>{hotel.name} · {selected.date} · {selected.trigger}</SheetDescription></SheetHeader><div className="space-y-3 px-4"><Pill tone={tone(selected)}>{selected.passed} of {selected.tests} checks passed</Pill>{Array.from({ length: selected.tests }, (_, i) => <div key={i} className="flex items-center justify-between border-b py-3 text-sm"><span>Audit check {i + 1}</span><Pill tone={i < selected.passed ? "success" : "danger"}>{i < selected.passed ? "Passed" : "Failed"}</Pill></div>)}</div></>}</SheetContent></Sheet>
  </ClientShell>;
}