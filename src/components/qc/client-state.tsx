import { createContext, useContext, useState, type ReactNode } from "react";
import { CLIENT_CHECKS, applyClientDecision, type ClientCheck, type ClientDecision } from "@/lib/client-data";

type ClientState = {
  checksFor: (property: string) => ClientCheck[];
  decisionsFor: (property: string) => Record<string, ClientDecision>;
  saveDecision: (property: string, id: string, decision: ClientDecision) => void;
  saveNote: (property: string, id: string, note: string) => void;
};
const ClientContext = createContext<ClientState | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [checks, setChecks] = useState<Record<string, ClientCheck[]>>({});
  const [decisions, setDecisions] = useState<Record<string, Record<string, ClientDecision>>>({});
  const saveDecision = (property: string, id: string, decision: ClientDecision) => {
    setChecks((old) => ({ ...old, [property]: applyClientDecision(old[property] ?? CLIENT_CHECKS, id, decision) }));
    setDecisions((old) => ({ ...old, [property]: { ...old[property], [id]: decision } }));
  };
  const saveNote = (property: string, id: string, note: string) => {
    setDecisions((old) => ({ ...old, [property]: { ...old[property], [id]: { help: "team", plan: "once", ...old[property]?.[id], note } } }));
  };
  return <ClientContext.Provider value={{ checksFor: (p) => checks[p] ?? CLIENT_CHECKS, decisionsFor: (p) => decisions[p] ?? {}, saveDecision, saveNote }}>{children}</ClientContext.Provider>;
}

export function useClientPortal() {
  const context = useContext(ClientContext);
  if (!context) throw new Error("ClientProvider missing");
  return context;
}