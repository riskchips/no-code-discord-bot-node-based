export type NodeCategory =
  | "trigger"
  | "condition"
  | "logic"
  | "action"
  | "interaction"
  | "api"
  | "delay"
  | "storage"
  | "utility"
  | "subflow";

export interface FieldDef {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "boolean"
    | "select"
    | "json"
    | "code"
    | "buttons"
    | "selectMenu"
    | "modalFields";
  options?: { label: string; value: string }[];
  placeholder?: string;
  default?: unknown;
  required?: boolean;
  help?: string;
}

export interface NodeTypeDef {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  icon?: string;
  inputs: number; // number of input handles
  outputs: { id: string; label: string }[];
  fields: FieldDef[];
  /** runtime executor for in-browser sandbox */
  run?: (data: Record<string, unknown>, ctx: ExecContext) => Promise<unknown> | unknown;
  /** generates JS code body that runs at this node in the exported bot */
  codegen?: (data: Record<string, unknown>) => string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Project {
  id: string;
  name: string;
  config: string; // raw JSON string
  tokenPath: string; // e.g. "config.bot.token"
  flows: Flow[];
  variables: { name: string; value: string }[];
  updatedAt: number;
}

export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  nodeId?: string;
  nodeType?: string;
  message: string;
  data?: unknown;
}

export interface ExecContext {
  variables: Record<string, unknown>;
  config: Record<string, unknown>;
  log: (e: Omit<LogEntry, "ts">) => void;
  resolve: (template: string) => string;
}

export interface DiscordEvent {
  ts: number;
  kind:
    | "user-message"
    | "bot-message"
    | "bot-reply"
    | "bot-dm"
    | "interaction-reply"
    | "modal"
    | "moderation"
    | "system";
  author?: { name: string; bot?: boolean; color?: string };
  replyTo?: { author: string; content: string };
  ephemeral?: boolean;
  message?: {
    type: "text" | "embed";
    content?: string;
    embedTitle?: string;
    embedColor?: string;
    buttons?: { label: string; style: string; emoji?: string; disabled?: boolean; url?: string; customId?: string }[];
    selectMenu?: {
      customId: string;
      placeholder?: string;
      kind?: string;
      options?: { label: string; value: string }[];
    } | null;
  };
  modal?: {
    title: string;
    fields: { customId: string; label: string; style: string; placeholder?: string }[];
  };
  text?: string;
}