import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Project } from "./types";

const PACKAGE_JSON = (name: string) => JSON.stringify({
  name: name.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "discord-bot",
  version: "1.0.0",
  type: "commonjs",
  main: "index.js",
  scripts: { start: "node index.js" },
  dependencies: {
    "discord.js": "^14.16.3",
    "node-cron": "^3.0.3",
  },
}, null, 2);

const README = `# Generated Discord Bot

Built with the No-Code Discord Bot Builder.

## Run

1. Open \`config.json\` and paste your bot token.
2. Install deps:
   \`\`\`bash
   npm install
   \`\`\`
3. Start:
   \`\`\`bash
   node index.js
   \`\`\`

The token is read from the path configured in \`bot.tokenPath\`. You may also
set \`DISCORD_TOKEN\` in your environment as a fallback.
`;

const ENGINE_CONTEXT = `// engine/context.js
const fs = require("fs");
const path = require("path");

function getPath(obj, p) {
  if (!p) return obj;
  const parts = p.replace(/\\[(\\d+)\\]/g, ".$1").split(".").filter(Boolean);
  let cur = obj;
  for (const k of parts) { if (cur == null) return undefined; cur = cur[k]; }
  return cur;
}

function makeResolver(scope) {
  return (str) => {
    if (typeof str !== "string") return str;
    return str.replace(/\\$\\{([^}]+)\\}/g, (_, expr) => {
      const v = getPath(scope, expr.trim());
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    });
  };
}

const STORE_FILE = path.join(__dirname, "..", "storage", "store.json");
function loadStore() { try { return JSON.parse(fs.readFileSync(STORE_FILE, "utf8")); } catch { return {}; } }
function saveStore(s) { fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true }); fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2)); }

const cooldowns = new Map();

function makeCtx({ client, config, payload, interaction, message, member }) {
  const variables = { timestamp: new Date().toISOString(), ...(payload || {}) };
  const scope = () => ({ ...variables, config });
  const resolve = (s) => makeResolver(scope())(s);
  let pendingComponents = [];

  return {
    variables, config, client, message, interaction, member,
    log: (level, msg) => console.log("[" + level + "]", msg),
    setVar: (k, v) => { variables[k] = resolve(String(v)); },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    compare(left, op, right) {
      const L = resolve(String(left)), R = resolve(String(right));
      switch (op) {
        case "equals": return L === R;
        case "neq": return L !== R;
        case "contains": return L.includes(R);
        case "startsWith": return L.startsWith(R);
        case "endsWith": return L.endsWith(R);
        case "regex": try { return new RegExp(R).test(L); } catch { return false; }
        case "gt": return Number(L) > Number(R);
        case "lt": return Number(L) < Number(R);
        default: return false;
      }
    },
    addComponent(c) { pendingComponents.push(c); },
    flushComponents() { const c = pendingComponents; pendingComponents = []; return c; },
    async sendMessage(channelId, content) {
      const ch = await client.channels.fetch(resolve(channelId) || (message && message.channelId));
      if (ch && ch.send) await ch.send(resolve(content));
    },
    async sendEmbed(channelId, embed) {
      const ch = await client.channels.fetch(resolve(channelId) || (message && message.channelId));
      if (ch && ch.send) {
        const color = parseInt(String(resolve(embed.color || "#5865F2")).replace("#", ""), 16);
        await ch.send({ embeds: [{ title: resolve(embed.title), description: resolve(embed.description), color }] });
      }
    },
    async reply(content) { if (message) await message.reply(resolve(content)); },
    async dm(userId, content) {
      const u = await client.users.fetch(resolve(userId));
      if (u) await u.send(resolve(content));
    },
    async ban(userId, reason) { if (message?.guild) await message.guild.bans.create(resolve(userId), { reason: resolve(reason) }); },
    async kick(userId, reason) { if (message?.guild) { const m = await message.guild.members.fetch(resolve(userId)); if (m) await m.kick(resolve(reason)); } },
    async timeout(userId, ms) { if (message?.guild) { const m = await message.guild.members.fetch(resolve(userId)); if (m) await m.timeout(ms); } },
    async addRole(userId, roleId) { if (message?.guild) { const m = await message.guild.members.fetch(resolve(userId)); if (m) await m.roles.add(resolve(roleId)); } },
    async iReply(content, ephemeral) { if (interaction) await interaction.reply({ content: resolve(content), ephemeral: !!ephemeral }); },
    async api(method, url, headers, body, extract) {
      const res = await fetch(resolve(url), {
        method,
        headers: JSON.parse(resolve(headers || "{}")),
        body: method === "GET" ? undefined : resolve(body),
      });
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = text; }
      String(extract || "").split("\\n").filter(Boolean).forEach((line) => {
        const [n, p] = line.split("=").map((s) => s.trim());
        if (n && p) variables[n] = getPath(json, p);
      });
      return res.ok;
    },
    randomKey({ length, upper, lower, numbers, symbols, varName }) {
      const sets = [];
      if (upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (lower) sets.push("abcdefghijklmnopqrstuvwxyz");
      if (numbers) sets.push("0123456789");
      if (symbols) sets.push("!@#$%^&*()-_=+");
      const chars = sets.join("") || "abcdefghijklmnopqrstuvwxyz";
      let out = ""; for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
      variables[varName] = out;
    },
    async storeSet(k, v) { const s = loadStore(); s[resolve(k)] = resolve(v); saveStore(s); },
    async storeGet(k, varName) { const s = loadStore(); variables[varName] = s[resolve(k)]; },
    cooldown(key, ms) {
      const id = (interaction?.user?.id || message?.author?.id || "anon") + ":" + key;
      const now = Date.now();
      const last = cooldowns.get(id) || 0;
      if (now - last < ms) return false;
      cooldowns.set(id, now); return true;
    },
    async transcript(channelId, format, destType, destId, limit) {
      const ch = await client.channels.fetch(resolve(channelId));
      if (!ch) return;
      const msgs = await ch.messages.fetch({ limit });
      const arr = Array.from(msgs.values()).reverse();
      let body;
      if (format === "html") {
        body = "<html><body style='font-family:sans-serif'>" +
          arr.map((m) => "<div><b>" + m.author.tag + "</b> <small>" + new Date(m.createdTimestamp).toISOString() + "</small><br/>" + (m.content || "") + "</div>").join("<hr/>") +
          "</body></html>";
      } else {
        body = arr.map((m) => "[" + new Date(m.createdTimestamp).toISOString() + "] " + m.author.tag + ": " + m.content).join("\\n");
      }
      const filename = "transcript-" + Date.now() + (format === "html" ? ".html" : ".txt");
      const buffer = Buffer.from(body, "utf8");
      if (destType === "channel") {
        const dch = await client.channels.fetch(resolve(destId));
        await dch.send({ files: [{ attachment: buffer, name: filename }] });
      } else {
        const u = await client.users.fetch(resolve(destId));
        await u.send({ files: [{ attachment: buffer, name: filename }] });
      }
    },
  };
}

module.exports = { makeCtx, getPath };
`;

