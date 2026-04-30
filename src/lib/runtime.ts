import type { DiscordEvent, Flow, FlowEdge, FlowNode, LogEntry, Project } from "./types";
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
    case "empty": return !left;
    case "notEmpty": return !!left;
    default: return false;
  }
}

function nextEdges(edges: FlowEdge[], nodeId: string, handle?: string) {
  return edges.filter((e) => e.source === nodeId && (handle ? e.sourceHandle === handle : true));
}

// Tiny safe math evaluator: digits, ops, parentheses, decimals, spaces only.
function safeMath(expr: string): number {
  if (!/^[\d+\-*/%(). ]+$/.test(expr)) throw new Error("Unsafe expression: " + expr);
  // eslint-disable-next-line no-new-func
  const fn = new Function("return (" + expr + ")");
  const v = fn();
  if (typeof v !== "number" || !isFinite(v)) throw new Error("Bad result");
  return v;
}

interface RunCtx {
  project: Project;
  flow: Flow;
  variables: Record<string, unknown>;
  config: Record<string, unknown>;
  storage: Record<string, unknown>;
  cooldowns: Record<string, number>;
  log: (level: LogEntry["level"], message: string, nodeId?: string, nodeType?: string, data?: unknown) => void;
  emit?: (e: DiscordEvent) => void;
}

