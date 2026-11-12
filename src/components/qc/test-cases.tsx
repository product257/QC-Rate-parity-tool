import { createContext, useContext, useState, type ReactNode } from "react";
import { TEST_CASES, type TestCase } from "@/lib/qc-data";

type Catalog = {
  cases: TestCase[];
  setActive: (ids: string[], active: boolean) => void;
  save: (draft: TestCase) => void;
};

const Ctx = createContext<Catalog | null>(null);

export function TestCaseProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState(TEST_CASES);
  const setActive = (ids: string[], active: boolean) => {
    const chosen = new Set(ids);
    setCases((current) => current.map((test) => chosen.has(test.id) ? { ...test, active } : test));
  };
  const save = (draft: TestCase) => {
    if (!draft.title.trim()) return;
    if (draft.id) {
      setCases((current) => current.map((test) => test.id === draft.id ? draft : test));
      return;
    }
    setCases((current) => [{ ...draft, id: `TC-${String(130 + current.length).padStart(3, "0")}` }, ...current]);
  };
  return <Ctx.Provider value={{ cases, setActive, save }}>{children}</Ctx.Provider>;
}

export function useTestCases() {
  const value = useContext(Ctx);
  if (!value) throw new Error("TestCaseProvider missing");
  return value;
}