const ENGINE_EXECUTOR = `// engine/executor.js
function nextEdges(edges, nodeId, handle) {
  return edges.filter((e) => e.source === nodeId && (handle ? e.sourceHandle === handle : true));
}

async function runFlow(flow, startNodeId, ctx) {
  const visited = new Set();
  const queue = [{ nodeId: startNodeId }];
  while (queue.length) {
    const { nodeId } = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    let branch;
    try {
      branch = await runNode(node, ctx);
    } catch (err) {
      console.error("[node " + node.id + " (" + node.type + ")] error:", err.message);
      branch = "err";
    }
    let outs = nextEdges(flow.edges, node.id, branch);
    if (outs.length === 0 && !branch) outs = nextEdges(flow.edges, node.id);
    for (const e of outs) queue.push({ nodeId: e.target });
  }
}

async function runNode(node, ctx) {
  const d = node.data || {};
  const r = (k) => {
    const v = d[k];
    return typeof v === "string" ? v : (v == null ? "" : String(v));
  };
  switch (node.type) {
    case "trigger.messageCreate":
    case "trigger.messageUpdate":
    case "trigger.messageDelete":
    case "trigger.guildMemberAdd":
    case "trigger.slashCommand":
    case "trigger.buttonInteraction":
    case "trigger.selectMenuInteraction":
    case "trigger.scheduled":
    case "trigger.webhook":
    case "trigger.manual":
      return;
    case "condition.if": return ctx.compare(r("left"), d.op, r("right")) ? "true" : "false";
    case "condition.switch": {
      const v = ctx.variables.__resolveStr ? ctx.variables.__resolveStr(r("value")) : r("value");
      if (v === r("case1")) return "case1";
      if (v === r("case2")) return "case2";
      if (v === r("case3")) return "case3";
      return "default";
    }
    case "delay.wait": await ctx.sleep(Number(d.ms) || 0); return;
    case "delay.cooldown": return ctx.cooldown(r("key"), Number(d.ms) || 0) ? "ok" : "blocked";
    case "action.sendMessage": await ctx.sendMessage(r("channelId"), r("content")); return;
    case "action.sendEmbed": await ctx.sendEmbed(r("channelId"), { title: r("title"), description: r("description"), color: r("color") }); return;
    case "action.reply": await ctx.reply(r("content")); return;
    case "action.dm": await ctx.dm(r("userId"), r("content")); return;
    case "action.ban": await ctx.ban(r("userId"), r("reason")); return;
    case "action.kick": await ctx.kick(r("userId"), r("reason")); return;
    case "action.timeout": await ctx.timeout(r("userId"), Number(d.duration) || 60000); return;
    case "action.addRole": await ctx.addRole(r("userId"), r("roleId")); return;
    case "interaction.reply": await ctx.iReply(r("content"), !!d.ephemeral); return;
    case "api.request": {
      const ok = await ctx.api(d.method || "GET", r("url"), r("headers"), r("body"), r("extract"));
      return ok ? "ok" : "err";
    }
    case "utility.randomKey":
      ctx.randomKey({ length: Number(d.length) || 16, upper: !!d.upper, lower: !!d.lower, numbers: !!d.numbers, symbols: !!d.symbols, varName: r("varName") || "key" });
      return;
    case "utility.setVariable": ctx.setVar(r("name"), r("value")); return;
    case "utility.log": ctx.log("info", r("message")); return;
    case "utility.accessControl": {
      if (!d.enabled) return "ok";
      const ids = String(d.userIds || "").split(",").map((s) => s.trim()).filter(Boolean);
      const uid = ctx.interaction?.user?.id || ctx.message?.author?.id;
      return ids.includes(uid) ? "ok" : "denied";
    }
    case "storage.set": await ctx.storeSet(r("key"), r("value")); return;
    case "storage.get": await ctx.storeGet(r("key"), r("varName")); return;
    case "utility.transcript": await ctx.transcript(r("channelId"), d.format || "html", d.destType || "channel", r("destId"), Number(d.limit) || 100); return;
    default: ctx.log("warn", "Unhandled node type " + node.type); return;
  }
}

module.exports = { runFlow };
`;

