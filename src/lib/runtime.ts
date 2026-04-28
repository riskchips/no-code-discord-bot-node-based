import type { Flow, FlowEdge, LogEntry, Project } from "./types";
import { NODE_MAP } from "./nodes";

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function makeResolver(scope: Record<string, unknown>) {
  return (input: string): string => {
    if (typeof input !== "string") return String(input ?? "");
    return input.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const v = getPath(scope, expr.trim());
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    });
  };
}

function compare(left: string, op: string, right: string): boolean {
  switch (op) {
    case "equals": return left === right;
    case "neq": return left !== right;
    case "contains": return left.includes(right);
    case "startsWith": return left.startsWith(right);
    case "endsWith": return left.endsWith(right);
    case "regex": try { return new RegExp(right).test(left); } catch { return false; }
    case "gt": return Number(left) > Number(right);
    case "lt": return Number(left) < Number(right);
    default: return false;
  }
}

function nextEdges(edges: FlowEdge[], nodeId: string, handle?: string) {
  return edges.filter((e) => e.source === nodeId && (handle ? e.sourceHandle === handle : true));
}

export interface RunOptions {
  project: Project;
  flow: Flow;
  startNodeId?: string;
  triggerPayload?: Record<string, unknown>;
  onLog: (e: LogEntry) => void;
}

/**
 * Execute a flow in the in-browser sandbox. Discord-side actions are simulated
 * (logged). API calls actually run.
 */
export async function runFlow(opts: RunOptions): Promise<void> {
  const { project, flow, onLog } = opts;
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(project.config); } catch { /* ignore */ }

  const variables: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(project.variables.map((v) => [v.name, v.value])),
    ...(opts.triggerPayload || {}),
  };
  const scope = { ...variables, config };
  const resolve = (s: string) => makeResolver({ ...scope, ...variables }).bind(null)(s);

  const log = (level: LogEntry["level"], msg: string, nodeId?: string, nodeType?: string, data?: unknown) =>
    onLog({ ts: Date.now(), level, message: msg, nodeId, nodeType, data });

  // pick start node
  const start = opts.startNodeId
    ? flow.nodes.find((n) => n.id === opts.startNodeId)
    : flow.nodes.find((n) => n.type.startsWith("trigger."));
  if (!start) {
    log("error", "No trigger / start node found");
    return;
  }

  const visited = new Set<string>();
  const queue: { nodeId: string; handle?: string }[] = [{ nodeId: start.id }];

  while (queue.length) {
    const { nodeId } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    const def = NODE_MAP[node.type];
    if (!def) { log("warn", `Unknown node type ${node.type}`, node.id); continue; }
    const data = node.data || {};
    const r = (k: string) => resolve(String(data[k] ?? ""));

    let outHandle: string | undefined;
    try {
      switch (node.type) {
        case "trigger.manual": {
          try {
            const p = JSON.parse(String(data.payload ?? "{}"));
            Object.assign(variables, p);
          } catch { /* */ }
          log("info", `Trigger fired`, node.id, node.type, variables);
          break;
        }
        case "condition.if": {
          const ok = compare(r("left"), String(data.op ?? "equals"), r("right"));
          outHandle = ok ? "true" : "false";
          log("info", `If → ${outHandle}`, node.id, node.type);
          break;
        }
        case "condition.switch": {
          const v = r("value");
          if (v === r("case1")) outHandle = "case1";
          else if (v === r("case2")) outHandle = "case2";
          else if (v === r("case3")) outHandle = "case3";
          else outHandle = "default";
          log("info", `Switch → ${outHandle}`, node.id, node.type);
          break;
        }
        case "delay.wait": {
          const ms = Number(data.ms) || 0;
          log("info", `Sleeping ${ms}ms`, node.id, node.type);
          await new Promise((res) => setTimeout(res, Math.min(ms, 3000)));
          break;
        }
        case "api.request": {
          try {
            const url = r("url");
            const headers = JSON.parse(resolve(String(data.headers ?? "{}")) || "{}");
            const bodyStr = resolve(String(data.body ?? ""));
            const init: RequestInit = { method: String(data.method ?? "GET"), headers };
            if (bodyStr && init.method !== "GET") {
              init.body = bodyStr;
              (init.headers as Record<string,string>)["Content-Type"] ||= "application/json";
            }
            const res = await fetch(url, init);
            const text = await res.text();
            let json: unknown = null;
            try { json = JSON.parse(text); } catch { json = text; }
            log("info", `API ${init.method} ${url} → ${res.status}`, node.id, node.type, json);
            // extract
            const extract = String(data.extract ?? "").split("\n").filter(Boolean);
            for (const line of extract) {
              const [name, path] = line.split("=").map((s) => s.trim());
              if (name && path) variables[name] = getPath(json, path);
            }
            outHandle = res.ok ? "ok" : "err";
          } catch (e) {
            log("error", `API error: ${(e as Error).message}`, node.id, node.type);
            outHandle = "err";
          }
          break;
        }
        case "utility.randomKey": {
          const sets: string[] = [];
          if (data.upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
          if (data.lower) sets.push("abcdefghijklmnopqrstuvwxyz");
          if (data.numbers) sets.push("0123456789");
          if (data.symbols) sets.push("!@#$%^&*()-_=+");
          const chars = sets.join("") || "abcdefghijklmnopqrstuvwxyz";
          const len = Math.max(1, Number(data.length) || 16);
          let out = "";
          for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
          const name = String(data.varName || "key");
          variables[name] = out;
          log("info", `Generated ${name}=${out}`, node.id, node.type);
          break;
        }
        case "utility.setVariable": {
          variables[r("name")] = r("value");
          log("info", `Set ${r("name")}=${r("value")}`, node.id, node.type);
          break;
        }
        case "utility.log": {
          log("info", r("message") || "(empty)", node.id, node.type);
          break;
        }
        case "utility.accessControl": {
          const enabled = !!data.enabled;
          if (!enabled) { outHandle = "ok"; break; }
          const ids = String(data.userIds || "").split(",").map((s) => s.trim()).filter(Boolean);
          const uid = String(variables.userId || "");
          outHandle = ids.includes(uid) ? "ok" : "denied";
          log("info", `AccessControl → ${outHandle}`, node.id, node.type);
          break;
        }
        default: {
          // Simulated discord-side action
          const desc = Object.entries(data).map(([k, v]) => `${k}=${resolve(String(v))}`).join(" ");
          log("info", `[sim] ${def.label}  ${desc}`, node.id, node.type);
        }
      }
    } catch (e) {
      log("error", `Node failed: ${(e as Error).message}`, node.id, node.type);
    }

    const next = nextEdges(flow.edges, node.id, outHandle);
    for (const e of next) queue.push({ nodeId: e.target });
    if (!outHandle && next.length === 0) {
      // also try untyped edges
      const any = nextEdges(flow.edges, node.id);
      for (const e of any) queue.push({ nodeId: e.target });
    }
  }

  log("info", "Flow finished");
}