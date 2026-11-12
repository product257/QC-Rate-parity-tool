import { createContext, useContext, useState, type ReactNode } from "react";
import { HOTELS, PLATFORMS, auditCompetitors, lookupHotel, type Platform } from "@/lib/qc-data";

const defaultProperty = HOTELS[0]?.id ?? "";

type Sel = {
  ours: string[]; setOurs: (v: string[]) => void;
  comps: string[]; setComps: (v: string[]) => void;
  /** Test cases (`/tests`) hotels. Independent of the report. */
  runnerProperties: string[]; setRunnerProperties: (ids: string[]) => void;
  /** Executive Report (`/report`) property. Independent of the test runner. */
  reportProperty: string; setReportProperty: (id: string) => void;
  /** OTAs the next report run will check for the open property. */
  otas: Platform[]; setOtas: (value: Platform[]) => void;
};
const Ctx = createContext<Sel | null>(null);

function competitorsFor(propertyId: string) {
  const hotel = lookupHotel(propertyId);
  return hotel ? auditCompetitors(hotel) : [];
}

function otasFor(propertyId: string): Platform[] {
  const hotel = lookupHotel(propertyId);
  if (!hotel) return [...PLATFORMS];
  const names = hotel.channels.map((channel) => (channel === "Booking" ? "Booking.com" : channel));
  const known = names.filter((name): name is Platform => (PLATFORMS as readonly string[]).includes(name));
  return known.length ? known : [...PLATFORMS];
}

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [ours, setOurs] = useState<string[]>(defaultProperty ? [defaultProperty] : []);
  const [compsByProperty, setCompsByProperty] = useState<Record<string, string[]>>({});
  const [otasByProperty, setOtasByProperty] = useState<Record<string, Platform[]>>({});
  const [runnerProperties, setRunnerProperties] = useState<string[]>(defaultProperty ? [defaultProperty] : []);
  const [reportProperty, setReportProperty] = useState(defaultProperty);
  const comps = compsByProperty[reportProperty] ?? competitorsFor(reportProperty);
  const setComps = (value: string[]) => setCompsByProperty((current) => ({ ...current, [reportProperty]: value }));
  const otas = otasByProperty[reportProperty] ?? otasFor(reportProperty);
  const setOtas = (value: Platform[]) => setOtasByProperty((current) => ({ ...current, [reportProperty]: value }));
  return <Ctx.Provider value={{ ours, setOurs, comps, setComps, runnerProperties, setRunnerProperties, reportProperty, setReportProperty, otas, setOtas }}>{children}</Ctx.Provider>;
}
export function useSelection() {
  const c = useContext(Ctx);
  if (!c) throw new Error("SelectionProvider missing");
  return c;
}
