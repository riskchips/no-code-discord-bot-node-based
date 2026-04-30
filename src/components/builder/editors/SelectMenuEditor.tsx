import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown } from "lucide-react";

export interface SelectMenuValue {
  customId: string;
  placeholder?: string;
  min?: number;
  max?: number;
  kind?: "string" | "user" | "role" | "channel";
  options?: { label: string; value: string; description?: string }[];
}

function parse(json: string): SelectMenuValue | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

export function SelectMenuEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const menu = parse(value);
  const write = (next: SelectMenuValue | null) =>
    onChange(next ? JSON.stringify(next) : "");

  if (!menu) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          write({
            customId: "my_menu",
            placeholder: "Pick one",
            min: 1,
            max: 1,
            kind: "string",
            options: [{ label: "Option 1", value: "opt1" }],
          })
        }
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add select menu
      </Button>
    );
  }

  const set = (patch: Partial<SelectMenuValue>) => write({ ...menu, ...patch });
  const opts = menu.options || [];
  const addOpt = () => {
    if (opts.length >= 25) return;
    set({ options: [...opts, { label: `Option ${opts.length + 1}`, value: `opt${opts.length + 1}` }] });
  };
  const setOpt = (i: number, patch: Partial<{ label: string; value: string; description?: string }>) =>
    set({ options: opts.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  const rmOpt = (i: number) => set({ options: opts.filter((_, idx) => idx !== i) });

  return (
    <div className="border rounded-md p-2 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Select menu</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive"
          onClick={() => write(null)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* preview */}
      <div className="bg-[#1e1f22] text-white text-xs rounded px-3 py-2 flex items-center justify-between">
        <span className="opacity-80">{menu.placeholder || "Choose…"}</span>
        <ChevronDown className="w-4 h-4 opacity-70" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[10px] uppercase text-muted-foreground">Custom ID</Label>
          <Input value={menu.customId} onChange={(e) => set({ customId: e.target.value })} className="h-8 font-mono text-xs" />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] uppercase text-muted-foreground">Placeholder</Label>
          <Input value={menu.placeholder || ""} onChange={(e) => set({ placeholder: e.target.value })} className="h-8" />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
          <Select value={menu.kind || "string"} onValueChange={(v) => set({ kind: v as SelectMenuValue["kind"] })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="string">Custom options</SelectItem>
              <SelectItem value="user">User picker</SelectItem>
              <SelectItem value="role">Role picker</SelectItem>
              <SelectItem value="channel">Channel picker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Min</Label>
            <Input type="number" min={0} max={25} value={menu.min ?? 1}
              onChange={(e) => set({ min: Number(e.target.value) })} className="h-8" />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Max</Label>
            <Input type="number" min={1} max={25} value={menu.max ?? 1}
              onChange={(e) => set({ max: Number(e.target.value) })} className="h-8" />
          </div>
        </div>
      </div>

      {(menu.kind ?? "string") === "string" && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase text-muted-foreground">Options ({opts.length}/25)</div>
          {opts.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
              <Input value={o.label} placeholder="Label" onChange={(e) => setOpt(i, { label: e.target.value })} className="h-8" />
              <Input value={o.value} placeholder="value" onChange={(e) => setOpt(i, { value: e.target.value })} className="h-8 font-mono text-xs" />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rmOpt(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addOpt} disabled={opts.length >= 25}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add option
          </Button>
        </div>
      )}
    </div>
  );
}