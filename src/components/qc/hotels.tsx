import { createContext, useContext, useState, type ReactNode } from "react";
import { HOTELS, syncLiveHotels, type Hotel } from "@/lib/qc-data";

type Catalog = {
  hotels: Hotel[];
  addHotel: (hotel: Hotel) => void;
  updateHotel: (id: string, hotel: Hotel) => void;
};

const Ctx = createContext<Catalog | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const [hotels, setHotels] = useState<Hotel[]>(HOTELS);
  syncLiveHotels(hotels);
  const addHotel = (hotel: Hotel) => {
    setHotels((current) => current.some((item) => item.id === hotel.id) ? current : [...current, hotel]);
  };
  const updateHotel = (id: string, hotel: Hotel) => {
    setHotels((current) => current.map((item) => item.id === id ? { ...hotel, id } : item));
  };
  return <Ctx.Provider value={{ hotels, addHotel, updateHotel }}>{children}</Ctx.Provider>;
}

export function useHotels() {
  const value = useContext(Ctx);
  if (!value) throw new Error("HotelProvider missing");
  return value;
}
