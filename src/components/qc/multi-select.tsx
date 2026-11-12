import { useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

function highlightMatch(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const target = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const at = lower.indexOf(target, cursor);
    if (at < 0) {
      parts.push(text.slice(cursor));
      break;
    }
    if (at > cursor) parts.push(text.slice(cursor, at));
    parts.push(<mark key={key} className="rounded-sm bg-warning/40 text-foreground">{text.slice(at, at + target.length)}</mark>);
    key += 1;
    cursor = at + target.length;
  }
  return parts;
}

/** Digits match the zip or the serial as the user types them. `001` stays on the serial and does not also hit zip 10001. */
function matchesOption(option: Opt, query: string) {
  const bfi = option.value.toLowerCase().match(/^us_(\d{5})_(\d{3})$/);
  if (bfi?.[1] && bfi[2] && /^\d+$/.test(query)) return bfi[1].startsWith(query) || bfi[2].startsWith(query);
  return `${option.label} ${option.value}`.toLowerCase().includes(query);
}

export function MultiSelect({
  options, value, onChange, placeholder = "Select…", single = false, searchPlaceholder = "Search…", named = false,
}: { options: Opt[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; single?: boolean; searchPlaceholder?: string; named?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const needle = query.trim().toLowerCase();
  const visible = needle ? options.filter((option) => matchesOption(option, needle)) : options;
  const toggle = (v: string) => {
    if (single) { onChange([v]); setQuery(""); setOpen(false); return; }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const selectAll = () => onChange([...new Set([...value, ...visible.map((option) => option.value)])]);
  const chips = single || (!named && value.length > 2) ? [] : value;
  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={0}
          className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 text-sm transition-colors hover:border-info/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {value.length === 0 && <span className="px-1 text-muted-foreground">{placeholder}</span>}
          {single && value[0] ? (
            <span className="px-1 font-medium whitespace-normal">{label(value[0])}</span>
          ) : !named && value.length > 2 ? (
            <span className="inline-flex items-center gap-1 rounded bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
              {value.length} properties selected
              <button type="button" aria-label="Clear selected properties" onClick={(event) => { event.stopPropagation(); onChange([]); }} className="rounded hover:bg-info/15">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            chips.map((v) => (
              <span key={v} className="inline-flex max-w-full items-center gap-1 rounded bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                <span className="truncate">{label(v)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${label(v)}`}
                  onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)); }}
                  className="rounded hover:bg-info/15"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          {!single && (
            <div className="flex gap-3 border-b px-3 py-2">
              <button type="button" className="text-xs font-medium text-info hover:underline" onClick={selectAll}>Select all</button>
              <button type="button" className="text-xs font-medium text-muted-foreground hover:underline" onClick={() => onChange([])}>Clear all</button>
            </div>
          )}
          <CommandList>
            {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No results.</p>}
            <CommandGroup>
              {visible.map((o) => (
                <CommandItem key={o.value} value={o.value} onSelect={() => toggle(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  {highlightMatch(o.label, query)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
