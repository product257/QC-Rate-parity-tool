import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/qc/ui";
import { useHotels } from "@/components/qc/hotels";
import { hotelEditFromInput, hotelFromInput, type NewHotelInput } from "@/lib/new-hotel";
import type { Hotel } from "@/lib/qc-data";

const EMPTY: NewHotelInput = { id: "", name: "", city: "", comps: 3, bookingUrl: "", expediaUrl: "", agodaUrl: "" };

function formFromHotel(hotel: Hotel): NewHotelInput {
  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city === "—" ? "" : hotel.city,
    comps: hotel.comps,
    bookingUrl: hotel.bookingUrl ?? "",
    expediaUrl: hotel.expediaUrl ?? "",
    agodaUrl: hotel.agodaUrl ?? "",
  };
}

export function AddHotelSheet({ open, onOpenChange, hotel = null }: { open: boolean; onOpenChange: (open: boolean) => void; hotel?: Hotel | null }) {
  const { hotels, addHotel, updateHotel } = useHotels();
  const [form, setForm] = useState<NewHotelInput>(EMPTY);
  const set = (patch: Partial<NewHotelInput>) => setForm((current) => ({ ...current, ...patch }));
  const editing = hotel !== null;

  useEffect(() => {
    if (!open) return;
    setForm(hotel ? formFromHotel(hotel) : EMPTY);
  }, [open, hotel]);

  const close = () => {
    setForm(EMPTY);
    onOpenChange(false);
  };

  const save = () => {
    if (hotel) {
      const result = hotelEditFromInput(form, hotel);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      updateHotel(hotel.id, result.hotel);
      toast.success(`${result.hotel.name} updated`);
      close();
      return;
    }
    const result = hotelFromInput(form, hotels);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    addHotel(result.hotel);
    toast.success("New hotel added successfully with configured OTA links.");
    close();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) close(); else onOpenChange(true); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit hotel" : "Add hotel"}</SheetTitle>
          <SheetDescription>{editing ? "Update this property and the listing links the audit should open." : "Add a property and the live listing links the audit should open."}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div>
            <Label>BFI ID</Label>
            <Input value={form.id} disabled={editing} onChange={(event) => set({ id: event.target.value })} placeholder="US_90210_001" />
          </div>
          <div>
            <Label>Hotel name</Label>
            <Input value={form.name} onChange={(event) => set({ name: event.target.value })} placeholder="Grand Palm Resort" />
          </div>
          <div>
            <Label>City / region</Label>
            <Input value={form.city} onChange={(event) => set({ city: event.target.value })} placeholder="London, Mayfair" />
          </div>
          <div>
            <Label>Competitor count</Label>
            <Input type="number" min={1} value={form.comps} onChange={(event) => set({ comps: Number(event.target.value) })} />
          </div>
          <div>
            <Label>Booking.com URL</Label>
            <Input value={form.bookingUrl} onChange={(event) => set({ bookingUrl: event.target.value })} placeholder="https://www.booking.com/hotel/..." />
          </div>
          <div>
            <Label>Expedia URL</Label>
            <Input value={form.expediaUrl} onChange={(event) => set({ expediaUrl: event.target.value })} placeholder="https://www.expedia.com/Hotel-Search?..." />
          </div>
          <div>
            <Label>Agoda URL</Label>
            <Input value={form.agodaUrl} onChange={(event) => set({ agodaUrl: event.target.value })} placeholder="https://www.agoda.com/..." />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Save hotel"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