async function execNode(node: FlowNode, ctx: RunCtx): Promise<string | undefined> {
  const data = node.data || {};
  const def = NODE_MAP[node.type];
  if (!def) { ctx.log("warn", `Unknown node type ${node.type}`, node.id); return; }

  const scope = () => ({ ...ctx.variables, config: ctx.config });
  const resolve = (s: unknown) => makeResolver(scope())(typeof s === "string" ? s : String(s ?? ""));
  const r = (k: string) => resolve(data[k]);

  switch (node.type) {
    // Triggers (no-op when entered as a step)
    case "trigger.messageCreate": case "trigger.messageDelete": case "trigger.messageUpdate":
    case "trigger.guildMemberAdd": case "trigger.guildMemberRemove":
    case "trigger.reactionAdd": case "trigger.voiceJoin": case "trigger.voiceLeave":
    case "trigger.slashCommand": case "trigger.buttonInteraction":
    case "trigger.selectMenuInteraction": case "trigger.modalSubmit":
    case "trigger.scheduled":
      return;
    case "trigger.manual": {
      try {
        const p = JSON.parse(String(data.payload ?? "{}"));
        Object.assign(ctx.variables, p);
      } catch { /* */ }
      ctx.log("info", "Trigger fired", node.id, node.type, ctx.variables);
      return;
    }

    case "condition.if": {
      const ok = compare(r("left"), String(data.op ?? "equals"), r("right"));
      ctx.log("info", `If → ${ok ? "true" : "false"}`, node.id, node.type);
      return ok ? "true" : "false";
    }
    case "condition.switch": {
      const v = r("value");
      for (const c of ["case1", "case2", "case3", "case4"]) {
        if (v === r(c)) { ctx.log("info", `Switch → ${c}`, node.id); return c; }
      }
      ctx.log("info", `Switch → default`, node.id);
      return "default";
    }
    case "condition.hasRole": {
      const roles = String(ctx.variables.userRoles || "").split(",");
      const ok = roles.includes(r("roleId"));
      return ok ? "true" : "false";
    }
    case "condition.isAdmin": {
      const ok = String(ctx.variables.isAdmin || "") === "true";
      return ok ? "true" : "false";
    }

    case "delay.wait": {
      const ms = Number(data.ms) || 0;
      await new Promise((res) => setTimeout(res, Math.min(ms, 3000)));
      return;
    }

    case "logic.stop":
      throw new Error("__STOP__");

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
        ctx.log("info", `API ${init.method} ${url} → ${res.status}`, node.id, node.type, json);
        const extract = String(data.extract ?? "").split("\n").filter(Boolean);
        for (const line of extract) {
          const [name, path] = line.split("=").map((s) => s.trim());
          if (name && path) ctx.variables[name] = getPath(json, path);
        }
        return res.ok ? "ok" : "err";
      } catch (e) {
        ctx.log("error", `API error: ${(e as Error).message}`, node.id, node.type);
        return "err";
      }
    }

    case "api.webhook": {
      try {
        const res = await fetch(r("url"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: r("content"), username: r("username") || undefined }),
        });
        ctx.log("info", `Webhook → ${res.status}`, node.id, node.type);
        return res.ok ? "ok" : "err";
      } catch (e) {
        ctx.log("error", `Webhook error: ${(e as Error).message}`, node.id);
        return "err";
      }
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
      ctx.variables[name] = out;
      ctx.log("info", `Generated ${name}=${out}`, node.id);
      return;
    }
    case "utility.randomNumber": {
      const min = Number(r("min")) || 0;
      const max = Number(r("max")) || 0;
      const v = Math.floor(Math.random() * (max - min + 1)) + min;
      ctx.variables[String(data.varName || "n")] = v;
      ctx.log("info", `Random ${data.varName}=${v}`, node.id);
      return;
    }
    case "utility.randomChoice": {
      const items = r("list").split(",").map((s) => s.trim()).filter(Boolean);
      const v = items[Math.floor(Math.random() * items.length)] ?? "";
      ctx.variables[String(data.varName || "choice")] = v;
      ctx.log("info", `Choice=${v}`, node.id);
      return;
    }
    case "utility.math": {
      try {
        const expr = r("expr");
        const v = safeMath(expr);
        ctx.variables[String(data.varName || "result")] = v;
        ctx.log("info", `Math ${expr} = ${v}`, node.id);
      } catch (e) { ctx.log("error", `Math: ${(e as Error).message}`, node.id); }
      return;
    }
    case "utility.string": {
      const input = r("input");
      const a1 = r("arg1"), a2 = r("arg2");
      let v: string | number = input;
      switch (String(data.op || "upper")) {
        case "upper": v = input.toUpperCase(); break;
        case "lower": v = input.toLowerCase(); break;
        case "trim": v = input.trim(); break;
        case "replace": v = input.split(a1).join(a2); break;
        case "slice": v = input.slice(Number(a1)||0, a2 ? Number(a2) : undefined); break;
        case "length": v = input.length; break;
        case "reverse": v = input.split("").reverse().join(""); break;
      }
      ctx.variables[String(data.varName || "out")] = v;
      ctx.log("info", `String → ${v}`, node.id);
      return;
    }
    case "utility.json": {
      try {
        const o = JSON.parse(r("input"));
        const v = data.path ? getPath(o, r("path")) : o;
        ctx.variables[String(data.varName || "parsed")] = v;
      } catch (e) { ctx.log("error", `JSON: ${(e as Error).message}`, node.id); }
      return;
    }
    case "utility.timestamp": {
      const now = new Date();
      const fmt = String(data.format || "iso");
      let v: string | number = now.toISOString();
      if (fmt === "unix") v = Math.floor(now.getTime() / 1000);
      else if (fmt === "unixms") v = now.getTime();
      else if (fmt === "discord") v = `<t:${Math.floor(now.getTime()/1000)}:F>`;
      else if (fmt === "locale") v = now.toLocaleString();
      ctx.variables[String(data.varName || "now")] = v;
      return;
    }
    case "utility.setVariable": {
      ctx.variables[r("name")] = r("value");
      ctx.log("info", `Set ${r("name")}=${r("value")}`, node.id);
      return;
    }
    case "utility.log": {
      ctx.log("info", r("message") || "(empty)", node.id);
      return;
    }
    case "utility.accessControl": {
      if (!data.enabled) return "ok";
      const ids = String(data.userIds || "").split(",").map((s) => s.trim()).filter(Boolean);
      const roles = String(data.roleIds || "").split(",").map((s) => s.trim()).filter(Boolean);
      const uid = String(ctx.variables.userId || "");
      const userRoles = String(ctx.variables.userRoles || "").split(",");
      const ok = (ids.length && ids.includes(uid)) || (roles.length && roles.some((r2) => userRoles.includes(r2)));
      return ok || (!ids.length && !roles.length) ? "ok" : "denied";
    }
    case "utility.cooldown": {
      const key = r("key") || "global";
      const seconds = Number(data.seconds) || 30;
      const last = ctx.cooldowns[key] || 0;
      const now = Date.now();
      if (now - last < seconds * 1000) {
        ctx.log("info", `Cooldown blocked (${key})`, node.id);
        return "blocked";
      }
      ctx.cooldowns[key] = now;
      return "ok";
    }
    case "storage.set": ctx.storage[r("key")] = r("value"); return;
    case "storage.get": ctx.variables[String(data.varName)] = ctx.storage[r("key")]; return;
    case "storage.delete": delete ctx.storage[r("key")]; return;
    case "storage.increment": {
      const k = r("key");
      const cur = Number(ctx.storage[k]) || 0;
      const next = cur + (Number(data.by) || 1);
      ctx.storage[k] = next;
      ctx.variables[String(data.varName || "count")] = next;
      return;
    }

    case "action.sendMessage":
    case "action.reply":
    case "action.dm":
    case "interaction.reply": {
      const type: "text" | "embed" = data.messageType === "embed" ? "embed" : "text";
      const content = r("content");
      let buttons: { label: string; style: string; emoji?: string; disabled?: boolean; url?: string; customId?: string }[] = [];
      type MenuT = NonNullable<NonNullable<DiscordEvent["message"]>["selectMenu"]>;
      let menu: MenuT | null = null;
      try {
        const parsed = JSON.parse(String(data.buttons || "[]"));
        if (Array.isArray(parsed)) {
          buttons = parsed.map((b: Record<string, unknown>) => ({
            label: resolve(String(b.label ?? "Button")),
            style: String(b.style ?? "Primary"),
            emoji: b.emoji ? String(b.emoji) : undefined,
            disabled: !!b.disabled,
            url: b.url ? resolve(String(b.url)) : undefined,
            customId: b.customId ? resolve(String(b.customId)) : undefined,
          }));
        }
      } catch { /* */ }
      try {
        if (data.selectMenu) {
          const m = JSON.parse(String(data.selectMenu));
          if (m && typeof m === "object") {
            menu = {
              customId: resolve(String(m.customId || "")),
              placeholder: m.placeholder ? resolve(String(m.placeholder)) : undefined,
              kind: m.kind || "string",
              options: Array.isArray(m.options)
                ? m.options.map((o: Record<string, unknown>) => ({
                    label: resolve(String(o.label ?? "Option")),
                    value: resolve(String(o.value ?? "v")),
                  }))
                : [],
            };
          }
        }
      } catch { /* */ }

      const botName = String((ctx.config as Record<string, unknown>).botName || "Bot");
      const kindMap: Record<string, DiscordEvent["kind"]> = {
        "action.sendMessage": "bot-message",
        "action.reply": "bot-reply",
        "action.dm": "bot-dm",
        "interaction.reply": "interaction-reply",
      };
      ctx.emit?.({
        ts: Date.now(),
        kind: kindMap[node.type],
        author: { name: botName, bot: true, color: "#5865F2" },
        ephemeral: !!data.ephemeral,
        replyTo:
          node.type === "action.reply"
            ? { author: String(ctx.variables.username || "user"), content: String(ctx.variables.message || "") }
            : undefined,
        message: {
          type, content,
          embedTitle: type === "embed" ? r("embedTitle") : undefined,
          embedColor: type === "embed" ? (r("embedColor") || "#5865F2") : undefined,
          buttons, selectMenu: menu,
        },
      });
      if (data.saveAs) ctx.variables[String(data.saveAs)] = "msg_" + Math.random().toString(36).slice(2, 10);
      ctx.log("info", `${def.label} sent`, node.id);
      return;
    }

    case "interaction.showModal": {
      let fields: { customId: string; label: string; style: string; placeholder?: string }[] = [];
      try {
        const arr = JSON.parse(String(data.fields || "[]"));
        if (Array.isArray(arr)) {
          fields = arr.map((f: Record<string, unknown>) => ({
            customId: String(f.customId || "field"),
            label: resolve(String(f.label || "Question")),
            style: String(f.style || "Short"),
            placeholder: f.placeholder ? resolve(String(f.placeholder)) : undefined,
          }));
        }
      } catch { /* */ }
      ctx.emit?.({ ts: Date.now(), kind: "modal", modal: { title: r("title") || "Form", fields } });
      ctx.log("info", `Show modal "${r("title")}"`, node.id);
      return;
    }

    default: {
      // Simulated discord-side action
      const desc = Object.entries(data).map(([k, v]) => `${k}=${resolve(String(v))}`).join(" ");
      if (def.category === "action") {
        ctx.emit?.({ ts: Date.now(), kind: "moderation", text: `${def.label}: ${desc}` });
      }
      if (data.saveAs) ctx.variables[String(data.saveAs)] = "id_" + Math.random().toString(36).slice(2, 10);
      ctx.log("info", `[sim] ${def.label}  ${desc}`, node.id, node.type);
      return;
    }
  }
}

