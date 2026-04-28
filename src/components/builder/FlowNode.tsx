import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_MAP, CATEGORY_COLORS } from "@/lib/nodes";

export function CustomFlowNode({ data, selected, type }: NodeProps) {
  const def = NODE_MAP[type as string];
  if (!def) return <div className="px-3 py-2 rounded bg-destructive text-destructive-foreground text-xs">Unknown: {type}</div>;
  const color = CATEGORY_COLORS[def.category];
  const d = (data || {}) as Record<string, unknown>;
  const summary = def.fields.slice(0, 2)
    .map((f) => d[f.key])
    .filter((v) => v !== undefined && v !== "" && v !== null)
    .map((v) => String(v).slice(0, 36))
    .join(" · ");

  return (
    <div
      className="rounded-lg border bg-card shadow-sm min-w-[200px] text-card-foreground"
      style={{ borderColor: selected ? color : "var(--border)", borderWidth: selected ? 2 : 1 }}
    >
      {def.inputs > 0 && <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted-foreground" />}
      <div className="px-3 py-2 rounded-t-lg flex items-center gap-2" style={{ background: color, color: "var(--brand-foreground)" }}>
        <div className="text-xs uppercase tracking-wider opacity-80">{def.category}</div>
        <div className="text-sm font-semibold ml-auto">{def.label}</div>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground min-h-[28px]">
        {summary || <span className="opacity-50">Click to configure</span>}
      </div>
      <div className="relative pb-2">
        {def.outputs.map((o, i) => (
          <div key={o.id} className="relative h-6 flex items-center justify-end pr-3 text-[10px] text-muted-foreground">
            <span>{o.label}</span>
            <Handle
              id={o.id}
              type="source"
              position={Position.Right}
              style={{ top: `${i * 24 + 12}px`, background: color }}
              className="!w-2.5 !h-2.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}