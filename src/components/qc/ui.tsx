import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, ClipboardCheck, FileBarChart, LayoutDashboard, ListChecks, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "./multi-select";
import { useSelection } from "./selection";
import { useHotels } from "./hotels";
import { COMPSET, hotelLabel } from "@/lib/qc-data";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/test-cases", label: "Test cases", icon: ListChecks },
  { to: "/tests", label: "Run checks", icon: ClipboardCheck },
  { to: "/portfolio", label: "Hotels", icon: Building2 },
  { to: "/report", label: "Reports", icon: FileBarChart },
  { to: "/client", label: "Client portal", icon: Users },
] as const;

function SideNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:px-3 md:pb-4">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" || item.to === "/client" }}
            className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-muted font-medium text-foreground" }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageShell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 z-30 self-start border-b bg-card md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <Link to="/" className="flex items-center gap-2.5 px-4 py-4 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">QC</span>
          Hotel QC
        </Link>
        <SideNav />
      </aside>
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

export function useHotelOptions() {
  const { hotels } = useHotels();
  return hotels.map((hotel) => ({ value: hotel.id, label: hotelLabel(hotel.id) }));
}
export const compOptions = COMPSET.map((c) => ({ value: c, label: c }));

export function PropertySelectors({ showComps = true, compact = false, multiple = false, action, platforms, propertyId: propertyIdProp, propertyIds, onProperty, onProperties }: {
  showComps?: boolean; compact?: boolean; multiple?: boolean; action?: ReactNode; platforms?: ReactNode;
  propertyId?: string; propertyIds?: string[];
  onProperty?: (id: string) => void; onProperties?: (ids: string[]) => void;
}) {
  const options = useHotelOptions();
  const { ours, setOurs, comps, setComps } = useSelection();
  const selected = multiple ? (propertyIds ?? []) : [(propertyIdProp ?? ours[0] ?? "")].filter(Boolean);
  const chooseProperty = (ids: string[]) => {
    if (multiple) { onProperties?.(ids); return; }
    const next = ids[0] ?? "";
    if (onProperty) onProperty(next);
    else setOurs(next ? [next] : []);
  };
  const propertyField = (
    <div className={compact ? cn("min-w-80 flex-1", !multiple && "max-w-xl") : "min-w-72"}>
      <Label>Our property</Label>
      <MultiSelect single={!multiple} named={multiple} options={options} value={selected} onChange={chooseProperty} placeholder={multiple ? "Choose hotels" : "Choose a hotel"} searchPlaceholder="Search BFI id or hotel name" />
    </div>
  );
  if (compact) {
    return (
      <div className="flex flex-wrap items-end gap-3">
        {propertyField}
        {action}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4 rounded-lg border border-info/20 bg-info-soft/60 p-4", showComps && "md:grid-cols-2")}>
      {propertyField}
      {showComps && (
        <div>
          <Label>Competitors</Label>
          <MultiSelect named options={compOptions} value={comps} onChange={setComps} placeholder="Choose competitors" />
        </div>
      )}
      {platforms && <div className={showComps ? "md:col-span-2" : undefined}>{platforms}</div>}
      {action && <div className={showComps ? "flex items-end md:col-span-2" : "flex items-end"}>{action}</div>}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium">{children}</p>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>{children}</th>;
}

export function Pager({ page, pages, onPage, info }: { page: number; pages: number; onPage: (p: number) => void; info: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
      <span>{info}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <Button key={p} size="sm" variant={p === page ? "default" : "outline"} className="w-8 px-0" onClick={() => onPage(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function FilterPill({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: ReactNode; tone?: "danger" | undefined }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : tone === "danger" ? "border-destructive/30 bg-danger-soft text-destructive hover:border-destructive" : "bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "success" | "danger" }) {
  return (
    <div className={cn("rounded-lg border p-4", tone === "success" && "border-success/30 bg-success-soft", tone === "danger" && "border-destructive/30 bg-danger-soft", tone === "default" && "bg-card")}>
      <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-muted-foreground")}>{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", tone === "success" && "text-success", tone === "danger" && "text-destructive")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "muted"; children: ReactNode }) {
  const map = {
    success: "border-success/40 bg-success-soft text-success",
    warning: "border-warning/40 bg-warning-soft text-warning",
    danger: "border-destructive/40 bg-danger-soft text-destructive",
    info: "border-info/30 bg-info-soft text-info",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold", map[tone])}>{children}</span>;
}