/**
 * Walk the flow from a starting node. Supports loops (Loop / ForEach), try/catch.
 */
async function walk(startNodeId: string, ctx: RunCtx, visited = new Set<string>()): Promise<void> {
  const stack: { nodeId: string }[] = [{ nodeId: startNodeId }];
  while (stack.length) {
    const { nodeId } = stack.shift()!;
    const visitKey = nodeId;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    const node = ctx.flow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Special handling for loop / try-catch
    if (node.type === "logic.loop") {
      const times = Math.max(0, Number(node.data.times) || 0);
      const bodyEdges = nextEdges(ctx.flow.edges, node.id, "body");
      for (let i = 0; i < times; i++) {
        ctx.variables.i = i;
        for (const e of bodyEdges) {
          await walk(e.target, ctx, new Set()); // fresh visited per loop iteration
        }
      }
      const doneEdges = nextEdges(ctx.flow.edges, node.id, "done");
      for (const e of doneEdges) stack.push({ nodeId: e.target });
      continue;
    }
    if (node.type === "logic.foreach") {
      const list = makeResolver({ ...ctx.variables, config: ctx.config })(String(node.data.list ?? ""))
        .split(",").map((s) => s.trim()).filter(Boolean);
      const bodyEdges = nextEdges(ctx.flow.edges, node.id, "body");
      for (let i = 0; i < list.length; i++) {
        ctx.variables.i = i; ctx.variables.item = list[i];
        for (const e of bodyEdges) await walk(e.target, ctx, new Set());
      }
      for (const e of nextEdges(ctx.flow.edges, node.id, "done")) stack.push({ nodeId: e.target });
      continue;
    }
    if (node.type === "logic.tryCatch") {
      const tryEdges = nextEdges(ctx.flow.edges, node.id, "try");
      try {
        for (const e of tryEdges) await walk(e.target, ctx, new Set(visited));
      } catch (err) {
        if ((err as Error).message === "__STOP__") throw err;
        ctx.variables.error = (err as Error).message;
        for (const e of nextEdges(ctx.flow.edges, node.id, "catch")) stack.push({ nodeId: e.target });
      }
      continue;
    }

    let outHandle: string | undefined;
    try {
      outHandle = await execNode(node, ctx);
    } catch (e) {
      if ((e as Error).message === "__STOP__") return;
      ctx.log("error", `Node failed: ${(e as Error).message}`, node.id, node.type);
    }

    let next = nextEdges(ctx.flow.edges, node.id, outHandle);
    if (!outHandle && next.length === 0) next = nextEdges(ctx.flow.edges, node.id);
    for (const e of next) stack.push({ nodeId: e.target });
  }
}

