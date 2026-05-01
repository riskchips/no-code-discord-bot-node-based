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

1. Open \`config.json\` and paste your bot token under the configured token path
   (default: \`bot.token\`).
2. Install deps:
   \`\`\`bash
   npm install
   \`\`\`
3. Start:
   \`\`\`bash
   node index.js
   \`\`\`

You can also set \`DISCORD_TOKEN\` in your environment as a fallback.
`;

const ENGINE_CONTEXT = `// engine/context.js
const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder,
  ChannelType, PermissionFlagsBits,
} = require("discord.js");

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

const COOLDOWNS = new Map();

const BUTTON_STYLE_MAP = {
  Primary: ButtonStyle.Primary, Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success, Danger: ButtonStyle.Danger, Link: ButtonStyle.Link,
};

function safeJSON(s, fallback) {
  if (s == null || s === "") return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

function buildButtonsRows(buttons, resolve) {
  if (!Array.isArray(buttons) || !buttons.length) return [];
  // Backward-compat: flat array of buttons → single row
  const rows = (typeof buttons[0] === "object" && buttons[0] !== null && !Array.isArray(buttons[0]))
    ? [buttons]
    : buttons;
  const out = [];
  for (const r of rows.slice(0, 5)) {
    if (!Array.isArray(r) || !r.length) continue;
    const row = new ActionRowBuilder();
    for (const b of r.slice(0, 5)) {
      const style = BUTTON_STYLE_MAP[b.style] || ButtonStyle.Primary;
      const btn = new ButtonBuilder()
        .setLabel(resolve(String(b.label || "Button")).slice(0, 80))
        .setStyle(style).setDisabled(!!b.disabled);
      if (style === ButtonStyle.Link) btn.setURL(resolve(String(b.url || "https://discord.com")));
      else btn.setCustomId(resolve(String(b.customId || "btn")));
      if (b.emoji) { try { btn.setEmoji(resolve(String(b.emoji))); } catch {} }
      row.addComponents(btn);
    }
    if (row.components.length) out.push(row);
  }
  return out;
}

function buildSelectMenuRow(menu, resolve) {
  if (!menu || !menu.customId) return null;
  const row = new ActionRowBuilder();
  const id = resolve(String(menu.customId));
  const placeholder = resolve(String(menu.placeholder || "Choose…"));
  const min = Number(menu.min || 1), max = Number(menu.max || 1);
  let select;
  switch (menu.kind) {
    case "user": select = new UserSelectMenuBuilder(); break;
    case "role": select = new RoleSelectMenuBuilder(); break;
    case "channel": select = new ChannelSelectMenuBuilder(); break;
    default: {
      select = new StringSelectMenuBuilder();
      const opts = Array.isArray(menu.options) ? menu.options : [];
      for (const o of opts.slice(0, 25)) {
        select.addOptions({
          label: resolve(String(o.label || "Option")).slice(0, 100),
          value: resolve(String(o.value || "v")).slice(0, 100),
          description: o.description ? resolve(String(o.description)).slice(0, 100) : undefined,
        });
      }
    }
  }
  select.setCustomId(id).setPlaceholder(placeholder.slice(0, 150)).setMinValues(min).setMaxValues(max);
  row.addComponents(select);
  return row;
}

function buildPayload(opts, resolve) {
  const { messageType, content, embedTitle, embedColor, embedImage, embedFooter, buttons, selectMenu, mention } = opts;
  const payload = {};
  if (messageType === "embed") {
    const embed = new EmbedBuilder();
    if (embedTitle) embed.setTitle(resolve(String(embedTitle)).slice(0, 256));
    if (content) embed.setDescription(resolve(String(content)).slice(0, 4000));
    const hex = resolve(String(embedColor || "#5865F2")).replace("#", "");
    const colorInt = parseInt(hex, 16);
    if (!isNaN(colorInt)) embed.setColor(colorInt);
    if (embedImage) { try { embed.setImage(resolve(String(embedImage))); } catch {} }
    if (embedFooter) embed.setFooter({ text: resolve(String(embedFooter)).slice(0, 2048) });
    payload.embeds = [embed];
  } else {
    payload.content = resolve(String(content || ""));
  }
  const rows = [];
  rows.push(...buildButtonsRows(safeJSON(buttons, []), resolve));
  const menu = safeJSON(selectMenu, null);
  const menuRow = buildSelectMenuRow(menu, resolve);
  if (menuRow) rows.push(menuRow);
  if (rows.length) payload.components = rows;
  if (mention === false) payload.allowedMentions = { repliedUser: false };
  return payload;
}

function safeMath(expr) {
  if (!/^[\\d+\\-*/%(). ]+$/.test(expr)) throw new Error("Unsafe expression");
  return Function("return (" + expr + ")")();
}

function makeCtx({ client, config, payload, interaction, message, member, reaction }) {
  const variables = { timestamp: new Date().toISOString(), ...(payload || {}) };
  const scope = () => ({ ...variables, config });
  const resolve = (s) => makeResolver(scope())(s);
  const guild = (message && message.guild) || (interaction && interaction.guild) || (member && member.guild);

  return {
    variables, config, client, message, interaction, member, reaction, guild,
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
        case "empty": return !L;
        case "notEmpty": return !!L;
        default: return false;
      }
    },
    async sendMessage(opts) {
      const ch = await client.channels.fetch(resolve(opts.channelId) || (message && message.channelId) || (interaction && interaction.channelId));
      if (ch && ch.send) {
        const sent = await ch.send(buildPayload(opts, resolve));
        if (opts.saveAs) variables[opts.saveAs] = sent.id;
      }
    },
    async reply(opts) {
      if (!message) return;
      const p = buildPayload(opts, resolve);
      if (!opts.mention) p.allowedMentions = { repliedUser: !!opts.mention };
      await message.reply(p);
    },
    async editMessage(channelId, messageId, content) {
      const ch = await client.channels.fetch(resolve(channelId));
      const msg = await ch.messages.fetch(resolve(messageId));
      await msg.edit(resolve(content));
    },
    async deleteMessage(channelId, messageId) {
      const ch = await client.channels.fetch(resolve(channelId));
      const msg = await ch.messages.fetch(resolve(messageId));
      await msg.delete();
    },
    async bulkDelete(channelId, count) {
      const ch = await client.channels.fetch(resolve(channelId));
      await ch.bulkDelete(Math.min(Math.max(count, 1), 100), true);
    },
    async addReaction(channelId, messageId, emoji) {
      const ch = await client.channels.fetch(resolve(channelId));
      const msg = await ch.messages.fetch(resolve(messageId));
      await msg.react(resolve(emoji));
    },
    async dm(opts) {
      const u = await client.users.fetch(resolve(opts.userId));
      if (u) await u.send(buildPayload(opts, resolve));
    },
    async typing(channelId) {
      const ch = await client.channels.fetch(resolve(channelId) || (message && message.channelId));
      if (ch && ch.sendTyping) await ch.sendTyping();
    },
    async pinMessage(channelId, messageId) {
      const ch = await client.channels.fetch(resolve(channelId));
      const msg = await ch.messages.fetch(resolve(messageId));
      await msg.pin();
    },
    async ban(userId, reason) { if (guild) await guild.bans.create(resolve(userId), { reason: resolve(reason) }); },
    async unban(userId) { if (guild) await guild.bans.remove(resolve(userId)); },
    async kick(userId, reason) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.kick(resolve(reason)); } },
    async timeout(userId, ms) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.timeout(ms); } },
    async removeTimeout(userId) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.timeout(null); } },
    async setNickname(userId, nick) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.setNickname(resolve(nick)); } },
    async addRole(userId, roleId) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.roles.add(resolve(roleId)); } },
    async removeRole(userId, roleId) { if (guild) { const m = await guild.members.fetch(resolve(userId)); if (m) await m.roles.remove(resolve(roleId)); } },
    async createRole(opts) {
      if (!guild) return;
      const perms = String(opts.permissions || "").split(",").map((s) => s.trim()).filter(Boolean)
        .map((n) => PermissionFlagsBits[n]).filter(Boolean);
      const hex = resolve(String(opts.color || "#99AAB5")).replace("#", "");
      const role = await guild.roles.create({
        name: resolve(opts.name),
        color: parseInt(hex, 16) || 0,
        hoist: !!opts.hoist, mentionable: !!opts.mentionable,
        permissions: perms,
      });
      if (opts.saveAs) variables[opts.saveAs] = role.id;
    },
    async deleteRole(roleId) { if (guild) { const r = await guild.roles.fetch(resolve(roleId)); if (r) await r.delete(); } },
    async editRole(roleId, name, color) {
      if (!guild) return;
      const r = await guild.roles.fetch(resolve(roleId));
      if (!r) return;
      const patch = {};
      if (name) patch.name = resolve(name);
      if (color) { const hex = resolve(color).replace("#",""); patch.color = parseInt(hex, 16) || 0; }
      await r.edit(patch);
    },
    async createChannel(opts) {
      if (!guild) return;
      const typeMap = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, category: ChannelType.GuildCategory, announcement: ChannelType.GuildAnnouncement, forum: ChannelType.GuildForum };
      const ch = await guild.channels.create({
        name: resolve(opts.name),
        type: typeMap[opts.channelType] ?? ChannelType.GuildText,
        parent: opts.categoryId ? resolve(opts.categoryId) : undefined,
        topic: opts.topic ? resolve(opts.topic) : undefined,
      });
      if (opts.saveAs) variables[opts.saveAs] = ch.id;
    },
    async deleteChannel(channelId) {
      const ch = await client.channels.fetch(resolve(channelId));
      if (ch) await ch.delete();
    },
    async editChannel(channelId, name, topic) {
      const ch = await client.channels.fetch(resolve(channelId));
      if (!ch) return;
      const patch = {};
      if (name) patch.name = resolve(name);
      if (topic && ch.setTopic) patch.topic = resolve(topic);
      await ch.edit(patch);
    },
    async createThread(opts) {
      const ch = await client.channels.fetch(resolve(opts.channelId));
      if (!ch || !ch.threads) return;
      const thread = opts.messageId
        ? await (await ch.messages.fetch(resolve(opts.messageId))).startThread({ name: resolve(opts.name) })
        : await ch.threads.create({ name: resolve(opts.name) });
      if (opts.saveAs) variables[opts.saveAs] = thread.id;
    },
    async archiveThread(threadId) {
      const t = await client.channels.fetch(resolve(threadId));
      if (t && t.setArchived) await t.setArchived(true);
    },
    async setPresence(status, activityType, activityText) {
      try {
        const ActivityType = require("discord.js").ActivityType;
        const typeMap = { Playing: ActivityType.Playing, Watching: ActivityType.Watching, Listening: ActivityType.Listening, Competing: ActivityType.Competing, Custom: ActivityType.Custom };
        client.user.setPresence({
          status: status || "online",
          activities: activityText ? [{ name: resolve(String(activityText)), type: typeMap[activityType] ?? ActivityType.Playing }] : [],
        });
      } catch (e) { console.error("setPresence:", e.message); }
    },
    async refreshSlashCommands(scope) {
      try {
        if (typeof globalThis.__refreshSlashCommands === "function") {
          await globalThis.__refreshSlashCommands(scope === "guild" ? (guild && guild.id) : null);
        }
      } catch (e) { console.error("refreshSlash:", e.message); }
    },
    async fetchUser(userId, saveAs) {
      const u = await client.users.fetch(resolve(userId));
      if (u && saveAs) variables[saveAs] = u.username;
      if (u) { variables.fetchedUserId = u.id; variables.fetchedUserTag = u.tag; }
    },
    async sendFile(channelId, url, filename, content) {
      const ch = await client.channels.fetch(resolve(channelId) || (message && message.channelId) || (interaction && interaction.channelId));
      if (!ch || !ch.send) return;
      const u = resolve(url);
      const opts = { files: [filename ? { attachment: u, name: resolve(filename) } : u] };
      if (content) opts.content = resolve(content);
      await ch.send(opts);
    },
    async iReply(opts) {
      if (!interaction) return;
      const p = buildPayload(opts, resolve);
      p.ephemeral = !!opts.ephemeral;
      if (interaction.replied || interaction.deferred) await interaction.followUp(p);
      else await interaction.reply(p);
    },
    async deferReply(ephemeral) {
      if (interaction && !interaction.replied && !interaction.deferred) await interaction.deferReply({ ephemeral: !!ephemeral });
    },
    async showModal(opts) {
      if (!interaction || typeof interaction.showModal !== "function") return;
      const modal = new ModalBuilder()
        .setCustomId(resolve(String(opts.customId)))
        .setTitle(resolve(String(opts.title || "Form")).slice(0, 45));
      const fields = safeJSON(opts.fields, []);
      for (const f of (Array.isArray(fields) ? fields : []).slice(0, 5)) {
        const input = new TextInputBuilder()
          .setCustomId(String(f.customId || "field"))
          .setLabel(resolve(String(f.label || "Question")).slice(0, 45))
          .setStyle(f.style === "Paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(f.required !== false);
        if (f.placeholder) input.setPlaceholder(resolve(String(f.placeholder)).slice(0, 100));
        if (f.minLength != null) input.setMinLength(Number(f.minLength));
        if (f.maxLength != null) input.setMaxLength(Math.min(Number(f.maxLength), 4000));
        modal.addComponents(new ActionRowBuilder().addComponents(input));
      }
      await interaction.showModal(modal);
    },
    async api(method, url, headers, body, extract) {
      const res = await fetch(resolve(url), {
        method,
        headers: safeJSON(resolve(headers || "{}"), {}),
        body: method === "GET" ? undefined : (body ? resolve(body) : undefined),
      });
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = text; }
      String(extract || "").split("\\n").filter(Boolean).forEach((line) => {
        const [n, p] = line.split("=").map((s) => s.trim());
        if (n && p) variables[n] = getPath(json, p);
      });
      return res.ok;
    },
    async webhook(url, content, username) {
      const res = await fetch(resolve(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: resolve(content), username: username ? resolve(username) : undefined }),
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
    randomNumber(min, max, varName) { variables[varName] = Math.floor(Math.random() * (max - min + 1)) + min; },
    randomChoice(list, varName) {
      const arr = String(list || "").split(",").map((s) => s.trim()).filter(Boolean);
      variables[varName] = arr[Math.floor(Math.random() * arr.length)] || "";
    },
    math(expr, varName) { try { variables[varName] = safeMath(resolve(expr)); } catch (e) { console.error(e.message); } },
    string(input, op, a1, a2, varName) {
      const i = resolve(input); const A1 = resolve(a1 || ""); const A2 = resolve(a2 || "");
      let v = i;
      if (op === "upper") v = i.toUpperCase();
      else if (op === "lower") v = i.toLowerCase();
      else if (op === "trim") v = i.trim();
      else if (op === "replace") v = i.split(A1).join(A2);
      else if (op === "slice") v = i.slice(Number(A1)||0, A2 ? Number(A2) : undefined);
      else if (op === "length") v = i.length;
      else if (op === "reverse") v = i.split("").reverse().join("");
      variables[varName] = v;
    },
    json(input, p, varName) {
      try { const o = JSON.parse(resolve(input)); variables[varName] = p ? getPath(o, resolve(p)) : o; }
      catch (e) { console.error("JSON:", e.message); }
    },
    timestamp(format, varName) {
      const now = new Date();
      let v = now.toISOString();
      if (format === "unix") v = Math.floor(now.getTime()/1000);
      else if (format === "unixms") v = now.getTime();
      else if (format === "discord") v = "<t:" + Math.floor(now.getTime()/1000) + ":F>";
      else if (format === "locale") v = now.toLocaleString();
      variables[varName] = v;
    },
    cooldown(key, seconds) {
      const k = resolve(key) || "global";
      const last = COOLDOWNS.get(k) || 0;
      const now = Date.now();
      if (now - last < seconds * 1000) return false;
      COOLDOWNS.set(k, now);
      return true;
    },
    accessControl(enabled, userIds, roleIds) {
      if (!enabled) return true;
      const uid = (interaction && interaction.user && interaction.user.id) || (message && message.author && message.author.id) || "";
      const memberRoles = (interaction && interaction.member && interaction.member.roles && interaction.member.roles.cache) || (message && message.member && message.member.roles && message.member.roles.cache) || null;
      const userOk = String(userIds || "").split(",").map((s) => s.trim()).filter(Boolean).includes(uid);
      let roleOk = false;
      if (memberRoles) {
        const allowed = String(roleIds || "").split(",").map((s) => s.trim()).filter(Boolean);
        roleOk = allowed.some((r) => memberRoles.has(r));
      }
      const hasUserList = !!String(userIds || "").trim();
      const hasRoleList = !!String(roleIds || "").trim();
      if (!hasUserList && !hasRoleList) return true;
      return userOk || roleOk;
    },
    async storeSet(k, v) { const s = loadStore(); s[resolve(k)] = resolve(v); saveStore(s); },
    async storeGet(k, varName) { const s = loadStore(); variables[varName] = s[resolve(k)]; },
    async storeDelete(k) { const s = loadStore(); delete s[resolve(k)]; saveStore(s); },
    async storeIncrement(k, by, varName) {
      const s = loadStore();
      const key = resolve(k);
      const n = (Number(s[key]) || 0) + by;
      s[key] = n; saveStore(s);
      variables[varName] = n;
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

async function walk(flow, startNodeId, ctx, visited) {
  visited = visited || new Set();
  const queue = [{ nodeId: startNodeId }];
  while (queue.length) {
    const { nodeId } = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    if (node.type === "logic.loop") {
      const times = Math.max(0, Number(node.data.times) || 0);
      const bodyEdges = nextEdges(flow.edges, node.id, "body");
      for (let i = 0; i < times; i++) {
        ctx.variables.i = i;
        for (const e of bodyEdges) await walk(flow, e.target, ctx, new Set());
      }
      for (const e of nextEdges(flow.edges, node.id, "done")) queue.push({ nodeId: e.target });
      continue;
    }
    if (node.type === "logic.foreach") {
      const list = String(node.data.list || "").replace(/\\\${([^}]+)}/g, (_, k) => String(ctx.variables[k.trim()] ?? ""))
        .split(",").map((s) => s.trim()).filter(Boolean);
      const bodyEdges = nextEdges(flow.edges, node.id, "body");
      for (let i = 0; i < list.length; i++) {
        ctx.variables.i = i; ctx.variables.item = list[i];
        for (const e of bodyEdges) await walk(flow, e.target, ctx, new Set());
      }
      for (const e of nextEdges(flow.edges, node.id, "done")) queue.push({ nodeId: e.target });
      continue;
    }
    if (node.type === "logic.tryCatch") {
      try {
        for (const e of nextEdges(flow.edges, node.id, "try")) await walk(flow, e.target, ctx, new Set(visited));
      } catch (err) {
        ctx.variables.error = err && err.message;
        for (const e of nextEdges(flow.edges, node.id, "catch")) queue.push({ nodeId: e.target });
      }
      continue;
    }

    let branch;
    try { branch = await runNode(node, ctx); } catch (err) {
      console.error("[node " + node.id + " (" + node.type + ")] error:", err && err.message);
      branch = "err";
    }
    if (branch === "__STOP__") return;
    let outs = nextEdges(flow.edges, node.id, branch);
    if (outs.length === 0 && !branch) outs = nextEdges(flow.edges, node.id);
    for (const e of outs) queue.push({ nodeId: e.target });
  }
}

async function runFlow(flow, startNodeId, ctx) { await walk(flow, startNodeId, ctx); }

async function runNode(node, ctx) {
  const d = node.data || {};
  const r = (k) => { const v = d[k]; return typeof v === "string" ? v : (v == null ? "" : String(v)); };
  switch (node.type) {
    case "trigger.messageCreate": case "trigger.messageDelete": case "trigger.messageUpdate":
    case "trigger.guildMemberAdd": case "trigger.guildMemberRemove":
    case "trigger.reactionAdd": case "trigger.voiceJoin": case "trigger.voiceLeave":
    case "trigger.slashCommand": case "trigger.buttonInteraction":
    case "trigger.selectMenuInteraction": case "trigger.modalSubmit":
    case "trigger.scheduled": case "trigger.manual":
      return;
    case "logic.stop": return "__STOP__";
    case "condition.if": return ctx.compare(r("left"), d.op, r("right")) ? "true" : "false";
    case "condition.switch": {
      const v = ctx.variables ? r("value") : "";
      for (const c of ["case1","case2","case3","case4"]) if (ctx.compare(r("value"), "equals", r(c))) return c;
      return "default";
    }
    case "condition.hasRole": {
      const member = ctx.member || (ctx.message && ctx.message.member) || (ctx.interaction && ctx.interaction.member);
      const roles = member && member.roles && member.roles.cache;
      return (roles && roles.has(r("roleId"))) ? "true" : "false";
    }
    case "condition.isAdmin": {
      const member = ctx.member || (ctx.message && ctx.message.member) || (ctx.interaction && ctx.interaction.member);
      return (member && member.permissions && member.permissions.has("Administrator")) ? "true" : "false";
    }
    case "condition.hasPermission": {
      const member = ctx.member || (ctx.message && ctx.message.member) || (ctx.interaction && ctx.interaction.member);
      const perm = d.permission || "";
      return (member && member.permissions && member.permissions.has(perm)) ? "true" : "false";
    }
    case "condition.isBot": {
      const u = (ctx.interaction && ctx.interaction.user) || (ctx.message && ctx.message.author) || null;
      return (u && u.bot) ? "true" : "false";
    }
    case "delay.wait": await ctx.sleep(Number(d.ms) || 0); return;

    case "action.sendMessage":
      await ctx.sendMessage({ channelId: r("channelId"), messageType: d.messageType || "text", content: r("content"), embedTitle: r("embedTitle"), embedColor: r("embedColor"), embedImage: r("embedImage"), embedFooter: r("embedFooter"), buttons: r("buttons"), selectMenu: r("selectMenu"), saveAs: r("saveAs") });
      return;
    case "action.reply":
      await ctx.reply({ messageType: d.messageType || "text", content: r("content"), embedTitle: r("embedTitle"), embedColor: r("embedColor"), embedImage: r("embedImage"), embedFooter: r("embedFooter"), buttons: r("buttons"), selectMenu: r("selectMenu"), mention: !!d.mention });
      return;
    case "action.editMessage": await ctx.editMessage(r("channelId"), r("messageId"), r("content")); return;
    case "action.deleteMessage": await ctx.deleteMessage(r("channelId"), r("messageId")); return;
    case "action.bulkDelete": await ctx.bulkDelete(r("channelId"), Number(d.count) || 10); return;
    case "action.addReaction": await ctx.addReaction(r("channelId"), r("messageId"), r("emoji")); return;
    case "action.dm":
      await ctx.dm({ userId: r("userId"), messageType: d.messageType || "text", content: r("content"), embedTitle: r("embedTitle"), embedColor: r("embedColor"), buttons: r("buttons") });
      return;
    case "action.typing": await ctx.typing(r("channelId")); return;
    case "action.pinMessage": await ctx.pinMessage(r("channelId"), r("messageId")); return;
    case "action.ban": await ctx.ban(r("userId"), r("reason")); return;
    case "action.unban": await ctx.unban(r("userId")); return;
    case "action.kick": await ctx.kick(r("userId"), r("reason")); return;
    case "action.timeout": await ctx.timeout(r("userId"), Number(d.duration) || 60000); return;
    case "action.removeTimeout": await ctx.removeTimeout(r("userId")); return;
    case "action.setNickname": await ctx.setNickname(r("userId"), r("nickname")); return;
    case "action.addRole": await ctx.addRole(r("userId"), r("roleId")); return;
    case "action.removeRole": await ctx.removeRole(r("userId"), r("roleId")); return;
    case "action.createRole":
      await ctx.createRole({ name: r("name"), color: r("color"), hoist: !!d.hoist, mentionable: !!d.mentionable, permissions: r("permissions"), saveAs: r("saveAs") });
      return;
    case "action.deleteRole": await ctx.deleteRole(r("roleId")); return;
    case "action.editRole": await ctx.editRole(r("roleId"), r("name"), r("color")); return;
    case "action.createChannel":
      await ctx.createChannel({ name: r("name"), channelType: d.channelType || "text", categoryId: r("categoryId"), topic: r("topic"), saveAs: r("saveAs") });
      return;
    case "action.deleteChannel": await ctx.deleteChannel(r("channelId")); return;
    case "action.editChannel": await ctx.editChannel(r("channelId"), r("name"), r("topic")); return;
    case "action.createThread":
      await ctx.createThread({ channelId: r("channelId"), name: r("name"), messageId: r("messageId"), saveAs: r("saveAs") });
      return;
    case "action.archiveThread": await ctx.archiveThread(r("threadId")); return;
    case "action.setPresence": await ctx.setPresence(d.status || "online", d.activityType || "Playing", r("activity")); return;
    case "action.refreshSlashCommands": await ctx.refreshSlashCommands(d.scope || "global"); return;
    case "action.fetchUser": await ctx.fetchUser(r("userId"), r("saveAs") || "fetchedUsername"); return;
    case "action.sendFile": await ctx.sendFile(r("channelId"), r("url"), r("filename"), r("content")); return;

    case "interaction.reply":
      await ctx.iReply({ messageType: d.messageType || "text", content: r("content"), embedTitle: r("embedTitle"), embedColor: r("embedColor"), embedImage: r("embedImage"), buttons: r("buttons"), selectMenu: r("selectMenu"), ephemeral: !!d.ephemeral });
      return;
    case "interaction.deferReply": await ctx.deferReply(!!d.ephemeral); return;
    case "interaction.showModal": await ctx.showModal({ customId: r("customId"), title: r("title"), fields: r("fields") }); return;

    case "api.request": {
      const ok = await ctx.api(d.method || "GET", r("url"), r("headers"), r("body"), r("extract"));
      return ok ? "ok" : "err";
    }
    case "api.webhook": { const ok = await ctx.webhook(r("url"), r("content"), r("username")); return ok ? "ok" : "err"; }

    case "utility.randomKey":
      ctx.randomKey({ length: Number(d.length) || 16, upper: !!d.upper, lower: !!d.lower, numbers: !!d.numbers, symbols: !!d.symbols, varName: r("varName") || "key" });
      return;
    case "utility.randomNumber": ctx.randomNumber(Number(d.min)||0, Number(d.max)||0, r("varName") || "n"); return;
    case "utility.randomChoice": ctx.randomChoice(r("list"), r("varName") || "choice"); return;
    case "utility.math": ctx.math(r("expr"), r("varName") || "result"); return;
    case "utility.string": ctx.string(r("input"), d.op || "upper", r("arg1"), r("arg2"), r("varName") || "out"); return;
    case "utility.json": ctx.json(r("input"), r("path"), r("varName") || "parsed"); return;
    case "utility.timestamp": ctx.timestamp(d.format || "iso", r("varName") || "now"); return;
    case "utility.setVariable": ctx.setVar(r("name"), r("value")); return;
    case "utility.log": ctx.log("info", r("message")); return;
    case "utility.accessControl": return ctx.accessControl(!!d.enabled, r("userIds"), r("roleIds")) ? "ok" : "denied";
    case "utility.cooldown": return ctx.cooldown(r("key") || "\${userId}", Number(d.seconds) || 30) ? "ok" : "blocked";

    case "storage.set": await ctx.storeSet(r("key"), r("value")); return;
    case "storage.get": await ctx.storeGet(r("key"), r("varName")); return;
    case "storage.delete": await ctx.storeDelete(r("key")); return;
    case "storage.increment": await ctx.storeIncrement(r("key"), Number(d.by) || 1, r("varName") || "count"); return;
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
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

function findTriggers(type) {
  const out = [];
  for (const flow of flows) for (const node of flow.nodes) if (node.type === type) out.push({ flow, node });
  return out;
}

const SLASH_OPT_TYPES = { string: 3, integer: 4, boolean: 5, user: 6, channel: 7, role: 8, number: 10 };

function buildSlashCommands() {
  const slash = findTriggers("trigger.slashCommand");
  return slash.map(({ node }) => {
    const b = new SlashCommandBuilder()
      .setName(String(node.data.name || "cmd").toLowerCase())
      .setDescription(String(node.data.description || "No description"));
    const lines = String(node.data.options || "").split("\\n").map((s) => s.trim()).filter(Boolean);
    const json = b.toJSON();
    json.options = lines.map((line) => {
      const [name, type, ...rest] = line.split(":");
      return { name: (name || "opt").trim(), description: (rest.join(":") || "—").trim(), type: SLASH_OPT_TYPES[(type || "string").trim()] || 3, required: false };
    });
    return json;
  });
}

globalThis.__refreshSlashCommands = async function (guildId) {
  const rest = new REST({ version: "10" }).setToken(resolveToken());
  const cmds = buildSlashCommands();
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: cmds });
    console.log("Refreshed " + cmds.length + " slash commands for guild " + guildId);
  } else {
    await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
    console.log("Refreshed " + cmds.length + " global slash commands");
  }
};

client.once("ready", async () => {
  console.log("Logged in as " + client.user.tag);
  if (findTriggers("trigger.slashCommand").length) {
    try { await globalThis.__refreshSlashCommands(null); }
    catch (e) { console.error("Slash register failed:", e.message); }
  }

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

function memberPayload(m) {
  const roles = m && m.roles && m.roles.cache ? Array.from(m.roles.cache.keys()).join(",") : "";
  let perms = "";
  try {
    if (m && m.permissions && typeof m.permissions.toArray === "function") {
      perms = m.permissions.toArray().join(",");
    }
  } catch {}
  return {
    userRoles: roles,
    permissions: perms,
    isAdmin: m && m.permissions && m.permissions.has("Administrator") ? "true" : "false",
  };
}

function basePayload({ user, member, channel, guild, message }) {
  const u = user || (member && member.user) || (message && message.author) || null;
  const ch = channel || (message && message.channel) || null;
  const g = guild || (member && member.guild) || (message && message.guild) || null;
  const out = {
    username: u ? u.username : "",
    userId: u ? u.id : "",
    user: u ? u.id : "",
    userTag: u ? u.tag : "",
    isBot: u && u.bot ? "true" : "false",
    channelId: ch ? ch.id : "",
    channel: ch ? ch.id : "",
    channelName: ch ? ch.name : "",
    guildId: g ? g.id : "",
    guild: g ? g.id : "",
    guildName: g ? g.name : "",
    botId: client.user ? client.user.id : "",
    messageId: message ? message.id : "",
    timestamp: new Date().toISOString(),
  };
  if (member) Object.assign(out, memberPayload(member));
  return out;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  for (const { flow, node } of findTriggers("trigger.messageCreate")) {
    if (!matchMessage(node, message.content)) continue;
    const payload = { ...basePayload({ member: message.member, message }), message: message.content };
    const ctx = makeCtx({ client, config, payload, message });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("messageDelete", async (message) => {
  for (const { flow, node } of findTriggers("trigger.messageDelete")) {
    const payload = { ...basePayload({ message }), message: message.content };
    const ctx = makeCtx({ client, config, payload, message });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("messageUpdate", async (oldMsg, newMsg) => {
  for (const { flow, node } of findTriggers("trigger.messageUpdate")) {
    const payload = { ...basePayload({ message: newMsg }), message: newMsg.content, oldMessage: oldMsg.content };
    const ctx = makeCtx({ client, config, payload, message: newMsg });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("guildMemberAdd", async (member) => {
  for (const { flow, node } of findTriggers("trigger.guildMemberAdd")) {
    const payload = { ...basePayload({ member }) };
    const ctx = makeCtx({ client, config, payload, member });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("guildMemberRemove", async (member) => {
  for (const { flow, node } of findTriggers("trigger.guildMemberRemove")) {
    const payload = { ...basePayload({ member }) };
    const ctx = makeCtx({ client, config, payload, member });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  for (const { flow, node } of findTriggers("trigger.reactionAdd")) {
    if (node.data.emoji && reaction.emoji.name !== node.data.emoji) continue;
    const payload = { ...basePayload({ user, message: reaction.message }), emoji: reaction.emoji.name };
    const ctx = makeCtx({ client, config, payload, reaction });
    try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
  }
});

client.on("voiceStateUpdate", async (oldS, newS) => {
  if (!oldS.channelId && newS.channelId) {
    for (const { flow, node } of findTriggers("trigger.voiceJoin")) {
      const payload = { ...basePayload({ member: newS.member }), channelId: newS.channelId, channel: newS.channelId };
      const ctx = makeCtx({ client, config, payload, member: newS.member });
      try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
    }
  } else if (oldS.channelId && !newS.channelId) {
    for (const { flow, node } of findTriggers("trigger.voiceLeave")) {
      const payload = { ...basePayload({ member: oldS.member }), channelId: oldS.channelId, channel: oldS.channelId };
      const ctx = makeCtx({ client, config, payload, member: oldS.member });
      try { await runFlow(flow, node.id, ctx); } catch (e) { console.error(e); }
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      for (const { flow, node } of findTriggers("trigger.slashCommand")) {
        if (String(node.data.name || "").toLowerCase() === interaction.commandName) {
          const payload = { ...basePayload({ user: interaction.user, member: interaction.member, channel: interaction.channel, guild: interaction.guild }) };
          for (const opt of interaction.options.data || []) payload["opt_" + opt.name] = opt.value;
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    } else if (interaction.isButton()) {
      for (const { flow, node } of findTriggers("trigger.buttonInteraction")) {
        if (node.data.customId === interaction.customId) {
          const payload = { ...basePayload({ user: interaction.user, member: interaction.member, channel: interaction.channel, guild: interaction.guild }) };
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    } else if (interaction.isAnySelectMenu && interaction.isAnySelectMenu()) {
      for (const { flow, node } of findTriggers("trigger.selectMenuInteraction")) {
        if (node.data.customId === interaction.customId) {
          const payload = { ...basePayload({ user: interaction.user, member: interaction.member, channel: interaction.channel, guild: interaction.guild }), values: interaction.values };
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    } else if (interaction.isModalSubmit && interaction.isModalSubmit()) {
      for (const { flow, node } of findTriggers("trigger.modalSubmit")) {
        if (node.data.customId === interaction.customId) {
          const payload = { ...basePayload({ user: interaction.user, member: interaction.member, channel: interaction.channel, guild: interaction.guild }) };
          for (const [id, comp] of interaction.fields.fields) payload["field_" + id] = comp.value;
          const ctx = makeCtx({ client, config, payload, interaction });
          await runFlow(flow, node.id, ctx);
        }
      }
    }
  } catch (e) { console.error("Interaction error:", e && e.message); }
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
