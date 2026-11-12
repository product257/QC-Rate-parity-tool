import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ArrowRight, History, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, Th, Pager, Pill } from "@/components/qc/ui";
import { ClientShell, ClientPropertyBar, ClientStatus, EmailStaffButton, useClientProperty } from "@/components/qc/client-ui";
import { useClientPortal } from "@/components/qc/client-state";
import { asFixIssue, downloadClientCsv } from "@/lib/client-data";
import { paginate } from "@/lib/qc-data";

export const Route = createFileRoute("/client")({
  head: () => ({ meta: [
    { title: "Client Dashboard — Hotel QC" }, { name: "description", content: "Owner-facing health, revenue-manager action log and resolution tracking for your hotel." },
    { property: "og:title", content: "Client Dashboard — Hotel QC" }, { property: "og:description", content: "Your hotel quality checks and competitive improvement plans." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ClientPage,
});

const FILTERS = ["All", "Booking.com", "Expedia", "Actionables Only"] as const;

function ClientPage() {
  const { hotel } = useClientProperty();
  const { checksFor } = useClientPortal();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [page, setPage] = useState(1);
  if (!hotel) return null;

  const checks = checksFor(hotel.id);
  const failures = checks.filter((r) => r.status === "Fail");
  const actionables = failures.length;
  const pending = checks.filter((r) => r.action === "Pending Fix").length;
  const resolved = checks.filter((r) => r.action === "Action Closed").length;
  const declined = checks.filter((r) => r.action === "Action Not Taken").length;

  const visible = checks.filter((r) =>
    filter === "All" ? true : filter === "Actionables Only" ? r.status === "Fail" : r.platform === filter,
  );
  const pg = paginate(visible, page, 6);

  return <ClientShell
    title="Client dashboard"
    subtitle="Health, open issues, and what has already been fixed."
    actions={<Button variant="outline" onClick={() => downloadClientCsv(`${hotel.id}-checks.csv`, [["Property", "Test case", "Platform", "Expected", "Observed", "Status"], ...checks.map((r) => [hotel.name, r.title, r.platform, r.benchmark, r.observed, r.status])])}><Download />Export CSV</Button>}
  >
    <ClientPropertyBar>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Button variant="outline" asChild><Link to="/client-audits"><History className="h-4 w-4" />Past Audit</Link></Button>
        <EmailStaffButton />
      </div>
    </ClientPropertyBar>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Overall QC health" value={<>98 <span className="text-sm font-normal text-muted-foreground">out of 100</span></>} hint="High compliance score" tone="success" />
      <StatCard label="Active QC cases" value={<>12 <span className="text-sm font-normal text-muted-foreground">automated checks</span></>} hint="Across Booking, Expedia & Agoda" />
      <StatCard label="Actionable status" value={`${actionables} Actionables`} hint={`${pending} pending fix · ${resolved} resolved`} tone={actionables ? "danger" : "success"} />
      <StatCard label="Actions progress" value={<span className="text-lg">{resolved} Taken · {pending} Pending · {declined} Declined</span>} hint="Owner choices logged with audit trail" />
    </div>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-3">
      <div>
        <h2 className="font-semibold">Latest Audit Report & Work in Progress</h2>
        <p className="text-xs text-muted-foreground">Select any issue to inspect problem details, projected revenue benefit, and uploaded evidence.</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
            className={f === "Actionables Only" && filter !== f ? "border-destructive/30 bg-danger-soft text-destructive hover:border-destructive" : ""}
            onClick={() => { setFilter(f); setPage(1); }}>
            {f === "Actionables Only" ? `Actionables Only (${actionables})` : f}
          </Button>
        ))}
      </div>
    </div>

    <div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-muted/50"><tr><Th>Audit test case</Th><Th>Platform</Th><Th>Benchmark / expected</Th><Th>Live observed value</Th><Th>Status</Th><Th>Action status</Th><Th>Evidence & owner choice</Th><Th>Revenue benefit</Th></tr></thead><tbody>
      {pg.rows.map((r) => <tr key={r.id} className={`border-t ${r.status === "Fail" ? "bg-danger-soft/60" : r.status === "Site changed" ? "bg-warning-soft/50" : ""}`}>
        <td className="px-4 py-4 font-medium">{r.title}</td>
        <td className="px-4 py-4 text-muted-foreground">{r.platform}</td>
        <td className="px-4 py-4 text-xs text-muted-foreground">{r.benchmark}</td>
        <td className={`px-4 py-4 font-medium ${r.status === "Fail" ? "text-destructive" : r.status === "Pass" ? "text-success" : "text-warning"}`}>{r.observed}</td>
        <td className="px-4 py-3"><ClientStatus status={r.status} /></td>
        <td className="px-4 py-3"><ClientStatus status={r.action} /></td>
        <td className="px-4 py-4 text-xs text-muted-foreground">{r.evidence}</td>
        <td className="px-4 py-4">
          <div className="flex flex-col items-start gap-2">
            <span className="text-xs font-semibold text-success">{r.benefit}</span>
            {r.status === "Fail" && asFixIssue(r.id) && <Button size="sm" variant="outline" className="border-warning/40 bg-warning-soft text-warning" asChild><Link to="/client-fix" search={{ issue: asFixIssue(r.id)! }}>Recommendation<ArrowRight /></Link></Button>}
          </div>
        </td>
      </tr>)}
    </tbody></table></div><Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {visible.length} visible checks · last run Oct 23, 2026 at 10:14 AM</>} /></div>

    <div className="mt-4 flex gap-3 border-l-2 border-info bg-info-soft px-4 py-3 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-info" /><div><p className="font-medium text-info">Executive Summary</p><p className="mt-1 text-xs text-muted-foreground">{actionables} competitive parameters require attention. Breakfast badge placement is under review.</p></div></div>
  </ClientShell>;
}