export interface RunOptions {
  project: Project;
  flow: Flow;
  startNodeId?: string;
  triggerPayload?: Record<string, unknown>;
  onLog: (e: LogEntry) => void;
  onDiscordEvent?: (e: DiscordEvent) => void;
}

/**
 * Execute the flow. If startNodeId is omitted, every trigger in the flow is
 * executed sequentially with its own variable scope (so multiple triggers
 * don't bleed into each other).
 */
export async function runFlow(opts: RunOptions): Promise<void> {
  const { project, flow, onLog, onDiscordEvent } = opts;
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(project.config); } catch { /* ignore */ }
  const baseVars: Record<string, unknown> = {
    ...Object.fromEntries(project.variables.map((v) => [v.name, v.value])),
  };

  const log = (level: LogEntry["level"], message: string, nodeId?: string, nodeType?: string, data?: unknown) =>
    onLog({ ts: Date.now(), level, message, nodeId, nodeType, data });

  const triggers = opts.startNodeId
    ? flow.nodes.filter((n) => n.id === opts.startNodeId)
    : flow.nodes.filter((n) => n.type.startsWith("trigger."));

  if (triggers.length === 0) {
    log("error", "No trigger / start node found");
    return;
  }

  const storage: Record<string, unknown> = {};
  const cooldowns: Record<string, number> = {};

  for (const trigger of triggers) {
    log("info", `── Running trigger: ${trigger.type} (${trigger.id}) ──`);
    const variables: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      username: "tester", userId: "1", message: "hi",
      ...baseVars,
      ...(opts.triggerPayload || {}),
    };
    const ctx: RunCtx = {
      project, flow, variables, config, storage, cooldowns,
      log, emit: onDiscordEvent,
    };

    if (trigger.type === "trigger.messageCreate") {
      const content = String(variables.message || (trigger.data as Record<string, unknown>).match || "");
      if (content && onDiscordEvent) {
        onDiscordEvent({
          ts: Date.now(), kind: "user-message",
          author: { name: String(variables.username || "user"), color: "#5865F2" },
          message: { type: "text", content },
        });
      }
    }

    try {
      await walk(trigger.id, ctx);
    } catch (e) {
      if ((e as Error).message !== "__STOP__") log("error", `Flow crashed: ${(e as Error).message}`);
    }
  }
  log("info", "Flow finished");
}
