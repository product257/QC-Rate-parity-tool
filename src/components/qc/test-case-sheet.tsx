import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label, useHotelOptions } from "@/components/qc/ui";
import { MultiSelect } from "@/components/qc/multi-select";
import { VoiceNote, appendTranscript } from "@/components/qc/voice-note";
import { PLATFORMS, detectProperties, matchTestCaseProperties, type TestCase } from "@/lib/qc-data";

export function TestCaseSheet({ editing, onChange, onClose, onSave }: {
  editing: TestCase | null;
  onChange: (test: TestCase) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hotelChoices = useHotelOptions();
  const dictate = useCallback((spoken: string) => {
    if (!editing) return;
    onChange({ ...editing, description: appendTranscript(editing.description, spoken) });
  }, [editing, onChange]);

  return (
    <Sheet open={!!editing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {editing && (
          <>
            <SheetHeader>
              <SheetTitle>{editing.id ? `Edit Test Case — ${editing.id}` : "New Test Case"}</SheetTitle>
              <SheetDescription>Write the check in plain English. The bot plans its browser steps from it.</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const found = [...new Set([...detectProperties(title), ...matchTestCaseProperties(title)])];
                    onChange({
                      ...editing,
                      title,
                      properties: editing.properties === "all" ? "all" : found.length > 0 ? found : editing.properties,
                    });
                  }}
                  placeholder="e.g. Swimming pool maintenance status sync"
                />
                <p className="mt-1 text-xs text-muted-foreground">Type the test case name — properties linked to similar checks appear automatically below.</p>
              </div>
              <div>
                <Label>Linked properties</Label>
                <div className="mb-2 flex items-center gap-2">
                  <Switch id="allp" checked={editing.properties === "all"} onCheckedChange={(v) => onChange({ ...editing, properties: v ? "all" : [] })} />
                  <label htmlFor="allp" className="text-sm">Apply to all selected properties</label>
                </div>
                {editing.properties !== "all" && (
                  <MultiSelect options={hotelChoices} value={editing.properties} onChange={(v) => onChange({ ...editing, properties: v })} placeholder="Choose hotels" searchPlaceholder="Search BFI id or hotel name" />
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {editing.properties === "all" ? "Linked to every property in scope" : `${editing.properties.length} hotels linked`}
                </p>
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={editing.platform} onValueChange={(v) => onChange({ ...editing, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>DSL description</Label>
                <Textarea rows={8} value={editing.description} onChange={(e) => onChange({ ...editing, description: e.target.value })} placeholder="Check that the property response rate on Booking.com meets or exceeds 90%…" />
                <p className="mt-1 text-xs text-muted-foreground">Enter a natural description of what to check. No raw code required.</p>
                <VoiceNote onTranscript={dictate} />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave}>Save Test Case</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
