import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

export interface ButtonItem {
  label: string;
  customId: string;
  style: "Primary" | "Secondary" | "Success" | "Danger" | "Link";
  emoji?: string;
  disabled?: boolean;
  url?: string;
}

const STYLES: ButtonItem["style"][] = ["Primary", "Secondary", "Success", "Danger", "Link"];
const STYLE_PREVIEW: Record<ButtonItem["style"], string> = {
  Primary: "bg-[#5865F2] text-white",
  Secondary: "bg-[#4E5058] text-white",
  Success: "bg-[#248046] text-white",
  Danger: "bg-[#DA373C] text-white",
  Link: "bg-[#4E5058] text-white",
};

function parse(json: string): ButtonItem[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function ButtonsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const items = parse(value);
  const update = (next: ButtonItem[]) => onChange(JSON.stringify(next));
  const add = () => {
    if (items.length >= 5) return;
    update([
      ...items,
      { label: "Click me", customId: `btn_${items.length + 1}`, style: "Primary" },
    ]);
  };
  const setItem = (i: number, patch: Partial<ButtonItem>) => {
    update(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => update(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
          No buttons yet. Click + to add one.
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} className="border rounded-md p-2 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div
              className={`px-3 py-1 rounded text-xs font-medium truncate ${STYLE_PREVIEW[it.style]}`}
              style={{ minWidth: 80, maxWidth: 160 }}
            >
              {it.emoji ? `${it.emoji} ` : ""}{it.label || "Button"}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 ml-auto text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
              <Input
                value={it.label}
                onChange={(e) => setItem(i, { label: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Style</Label>
              <Select value={it.style} onValueChange={(v) => setItem(i, { style: v as ButtonItem["style"] })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {it.style === "Link" ? (
              <div className="col-span-2">
                <Label className="text-[10px] uppercase text-muted-foreground">URL</Label>
                <Input
                  value={it.url || ""}
                  onChange={(e) => setItem(i, { url: e.target.value })}
                  placeholder="https://…"
                  className="h-8"
                />
              </div>
            ) : (
              <div className="col-span-2">
                <Label className="text-[10px] uppercase text-muted-foreground">Custom ID</Label>
                <Input
                  value={it.customId}
                  onChange={(e) => setItem(i, { customId: e.target.value })}
                  placeholder="my_button"
                  className="h-8 font-mono text-xs"
                />
              </div>
            )}
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Emoji</Label>
              <Input
                value={it.emoji || ""}
                onChange={(e) => setItem(i, { emoji: e.target.value })}
                placeholder="🎉"
                className="h-8"
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch
                checked={!!it.disabled}
                onCheckedChange={(b) => setItem(i, { disabled: b })}
              />
              <span className="text-xs text-muted-foreground">Disabled</span>
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={add}
        disabled={items.length >= 5}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add button {items.length >= 5 ? "(max 5)" : `(${items.length}/5)`}
      </Button>
    </div>
  );
}