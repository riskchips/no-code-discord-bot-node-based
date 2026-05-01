import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Rows3 } from "lucide-react";

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

/**
 * Stored shape (backward compatible):
 *   - Legacy: ButtonItem[]  (single row of up to 5 buttons)
 *   - New:    ButtonItem[][] (up to 5 rows × 5 buttons = 25 buttons total)
 * Always normalised on read into rows[].
 */
function parseRows(json: string): ButtonItem[][] {
  try {
    const v = JSON.parse(json || "[]");
    if (!Array.isArray(v)) return [];
    if (v.length === 0) return [];
    // Detect legacy flat array
    if (typeof v[0] === "object" && v[0] !== null && !Array.isArray(v[0])) {
      return [v as ButtonItem[]];
    }
    return (v as ButtonItem[][]).filter(Array.isArray);
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
  const rows = parseRows(value);
  const total = rows.reduce((n, r) => n + r.length, 0);
  const update = (next: ButtonItem[][]) => {
    const cleaned = next.filter((r) => r.length > 0);
    onChange(JSON.stringify(cleaned));
  };
  const addRow = () => {
    if (rows.length >= 5) return;
    update([...rows, [{ label: "Click me", customId: `btn_${total + 1}`, style: "Primary" }]]);
  };
  const addBtn = (rIdx: number) => {
    const row = rows[rIdx];
    if (row.length >= 5) return;
    const next = rows.map((r, i) => (i === rIdx
      ? [...r, { label: "Click me", customId: `btn_${total + 1}`, style: "Primary" as const }]
      : r));
    update(next);
  };
  const setItem = (rIdx: number, bIdx: number, patch: Partial<ButtonItem>) => {
    update(rows.map((r, i) => i === rIdx ? r.map((b, j) => j === bIdx ? { ...b, ...patch } : b) : r));
  };
  const removeBtn = (rIdx: number, bIdx: number) => {
    update(rows.map((r, i) => i === rIdx ? r.filter((_, j) => j !== bIdx) : r));
  };
  const removeRow = (rIdx: number) => update(rows.filter((_, i) => i !== rIdx));

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
          No buttons yet. Click <strong>Add row</strong> to start. You can have up to 5 rows × 5 buttons (25 total).
        </div>
      )}

      {rows.map((row, rIdx) => (
        <div key={rIdx} className="border rounded-md p-2 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Rows3 className="w-3.5 h-3.5" /> Row {rIdx + 1}
              <span className="opacity-60 normal-case">({row.length}/5)</span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeRow(rIdx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          {/* Row preview */}
          <div className="flex flex-wrap gap-1.5 p-2 rounded bg-[#2b2d31]">
            {row.map((it, bIdx) => (
              <div
                key={bIdx}
                className={`px-3 py-1 rounded text-xs font-medium truncate ${STYLE_PREVIEW[it.style]}`}
                style={{ minWidth: 60, maxWidth: 140, opacity: it.disabled ? 0.5 : 1 }}
              >
                {it.emoji ? `${it.emoji} ` : ""}{it.label || "Button"}
              </div>
            ))}
          </div>

          {row.map((it, bIdx) => (
            <div key={bIdx} className="border rounded p-2 bg-background space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Button {bIdx + 1}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto text-destructive" onClick={() => removeBtn(rIdx, bIdx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                  <Input value={it.label} onChange={(e) => setItem(rIdx, bIdx, { label: e.target.value })} className="h-8" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Style</Label>
                  <Select value={it.style} onValueChange={(v) => setItem(rIdx, bIdx, { style: v as ButtonItem["style"] })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {it.style === "Link" ? (
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">URL</Label>
                    <Input value={it.url || ""} onChange={(e) => setItem(rIdx, bIdx, { url: e.target.value })} placeholder="https://…" className="h-8" />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Custom ID</Label>
                    <Input value={it.customId} onChange={(e) => setItem(rIdx, bIdx, { customId: e.target.value })} placeholder="my_button" className="h-8 font-mono text-xs" />
                  </div>
                )}
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Emoji</Label>
                  <Input value={it.emoji || ""} onChange={(e) => setItem(rIdx, bIdx, { emoji: e.target.value })} placeholder="🎉" className="h-8" />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={!!it.disabled} onCheckedChange={(b) => setItem(rIdx, bIdx, { disabled: b })} />
                  <span className="text-xs text-muted-foreground">Disabled</span>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full" onClick={() => addBtn(rIdx)} disabled={row.length >= 5}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add button to row {rIdx + 1} {row.length >= 5 ? "(max 5)" : ""}
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full" onClick={addRow} disabled={rows.length >= 5}>
        <Rows3 className="w-3.5 h-3.5 mr-1" />
        Add row {rows.length >= 5 ? "(max 5 rows)" : `(${rows.length}/5)`}
      </Button>
      <div className="text-[10px] text-muted-foreground text-center">
        Discord limit: 5 rows × 5 buttons = 25 buttons per message.
      </div>
    </div>
  );
}