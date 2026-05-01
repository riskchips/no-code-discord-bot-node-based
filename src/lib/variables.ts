import type { Flow, FlowNode } from "./types";

/**
 * Field keys (across all node types) that DEFINE a workflow variable when
 * filled in. The value the user types becomes the variable name.
 */
export const VAR_DEFINING_KEYS = new Set([
  "varName",  // utility.* / storage.get / storage.increment
  "saveAs",   // sendMessage / createRole / createChannel / createThread / fetchUser / api extracts not included
  "name",     // utility.setVariable
]);

/**
 * Predefined variables always available in the runtime / exported bot.
 * Users CANNOT override these.
 */
export const PREDEFINED_VARIABLES: { name: string; description: string; group: string }[] = [
  // user
  { name: "user", description: "ID of the user that triggered the flow (clicker, sender, joiner)", group: "User" },
  { name: "userId", description: "Same as ${user}", group: "User" },
  { name: "username", description: "Display name of the trigger user", group: "User" },
  { name: "userTag", description: "Full tag (name#discriminator) of the trigger user", group: "User" },
  { name: "isBot", description: "'true' if the trigger user is a bot", group: "User" },
  { name: "userRoles", description: "Comma-separated list of role IDs the user has", group: "User" },
  { name: "permissions", description: "Comma-separated Discord permission flags the user has", group: "User" },
  { name: "isAdmin", description: "'true' if the user has Administrator", group: "User" },

  // channel
  { name: "channel", description: "ID of the channel where the event happened", group: "Channel" },
  { name: "channelId", description: "Same as ${channel}", group: "Channel" },
  { name: "channelName", description: "Name of the channel", group: "Channel" },

  // guild
  { name: "guild", description: "ID of the server (guild)", group: "Guild" },
  { name: "guildId", description: "Same as ${guild}", group: "Guild" },
  { name: "guildName", description: "Name of the server", group: "Guild" },

  // message
  { name: "message", description: "Content of the triggering message (message triggers)", group: "Message" },
  { name: "messageId", description: "ID of the triggering message", group: "Message" },
  { name: "oldMessage", description: "Previous content (On Message Edit)", group: "Message" },
  { name: "emoji", description: "Reaction emoji name (On Reaction Add)", group: "Message" },

  // bot / time
  { name: "botId", description: "Your bot's user ID", group: "Bot" },
  { name: "timestamp", description: "ISO timestamp when the trigger fired", group: "Bot" },

  // dynamic prefixes
  { name: "opt_<name>", description: "Slash command option value (e.g. ${opt_user})", group: "Dynamic" },
  { name: "field_<id>", description: "Modal answer for the field with that customId", group: "Dynamic" },
  { name: "values", description: "Selected values from a select menu", group: "Dynamic" },
  { name: "i", description: "Loop / ForEach index", group: "Dynamic" },
  { name: "item", description: "Current item inside For Each", group: "Dynamic" },
  { name: "error", description: "Error message inside a Try / Catch's catch branch", group: "Dynamic" },
  { name: "config.path.to.value", description: "Read anything from your config.json", group: "Dynamic" },
];

const PREDEFINED_NAMES = new Set(PREDEFINED_VARIABLES.map((v) => v.name));

export interface VariableUsage {
  nodeId: string;
  nodeType: string;
  fieldKey: string;
}

/**
 * Walk every node in every flow of the project and find anywhere the given
 * variable name is being defined. Returns each usage site.
 */
export function findVariableDefinitions(flows: Flow[], name: string, exceptNodeId?: string): VariableUsage[] {
  if (!name) return [];
  const out: VariableUsage[] = [];
  for (const flow of flows) {
    for (const node of flow.nodes) {
      if (node.id === exceptNodeId) continue;
      for (const [k, v] of Object.entries(node.data || {})) {
        if (VAR_DEFINING_KEYS.has(k) && typeof v === "string" && v === name) {
          out.push({ nodeId: node.id, nodeType: node.type, fieldKey: k });
        }
      }
    }
  }
  return out;
}

export function isPredefinedVariable(name: string): boolean {
  if (!name) return false;
  if (PREDEFINED_NAMES.has(name)) return true;
  // dynamic prefixes
  if (/^opt_/.test(name) || /^field_/.test(name)) return true;
  return false;
}

export interface VariableValidation {
  ok: boolean;
  reason?: "predefined" | "duplicate" | "invalid";
  conflicts?: VariableUsage[];
  message?: string;
}

const VAR_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateVariableName(
  name: string,
  flows: Flow[],
  currentNodeId: string,
): VariableValidation {
  const trimmed = (name || "").trim();
  if (!trimmed) return { ok: true };
  if (!VAR_NAME_RE.test(trimmed)) {
    return { ok: false, reason: "invalid", message: "Variable names must start with a letter / underscore and contain only letters, numbers and underscores." };
  }
  if (isPredefinedVariable(trimmed)) {
    return { ok: false, reason: "predefined", message: `"${trimmed}" is a built-in variable and can't be reused.` };
  }
  const conflicts = findVariableDefinitions(flows, trimmed, currentNodeId);
  if (conflicts.length) {
    return { ok: false, reason: "duplicate", conflicts, message: `"${trimmed}" is already defined by ${conflicts.length} other node${conflicts.length > 1 ? "s" : ""}.` };
  }
  return { ok: true };
}

/**
 * Locate a node across all flows so we can describe a conflict.
 */
export function locateNode(flows: Flow[], nodeId: string): { flow: Flow; node: FlowNode } | null {
  for (const flow of flows) {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (node) return { flow, node };
  }
  return null;
}
