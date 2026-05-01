import { NODE_MAP } from "@/lib/nodes";
import type { Flow, FlowNode } from "@/lib/types";
import { validateVariableName, VAR_DEFINING_KEYS, locateNode } from "@/lib/variables";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, AlertTriangle } from "lucide-react";
import { ButtonsEditor } from "./editors/ButtonsEditor";
import { SelectMenuEditor } from "./editors/SelectMenuEditor";
import { ModalFieldsEditor } from "./editors/ModalFieldsEditor";

interface Props {
  node: FlowNode | null;
  onChange: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  flows?: Flow[];
}

export function Inspector({ node, onChange, onDelete, flows = [] }: Props) {
  if (!node) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Select a node to edit its properties.
        <div className="mt-2 text-xs opacity-70">
          Tip: drop a node from the left palette to get started.
        </div>
      </div>
    );
  }
  const def = NODE_MAP[node.type];
  if (!def) return <div className="p-4 text-destructive">Unknown node type</div>;

  const set = (k: string, v: unknown) => onChange({ ...node.data, [k]: v });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="text-xs uppercase text-muted-foreground">{def.category}</div>
        <div className="font-semibold">{def.label}</div>
        <div className="text-xs text-muted-foreground mt-1">{def.description}</div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {def.fields.length === 0 && (
            <div className="text-xs text-muted-foreground">No configuration needed.</div>
          )}
          {def.fields.map((f) => {
            const v = node.data[f.key] ?? f.default ?? "";
            const validation = VAR_DEFINING_KEYS.has(f.key) && typeof v === "string"
              ? validateVariableName(v, flows, node.id)
              : { ok: true } as ReturnType<typeof validateVariableName>;
            return (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                {f.type === "text" && (
                  <Input value={String(v)} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.type === "number" && (
                  <Input type="number" value={Number(v) || 0} onChange={(e) => set(f.key, Number(e.target.value))} />
                )}
                {(f.type === "textarea" || f.type === "json" || f.type === "code") && (
                  <Textarea
                    value={String(v)}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={f.type === "textarea" ? 3 : 5}
                    className={f.type !== "textarea" ? "font-mono text-xs" : ""}
                  />
                )}
                {f.type === "boolean" && (
                  <div className="flex items-center gap-2">
                    <Switch checked={!!v} onCheckedChange={(b) => set(f.key, b)} />
                    <span className="text-xs text-muted-foreground">{v ? "On" : "Off"}</span>
                  </div>
                )}
                {f.type === "select" && f.options && (
                  <Select value={String(v)} onValueChange={(val) => set(f.key, val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.type === "buttons" && (
                  <ButtonsEditor value={String(v ?? "[]")} onChange={(next) => set(f.key, next)} />
                )}
                {f.type === "selectMenu" && (
                  <SelectMenuEditor value={String(v ?? "")} onChange={(next) => set(f.key, next)} />
                )}
                {f.type === "modalFields" && (
                  <ModalFieldsEditor value={String(v ?? "[]")} onChange={(next) => set(f.key, next)} />
                )}
                {f.help && <div className="text-[11px] text-muted-foreground">{f.help}</div>}
                {!validation.ok && (
                  <div className="text-[11px] rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold">{validation.message}</div>
                      {validation.conflicts && validation.conflicts.length > 0 && (
                        <ul className="list-disc list-inside opacity-90">
                          {validation.conflicts.map((c, i) => {
                            const loc = locateNode(flows, c.nodeId);
                            const nDef = NODE_MAP[c.nodeType];
                            return (
                              <li key={i}>
                                <span className="font-mono">{nDef?.label ?? c.nodeType}</span>
                                {loc && <> in flow <span className="font-mono">{loc.flow.name}</span></>}
                                {" "}({c.fieldKey})
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div className="opacity-80">Pick a different name to avoid overwriting it.</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete node
        </Button>
      </div>
    </div>
  );
}