const INDEX_JS = `// index.js — Generated Discord bot
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require("discord.js");
const cron = require("node-cron");
const { makeCtx, getPath } = require("./engine/context");
const { runFlow } = require("./engine/executor");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const tokenPath = config.bot && config.bot.tokenPath ? config.bot.tokenPath : "config.bot.token";
function resolveToken() {
  const v = getPath({ config }, tokenPath);
  return v || process.env.DISCORD_TOKEN;
}

const flowsDir = path.join(__dirname, "flows");
const flows = fs.readdirSync(flowsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(flowsDir, f), "utf8")))
  .filter((f) => f.enabled !== false);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

function findTriggers(type) {
  const out = [];
  for (const flow of flows) {
    for (const node of flow.nodes) if (node.type === type) out.push({ flow, node });
  }
  return out;
}

client.once("ready", async () => {
  console.log("Logged in as " + client.user.tag);

  // register slash commands
  const slash = findTriggers("trigger.slashCommand");
  if (slash.length) {
    const rest = new REST({ version: "10" }).setToken(resolveToken());
    const cmds = slash.map(({ node }) => new SlashCommandBuilder()
      .setName(String(node.data.name || "cmd").toLowerCase())
      .setDescription(String(node.data.description || "No description")).toJSON());
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
      console.log("Registered " + cmds.length + " slash commands");
    } catch (e) { console.error("Slash register failed:", e.message); }
  }

  // schedule cron triggers
  for (const { flow, node } of findTriggers("trigger.scheduled")) {
    const expr = String(node.data.cron || "*/5 * * * *");
    if (cron.validate(expr)) {
      cron.schedule(expr, async () => {
        const ctx = makeCtx({ client, config });
        try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
      });
      console.log("Scheduled flow " + flow.name + " on " + expr);
    }
  }
});

function matchMessage(node, content) {
  const m = node.data.match;
  if (!m) return true;
  switch (node.data.matchMode || "equals") {
    case "equals": return content === m;
    case "contains": return content.includes(m);
    case "startsWith": return content.startsWith(m);
    case "regex": try { return new RegExp(m).test(content); } catch { return false; }
    default: return content === m;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  for (const { flow, node } of findTriggers("trigger.messageCreate")) {
    if (!matchMessage(node, message.content)) continue;
    const payload = {
      username: message.author.username,
      userId: message.author.id,
      channelId: message.channelId,
      message: message.content,
    };
    const ctx = makeCtx({ client, config, payload, message });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("guildMemberAdd", async (member) => {
  for (const { flow, node } of findTriggers("trigger.guildMemberAdd")) {
    const payload = { username: member.user.username, userId: member.id };
    const ctx = makeCtx({ client, config, payload, member });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      for (const { flow, node } of findTriggers("trigger.slashCommand")) {
        if (String(node.data.name || "").toLowerCase() === interaction.commandName) {
          const payload = { username: interaction.user.username, userId: interaction.user.id, channelId: interaction.channelId };
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    } else if (interaction.isButton()) {
      for (const { flow, node } of findTriggers("trigger.buttonInteraction")) {
        if (node.data.customId === interaction.customId) {
          const payload = { username: interaction.user.username, userId: interaction.user.id };
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      for (const { flow, node } of findTriggers("trigger.selectMenuInteraction")) {
        if (node.data.customId === interaction.customId) {
          const payload = { username: interaction.user.username, userId: interaction.user.id, values: interaction.values };
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    }
  } catch (e) { console.error("Interaction error:", e.message); }
});

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e));
process.on("uncaughtException", (e) => console.error("[uncaughtException]", e));

const token = resolveToken();
if (!token) { console.error("No token found at " + tokenPath); process.exit(1); }
client.login(token);
`;

export async function exportProjectAsZip(project: Project) {
  const zip = new JSZip();
  zip.file("package.json", PACKAGE_JSON(project.name));
  zip.file("README.md", README);

  // Inject tokenPath into config under bot.tokenPath
  let cfgObj: Record<string, unknown> = {};
  try { cfgObj = JSON.parse(project.config); } catch { cfgObj = {}; }
  const bot = (cfgObj.bot as Record<string, unknown>) || {};
  bot.tokenPath = project.tokenPath;
  cfgObj.bot = bot;
  zip.file("config.json", JSON.stringify(cfgObj, null, 2));

  zip.file("index.js", INDEX_JS);
  zip.file("engine/context.js", ENGINE_CONTEXT);
  zip.file("engine/executor.js", ENGINE_EXECUTOR);
  zip.file("storage/store.json", "{}");

  for (const flow of project.flows) {
    const safe = flow.name.replace(/[^a-z0-9-]+/gi, "_") || flow.id;
    zip.file(`flows/${safe}.json`, JSON.stringify(flow, null, 2));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${project.name.replace(/[^a-z0-9-]+/gi, "_") || "discord-bot"}.zip`);
}