import { Link } from "@tanstack/react-router";
import { Building2, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell, Label, Pill } from "./ui";
import { useSelection } from "./selection";
import { useHotels } from "./hotels";
import type { ReactNode } from "react";

export function useClientProperty() {
  const { hotels } = useHotels();
  const { ours, setOurs } = useSelection();
  const hotel = hotels.find((h) => h.id === ours[0]) ?? hotels[0];
  return { hotel, setOurs };
}

export function ClientShell({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  return <PageShell title={title} subtitle={subtitle} actions={actions}>
    <nav aria-label="Client pages" className="mb-5 flex flex-wrap gap-2 border-b pb-4">
      {([["/client", "Dashboard"], ["/client-audits", "Past Audits"]] as const).map(([to, label]) => <Button key={to} variant="ghost" size="sm" asChild><Link to={to} activeOptions={{ exact: true }} activeProps={{ className: "bg-info-soft text-info" }}>{label}</Link></Button>)}
    </nav>
    {children}
    <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5 shrink-0" />Sample audit · Decisions remain available during this visit only.</p>
  </PageShell>;
}

export function ClientPropertyBar({ children }: { children?: ReactNode }) {
  const { hotel, setOurs } = useClientProperty();
  const { hotels } = useHotels();
  return <div className="mb-5 flex flex-wrap items-end gap-4 border-y border-info/20 bg-info-soft/60 px-4 py-4">
    <div className="w-full sm:max-w-sm"><Label>Hotel</Label><Select value={hotel?.id ?? ""} onValueChange={(id) => setOurs([id])}><SelectTrigger className="w-full bg-card"><Building2 className="h-4 w-4 shrink-0" /><SelectValue /></SelectTrigger><SelectContent>{hotels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name} ({h.id})</SelectItem>)}</SelectContent></Select></div>
    {children}
  </div>;
}

export function PlatformFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="flex flex-wrap gap-1">{["All", "Booking.com", "Expedia"].map((p) => <Button key={p} size="sm" variant={value === p ? "default" : "outline"} onClick={() => onChange(p)}>{p}</Button>)}</div>;
}

export function ClientStatus({ status }: { status: string }) {
  return <Pill tone={status === "Pass" || status === "Action Closed" ? "success" : status === "Fail" ? "danger" : status === "Not Required" || status === "Action Not Taken" ? "muted" : "warning"}>{status}</Pill>;
}

export function EmailStaffButton() {
  return <Button variant="outline" asChild><a href="mailto:?subject=Hotel%20QC%20report%20ready&body=Please%20review%20the%20latest%20Hotel%20QC%20report%20in%20the%20client%20portal."><Mail className="h-4 w-4" />Email My Staff</a></Button>;
}