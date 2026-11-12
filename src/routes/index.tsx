import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell, StatCard } from "@/components/qc/ui";
import { useBatches } from "@/components/qc/batches";
import { useSelection } from "@/components/qc/selection";
import { batchesForProperty, formatBatchTime } from "@/lib/batches";
import { COMPSET, PLATFORMS, TEST_CASES, auditCompetitors } from "@/lib/qc-data";
import { useHotels } from "@/components/qc/hotels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hotel QC" },
      { name: "description", content: "Hotels, competitors, links, and the latest reports." },
      { property: "og:title", content: "Dashboard — Hotel QC" },
      { property: "og:description", content: "Hotels, competitors, links, and the latest reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function testsFor(hotelId: string) {
  return TEST_CASES.filter((test) => test.properties === "all" || test.properties.includes(hotelId));
}

function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DashboardPage() {
  const nav = useNavigate();
  const { hotels } = useHotels();
  const { batches } = useBatches();
  const { setReportProperty } = useSelection();
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? "");
  const hotel = hotels.find((item) => item.id === hotelId) ?? hotels[0];

  const overview = useMemo(() => {
    const pairs = hotels.flatMap((item) => auditCompetitors(item));
    return {
      hotels: hotels.length,
      competitors: new Set(pairs).size,
      links: pairs.length,
      tests: TEST_CASES.length,
      activeTests: TEST_CASES.filter((test) => test.active).length,
      fine: hotels.filter((item) => item.flags === 0).length,
    };
  }, [hotels]);

  const competitors = hotel ? auditCompetitors(hotel) : [];
  const tests = hotel ? testsFor(hotel.id) : [];
  const reports = hotel ? batchesForProperty(batches, hotel.id) : [];
  const latest = reports[0] ?? null;
  const checkCounts = latest
    ? {
        matched: latest.checks.filter((row) => row.status === "MATCHED").length,
        warning: latest.checks.filter((row) => row.status === "WARNING").length,
        mismatch: latest.checks.filter((row) => row.status === "MISMATCH").length,
      }
    : null;

  const testsBySite = PLATFORMS.map((platform) => ({
    label: platform.replace(".com", ""),
    value: TEST_CASES.filter((test) => test.platform === platform).length,
  }));
  const hotelsByCompetitor = COMPSET.map((name) => ({
    label: name,
    value: hotels.filter((item) => auditCompetitors(item).includes(name)).length,
  })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  const openReport = () => {
    if (!hotel) return;
    setReportProperty(hotel.id);
    nav({ to: "/report" });
  };

  if (!hotel) return null;

  return (
    <PageShell
      title="Dashboard"
      subtitle="Hotels, competitors, and how they are linked. Pick a hotel to see its latest reports."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hotels" value={overview.hotels} hint="In this portfolio" />
        <StatCard label="Competitors" value={overview.competitors} hint="Other hotels used for comparison" />
        <StatCard label="Links" value={overview.links} hint="Each hotel paired with its competitors" />
        <StatCard label="Tests" value={overview.tests} hint={`${overview.activeTests} turned on`} />
      </div>

      <section className="mt-6 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full sm:max-w-sm">
            <p className="mb-1.5 text-sm font-medium">Hotel</p>
            <Select value={hotel.id} onValueChange={setHotelId}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {hotels.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openReport}>Open latest report</Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Score" value={<>{hotel.score}<span className="text-sm font-normal text-muted-foreground"> / 100</span></>} hint={hotel.flags ? `${hotel.flags} open ${hotel.flags === 1 ? "flag" : "flags"}` : "No open flags"} tone={hotel.flags ? "danger" : "success"} />
          <StatCard label="Competitors linked" value={competitors.length} hint={hotel.city} />
          <StatCard label="Tests on this hotel" value={tests.length} hint={`${tests.filter((test) => test.active).length} turned on`} />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold">Competitors for {hotel.name}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {competitors.map((name) => <li key={name} className="rounded-md border px-3 py-2">{name}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Tests for this hotel</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {tests.slice(0, 6).map((test) => (
                <li key={test.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                  <span>{test.title}</span>
                  <span className="shrink-0 text-muted-foreground">{test.platform.replace(".com", "")}</span>
                </li>
              ))}
            </ul>
            {tests.length > 6 && <p className="mt-2 text-xs text-muted-foreground">{tests.length - 6} more</p>}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">Latest reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved runs for {hotel.name}. The list follows the hotel you pick above.</p>
        {reports.length === 0 ? (
          <p className="mt-3 rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">No report has been run for this hotel yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">Compared with</th>
                  <th className="px-4 py-3 text-left font-medium">Checks</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map((report) => {
                  const matched = report.checks.filter((row) => row.status === "MATCHED").length;
                  const issues = report.checks.length - matched;
                  return (
                    <tr key={report.number} className="border-t">
                      <td className="px-4 py-3 whitespace-nowrap">{formatBatchTime(report.createdAt)}</td>
                      <td className="px-4 py-3">{report.competitors.join(", ")}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{matched} matched{issues ? ` · ${issues} to review` : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {checkCounts && (
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Latest check results</h3>
            <div className="mt-3">
              <BarList rows={[
                { label: "Matched", value: checkCounts.matched },
                { label: "Warning", value: checkCounts.warning },
                { label: "Mismatch", value: checkCounts.mismatch },
              ]} />
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Across the portfolio</h2>
        <div className="mt-3 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Hotel health</p>
          <p className="mt-1 text-sm text-muted-foreground">{overview.fine} look fine · {overview.hotels - overview.fine} need a look</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="bg-success" style={{ width: `${(overview.fine / Math.max(overview.hotels, 1)) * 100}%` }} />
            <div className="bg-warning" style={{ width: `${((overview.hotels - overview.fine) / Math.max(overview.hotels, 1)) * 100}%` }} />
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Tests by booking site</h3>
            <div className="mt-4"><BarList rows={testsBySite} /></div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Hotels linked to each competitor</h3>
            <div className="mt-4 max-h-80 overflow-y-auto pr-1"><BarList rows={hotelsByCompetitor} /></div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
