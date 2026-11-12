import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, Check, CircleAlert, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClientShell, useClientProperty } from "@/components/qc/client-ui";
import { useClientPortal } from "@/components/qc/client-state";
import { asFixIssue, CLIENT_IMPACT, downloadClientCsv, type FixIssue, type FixPlan } from "@/lib/client-data";
import { Pill } from "@/components/qc/ui";

export const Route = createFileRoute("/client-fix")({
  validateSearch: (search: Record<string, unknown>) => ({ issue: asFixIssue(typeof search.issue === "string" ? search.issue : "") ?? "deposit" }),
  head: () => ({ meta: [
    { title: "Simple Fix Plan — Hotel QC" }, { name: "description", content: "Review estimated revenue impact and choose a hotel quality improvement plan." }, { property: "og:title", content: "Simple Fix Plan — Hotel QC" }, { property: "og:description", content: "Estimated revenue impact and hotel quality improvement choices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ClientFixPage,
});

function ClientFixPage() {
  const { issue } = Route.useSearch();
  const { hotel } = useClientProperty();
  return hotel ? <FixForm key={`${hotel.id}-${issue}`} property={hotel.id} hotelName={hotel.name} issue={issue} /> : null;
}

type CloudPoint = { lead: string; detail: string };

const ISSUE_COPY: Record<FixIssue, { title: string; problem: string; risk: string; proposal: string; loss: CloudPoint[]; gain: CloudPoint[] }> = {
  deposit: {
    title: "Your Security Deposit is Too High",
    problem: "You are asking guests for a $150 deposit. Nearby hotels only ask for $50 or nothing at all.",
    risk: "A high upfront deposit may discourage guests before payment.",
    proposal: "Reduce the deposit from $150 to the nearby-hotel benchmark of $50.",
    loss: [
      { lead: "Guests leave at the last step:", detail: "12 out of 100 people leave without paying." },
      { lead: "Other hotels get your guests:", detail: "Nearby hotels are cheaper to book upfront." },
    ],
    gain: [
      { lead: "More bookings every day:", detail: "Dropping deposit to $50 makes booking easy." },
      { lead: "Full rooms on weekends:", detail: "You get more guests without lowering room price." },
    ],
  },
  reviews: {
    title: "Your Review Score is Below Nearby Hotels",
    problem: "Your score is 6.2 out of 10, while the selected competitors average 9.0.",
    risk: "Guests may choose nearby hotels with stronger reviews.",
    proposal: "Review guest feedback, resolve repeated complaints and improve the guest experience.",
    loss: [
      { lead: "Guests pick a higher score:", detail: "A 6.2 score sits below the 9.0 nearby average." },
      { lead: "Fewer bookings get finished:", detail: "Travelers compare reviews before they pay." },
    ],
    gain: [
      { lead: "A stronger listing:", detail: "A higher score moves the hotel up in search." },
      { lead: "More confident guests:", detail: "Better reviews support weekend demand." },
    ],
  },
  "late-checkout": {
    title: "Your Late Check-Out Fee Is Higher Than Nearby Hotels",
    problem: "You charge $35 for late check-out. Nearby hotels offer it free or for less.",
    risk: "Guests comparing checkout flexibility may book a competitor.",
    proposal: "Match the nearby-hotel late check-out offer, or explain the housekeeping limit in the listing.",
    loss: [
      { lead: "Guests choose a free checkout:", detail: "A $35 fee shows up before they book." },
      { lead: "Shorter stays:", detail: "Travelers skip the extra night when checkout is rigid." },
    ],
    gain: [
      { lead: "More extended stays:", detail: "A flexible checkout keeps weekend guests." },
      { lead: "Clearer listing terms:", detail: "Guests know the offer before they arrive." },
    ],
  },
};

function FixForm({ property, hotelName, issue }: { property: string; hotelName: string; issue: FixIssue }) {
  const { decisionsFor, saveDecision } = useClientPortal();
  const existing = decisionsFor(property)[issue];
  const [help, setHelp] = useState<"team" | "self">(existing?.help ?? "team");
  const [plan, setPlan] = useState<FixPlan>(existing?.plan ?? "ongoing");
  const [confirmed, setConfirmed] = useState(false);
  const impact = CLIENT_IMPACT[issue];
  const copy = ISSUE_COPY[issue];
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const title = copy.title;
  const proposal = copy.proposal;
  return <ClientShell title="Hotel Quality & Pricing Helper — Simple Fix Plan" subtitle="Revenue impact & your next decision" actions={<Button variant="outline" onClick={() => downloadClientCsv(`${property}-${issue}-fix-plan.csv`, [["Property", "Issue", "Proposed action", "Estimated monthly loss", "Estimated monthly gain", "Owner choice", "Plan"], [hotelName, title, proposal, impact.loss, impact.gain, help, help === "team" ? plan : "Owner managed"]])}><Download />Save Report</Button>}>
    <div className="flex flex-wrap items-center gap-3 border-y bg-info-soft/50 px-4 py-3"><Button variant="ghost" size="sm" asChild><Link to="/client"><ArrowLeft />Back to My Hotel</Link></Button><span className="text-sm font-medium">{hotelName} ({property})</span><Pill tone="danger">Problem Found Here</Pill></div>
    <section className="mt-5 border-l-2 border-destructive bg-danger-soft p-4"><h2 className="flex items-center gap-2 font-semibold text-destructive"><CircleAlert className="h-5 w-5 shrink-0" />{title}</h2><p className="mt-2 text-sm">{copy.problem}</p><p className="mt-1 text-sm text-destructive">{copy.risk}</p></section>
    <div className="grid gap-8 py-10 md:grid-cols-2">
      <MoneyCloud tone="loss" label="Money you are losing" amount={`-${money(impact.loss)}`} points={copy.loss} />
      <MoneyCloud tone="gain" label="Money you can make" amount={`+${money(impact.gain)}`} points={copy.gain} />
    </div>
    <p className="mb-6 text-xs text-muted-foreground">Illustrative estimates from the supplied wireframe, not measured losses or guaranteed revenue.</p>
    {confirmed ? <section className="border-y border-success/30 bg-success-soft py-6 px-4"><h2 className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 />Your decision has been recorded</h2><p className="mt-2 text-sm">{help === "team" ? `${plan === "once" ? "One-time fix" : "Ongoing revenue care"} requested for ${hotelName}. No OTA changes have been made.` : "You chose to manage this change yourself."}</p>{help === "self" && <p className="mt-3 text-sm">{proposal} Review each OTA listing and check the updated values afterwards.</p>}<Button className="mt-5" asChild><Link to="/client">View Dashboard</Link></Button></section> : <form onSubmit={(e) => { e.preventDefault(); saveDecision(property, issue, { help, plan, note: existing?.note ?? "" }); setConfirmed(true); }}>
      <section className="border-y border-info/30 bg-info-soft/40 px-4 py-5"><h2 className="font-semibold text-info">Can we fix it for you, or do you want to do it on your own?</h2><RadioGroup aria-label="Who will handle the fix" value={help} onValueChange={(v) => setHelp(v === "self" ? "self" : "team")} className="mt-4 grid gap-3 md:grid-cols-2">{([{ value: "team", title: "Yes, please fix it for us", detail: "Request help updating your website listings." }, { value: "self", title: "No, I will do it myself", detail: "Show me the suggested changes to make." }] as const).map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${help === option.value ? "border-info bg-card" : "bg-card/60"}`}><RadioGroupItem value={option.value} className="mt-0.5 shrink-0" /><span><span className="block text-sm font-medium">{option.title}</span><span className="mt-1 block text-xs text-muted-foreground">{option.detail}</span></span></label>)}</RadioGroup>
      {help === "team" ? <div className="mt-6"><h3 className="text-sm font-semibold">Which plan do you want?</h3><RadioGroup aria-label="Fix plan" value={plan} onValueChange={(v) => setPlan(v === "once" ? "once" : "ongoing")} className="mt-3 grid gap-3 md:grid-cols-2">{([{ value: "once", title: "One-Time Fix", detail: proposal, hint: "One change, then you manage future reviews." }, { value: "ongoing", title: "Ongoing Revenue Care", detail: "Request continued competitor checks and quality reviews.", hint: "Keep monitoring changes over time." }] as const).map((option) => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${plan === option.value ? "border-info bg-card" : "bg-card/60"}`}><RadioGroupItem value={option.value} className="mt-0.5 shrink-0" /><span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-2 block text-xs text-muted-foreground">{option.detail}</span><span className="mt-2 block text-xs text-info">{option.hint}</span></span></label>)}</RadioGroup></div> : <p className="mt-5 text-sm">Suggested action: {proposal}</p>}</section>
      <div className="mt-5 flex flex-wrap gap-3"><Button type="submit"><Check />Confirm Strategy</Button><Button variant="outline" asChild><Link to="/client">Cancel</Link></Button></div>
    </form>}
  </ClientShell>;
}

const CLOUD = "M210 214C120 226 62 168 112 122C92 64 176 36 236 78C274 32 368 26 418 74C468 30 556 52 568 112C624 122 628 196 572 226C592 278 520 322 438 304C404 348 286 354 228 308C168 342 96 304 136 250C82 262 108 228 210 214Z";

function MoneyCloud({ tone, label, amount, points }: { tone: "loss" | "gain"; label: string; amount: string; points: CloudPoint[] }) {
  const ink = tone === "loss" ? "text-destructive" : "text-success";
  const paint = tone === "loss"
    ? "fill-[oklch(0.96_0.035_18)] stroke-[oklch(0.75_0.11_18)]"
    : "fill-[oklch(0.96_0.04_150)] stroke-[oklch(0.74_0.1_150)]";
  return (
    <section aria-label={label} className={`mx-auto w-full max-w-xl ${ink}`}>
      <svg viewBox="0 0 660 400" className="h-auto w-full" role="img">
        <path className={paint} strokeWidth="2.5" strokeLinejoin="round" d={CLOUD} />
        <circle className={paint} strokeWidth="2.5" cx="108" cy="318" r="18" />
        <circle className={paint} strokeWidth="2.5" cx="72" cy="352" r="11" />
        <circle className={paint} strokeWidth="2" cx="46" cy="378" r="6" />
        <foreignObject x="188" y="92" width="300" height="178">
          <div xmlns="http://www.w3.org/1999/xhtml" className="flex h-full flex-col items-center justify-center px-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide"><Banknote className="h-3 w-3 shrink-0" />{label}</p>
            <p className="mt-1 text-2xl font-semibold leading-none tracking-tight">{amount}<span className="text-sm font-medium"> / month</span></p>
            <ul className="mt-2 w-full space-y-1.5 text-left text-xs">
              {points.map((point) => (
                <li key={point.lead} className="flex gap-1.5">
                  <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current" />
                  <span><span className="font-semibold">{point.lead}</span><span className="mt-0.5 block leading-snug">{point.detail}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </foreignObject>
      </svg>
    </section>
  );
}