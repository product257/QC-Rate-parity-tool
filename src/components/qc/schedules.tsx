import { createContext, useContext, useState, type ReactNode } from "react";

export const SCHEDULE_FREQUENCIES = ["Off", "Daily", "Weekly", "Monthly"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];
export type PropertySchedule = { frequency: ScheduleFrequency; time: string };

const DEFAULT_SCHEDULE: PropertySchedule = { frequency: "Monthly", time: "09:00" };

type Api = {
  scheduleFor: (propertyId: string) => PropertySchedule;
  setSchedule: (propertyId: string, schedule: PropertySchedule) => void;
};

const Ctx = createContext<Api | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<Record<string, PropertySchedule>>({});
  const scheduleFor = (propertyId: string) => schedules[propertyId] ?? DEFAULT_SCHEDULE;
  const setSchedule = (propertyId: string, schedule: PropertySchedule) => {
    if (!propertyId) return;
    setSchedules((current) => ({ ...current, [propertyId]: schedule }));
  };
  return <Ctx.Provider value={{ scheduleFor, setSchedule }}>{children}</Ctx.Provider>;
}

export function usePropertySchedule(propertyId: string) {
  const value = useContext(Ctx);
  if (!value) throw new Error("ScheduleProvider missing");
  const schedule = value.scheduleFor(propertyId);
  const update = (patch: Partial<PropertySchedule>) => value.setSchedule(propertyId, { ...schedule, ...patch });
  return { schedule, update };
}
