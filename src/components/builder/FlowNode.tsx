import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NODE_MAP, CATEGORY_COLORS } from "@/lib/nodes";
import {
  Zap, GitBranch, Repeat, MessageSquare, Reply, Send, Shield, MousePointerClick,
  FormInput, Globe, Clock, Database, KeyRound, FileText, Terminal, Variable, Lock,
  Calendar, UserPlus, Bot, MessageCircle,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "trigger.messageCreate": MessageCircle,
  "trigger.guildMemberAdd": UserPlus,
  "trigger.slashCommand": Zap,
  "trigger.buttonInteraction": MousePointerClick,
  "trigger.selectMenuInteraction": FormInput,
  "trigger.modalSubmit": FormInput,
  "trigger.scheduled": Calendar,
  "trigger.manual": Bot,
  "condition.if": GitBranch,
  "condition.switch": GitBranch,
  "logic.loop": Repeat,
  "action.sendMessage": Send,
  "action.reply": Reply,
  "action.dm": MessageSquare,
  "action.ban": Shield,
  "action.kick": Shield,
  "action.timeout": Shield,
  "action.addRole": Shield,
  "interaction.reply": Reply,
  "interaction.showModal": FormInput,
  "api.request": Globe,
  "delay.wait": Clock,
  "storage.set": Database,
  "storage.get": Database,
  "utility.randomKey": KeyRound,
  "utility.transcript": FileText,
  "utility.log": Terminal,
  "utility.setVariable": Variable,
  "utility.accessControl": Lock,
};

export function CustomFlowNode({ data, selected, type }: NodeProps) {
  const def = NODE_MAP[type as string];
  if (!def) {
    return (
      <div className="px-4 py-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">
        Unknown: {type as string}
      </div>
    );
  }
  const color = CATEGORY_COLORS[def.category];
  const Icon = ICONS[def.type] ?? Bot;
  const d = (data || {}) as Record<string, unknown>;
  const summary = def.fields
    .slice(0, 3)
    .map((f) => ({ k: f.label, v: d[f.key] }))
    .filter((x) => x.v !== undefined && x.v !== "" && x.v !== null && typeof x.v !== "object")
    .slice(0, 2);

  return (
    <div
      className="rounded-xl border-2 bg-card shadow-md min-w-[260px] max-w-[300px] text-card-foreground transition-shadow hover:shadow-lg"
      style={{
        borderColor: selected ? color : "var(--border)",
        boxShadow: selected ? `0 0 0 3px color-mix(in oklab, ${color} 25%, transparent)` : undefined,
      }}
    >
      {def.inputs > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !border-2 !border-background"
          style={{ background: color }}
        />
      )}
      <div
        className="px-4 py-2.5 rounded-t-[10px] flex items-center gap-2.5"
        style={{ background: color, color: "var(--brand-foreground)" }}
      >
        <Icon className="w-4 h-4 shrink-0 opacity-90" />
        <div className="flex flex-col leading-tight min-w-0">
          <div className="text-[10px] uppercase tracking-wider opacity-75 font-semibold">
            {def.category}
          </div>
          <div className="text-sm font-bold truncate">{def.label}</div>
        </div>
      </div>
      <div className="px-4 py-2.5 text-xs text-muted-foreground min-h-[36px] border-b">
        {summary.length === 0 ? (
          <span className="opacity-60 italic">Click to configure</span>
        ) : (
          <div className="space-y-0.5">
            {summary.map((s, i) => (
              <div key={i} className="truncate">
                <span className="opacity-60">{s.k}: </span>
                <span className="font-mono text-foreground/90">{String(s.v).slice(0, 40)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative py-1.5">
        {def.outputs.map((o, i) => (
          <div
            key={o.id}
            className="relative h-7 flex items-center justify-end pr-4 text-[11px] font-medium text-muted-foreground"
          >
            <span className="capitalize">{o.label}</span>
            <Handle
              id={o.id}
              type="source"
              position={Position.Right}
              style={{ top: `${i * 28 + 14}px`, background: color }}
              className="!w-3.5 !h-3.5 !border-2 !border-background"
            />
          </div>
        ))}
      </div>
    </div>
  );
}