import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export interface ModalField {
  customId: string;
  label: string;
  style: "Short" | "Paragraph";
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}

function parse(json: string): ModalField[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function ModalFieldsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const items = parse(value);
  const update = (next: ModalField[]) => onChange(JSON.stringify(next));
  const add = () => {
    if (items.length >= 5) return;
    update([
      ...items,
      {
        customId: `q${items.length + 1}`,
        label: `Question ${items.length + 1}`,
        style: "Short",
        required: true,
      },
    ]);
  };
  const setItem = (i: number, patch: Partial<ModalField>) =>
    update(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => update(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
          No questions yet. Click + to add one.
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} className="border rounded-md p-2 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Q{i + 1}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Question label</Label>
              <Input value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} className="h-8" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Field ID</Label>
              <Input value={it.customId} onChange={(e) => setItem(i, { customId: e.target.value })} className="h-8 font-mono text-xs" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Style</Label>
              <Select value={it.style} onValueChange={(v) => setItem(i, { style: v as "Short" | "Paragraph" })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Short">Short (one line)</SelectItem>
                  <SelectItem value="Paragraph">Paragraph</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Placeholder</Label>
              <Input value={it.placeholder || ""} onChange={(e) => setItem(i, { placeholder: e.target.value })} className="h-8" />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={it.required !== false} onCheckedChange={(b) => setItem(i, { required: b })} />
              <span className="text-xs text-muted-foreground">Required</span>
            </div>
            <div className="text-[10px] text-muted-foreground self-end">
              Use as <code className="font-mono">${"{"}field_{it.customId}{"}"}</code>
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={add} disabled={items.length >= 5}>
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add question {items.length >= 5 ? "(max 5)" : `(${items.length}/5)`}
      </Button>
    </div>
  );
}