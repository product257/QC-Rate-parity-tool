import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, FilterPill, Th, Pager } from "@/components/qc/ui";
import { TestCaseSheet } from "@/components/qc/test-case-sheet";
import { useTestCases } from "@/components/qc/test-cases";
import { PLATFORMS, paginate, shortName, type TestCase } from "@/lib/qc-data";

export const Route = createFileRoute("/test-cases")({
  head: () => ({
    meta: [
      { title: "Test cases — Hotel QC" },
      { name: "description", content: "Every test case, for every hotel." },
      { property: "og:title", content: "Test cases — Hotel QC" },
      { property: "og:description", content: "Every test case, for every hotel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestCaseLibraryPage,
});

const EMPTY: TestCase = { id: "", properties: [], platform: "Booking.com", title: "", description: "", active: true };

function TestCaseLibraryPage() {
  const { cases, save: store } = useTestCases();
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("All");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TestCase | null>(null);
  const listed = useMemo(() => cases.filter((test) =>
    (platform === "All" || test.platform === platform) &&
    (q === "" || `${test.id} ${test.title} ${test.properties === "all" ? "all properties" : test.properties.map(shortName).join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  ), [cases, platform, q]);
  const pg = paginate(listed, page, 8);

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title is required"); return; }
    store(editing);
    toast.success(editing.id ? `${editing.id} updated` : "Test case created");
    setEditing(null);
  };

  return (
    <PageShell
      title="Test cases"
      subtitle="Every check in the catalog, not just the hotels selected on Run checks."
      actions={<Button onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4" /> New test case</Button>}
    >
      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search test cases or property" className="pl-9" />
          </div>
          {["All", ...PLATFORMS].map((name) => (
            <FilterPill key={name} active={platform === name} onClick={() => { setPlatform(name); setPage(1); }}>{name}</FilterPill>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><Th>ID</Th><Th>Platform</Th><Th>Title & check description</Th><Th className="text-right">Actions</Th></tr></thead>
            <tbody>
              {pg.rows.map((test) => (
                <tr key={test.id} className="border-t transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs">{test.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{test.platform}</td>
                  <td className="px-4 py-3 font-medium">{test.title}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setEditing({ ...test })}>Edit</Button></td>
                </tr>
              ))}
              {pg.rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No test cases match.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pages={pg.pages} onPage={setPage} info={<>Showing {pg.from}–{pg.to} of {listed.length} test cases</>} />
      </div>
      <TestCaseSheet editing={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={save} />
    </PageShell>
  );
}
