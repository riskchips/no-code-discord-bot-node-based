import type { NodeTypeDef } from "./types";

/**
 * Curated node registry. Every node listed here is wired end-to-end
 * (sandbox runtime + exported bot).
 */
export const NODE_TYPES: NodeTypeDef[] = [
  // ───────────── TRIGGERS ─────────────
  {
    type: "trigger.messageCreate",
    category: "trigger",
    label: "On Message",
    description: "Fires when any message is sent in the server",
    inputs: 0,
    outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "match", label: "Content matches (optional)", type: "text", placeholder: "!ping" },
      { key: "matchMode", label: "Match mode", type: "select", default: "equals", options: [
        { label: "Equals", value: "equals" },
        { label: "Contains", value: "contains" },
        { label: "Starts with", value: "startsWith" },
        { label: "Regex", value: "regex" },
      ]},
    ],
  },
  { type: "trigger.messageDelete", category: "trigger", label: "On Message Delete", description: "Fires when a message is deleted",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  { type: "trigger.messageUpdate", category: "trigger", label: "On Message Edit", description: "Fires when a message is edited",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  { type: "trigger.guildMemberAdd", category: "trigger", label: "On Member Join",
    description: "Fires when a member joins the server",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  { type: "trigger.guildMemberRemove", category: "trigger", label: "On Member Leave",
    description: "Fires when a member leaves the server",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  { type: "trigger.reactionAdd", category: "trigger", label: "On Reaction Add",
    description: "Fires when a reaction is added. Use ${emoji} ${messageId}",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "emoji", label: "Filter emoji (optional)", type: "text", placeholder: "👍" }] },
  { type: "trigger.voiceJoin", category: "trigger", label: "On Voice Join",
    description: "Fires when a user joins a voice channel",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  { type: "trigger.voiceLeave", category: "trigger", label: "On Voice Leave",
    description: "Fires when a user leaves a voice channel",
    inputs: 0, outputs: [{ id: "out", label: "Then" }], fields: [] },
  {
    type: "trigger.slashCommand",
    category: "trigger",
    label: "Slash Command",
    description: "Registers and handles a slash command (with optional options)",
    inputs: 0,
    outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "name", label: "Command name", type: "text", required: true, placeholder: "ping" },
      { key: "description", label: "Description", type: "text", default: "No description" },
      { key: "options", label: "Options (one per line: name:type:desc)", type: "textarea",
        placeholder: "user:user:Target user\namount:integer:Number of items",
        help: "Types: string, integer, number, boolean, user, channel, role. Values become ${opt_<name>}." },
    ],
  },
  { type: "trigger.buttonInteraction", category: "trigger", label: "Button Click",
    description: "Fires when a button with the given Custom ID is clicked",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "customId", label: "Custom ID", type: "text", required: true, placeholder: "my_button" }] },
  { type: "trigger.selectMenuInteraction", category: "trigger", label: "Select Menu Submit",
    description: "Fires when a select menu with the given Custom ID is used. Values: ${values}",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "customId", label: "Custom ID", type: "text", required: true, placeholder: "my_menu" }] },
  { type: "trigger.modalSubmit", category: "trigger", label: "Modal Submit",
    description: "Fires when a user submits a modal. Field values: ${field_<id>}",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "customId", label: "Modal Custom ID", type: "text", required: true, placeholder: "my_modal" }] },
  { type: "trigger.scheduled", category: "trigger", label: "Schedule (Cron)",
    description: "Runs on a cron schedule",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "cron", label: "Cron expression", type: "text", default: "*/5 * * * *",
      help: "Examples: '*/5 * * * *' every 5 min, '0 9 * * *' daily 9am" }] },
  { type: "trigger.manual", category: "trigger", label: "Manual / Test",
    description: "Manual trigger for testing in the sandbox runner",
    inputs: 0, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "payload", label: "Mock payload (JSON)", type: "json",
      default: '{"username":"tester","userId":"1","message":"hi"}' }] },

  // ───────────── CONDITIONS ─────────────
  {
    type: "condition.if", category: "condition", label: "If / Else",
    description: "Branch based on a comparison",
    inputs: 1, outputs: [{ id: "true", label: "True" }, { id: "false", label: "False" }],
    fields: [
      { key: "left", label: "Left value", type: "text", placeholder: "${message}" },
      { key: "op", label: "Operator", type: "select", default: "equals", options: [
        { label: "equals", value: "equals" },
        { label: "not equals", value: "neq" },
        { label: "contains", value: "contains" },
        { label: "starts with", value: "startsWith" },
        { label: "ends with", value: "endsWith" },
        { label: "regex match", value: "regex" },
        { label: "greater than", value: "gt" },
        { label: "less than", value: "lt" },
        { label: "is empty", value: "empty" },
        { label: "is not empty", value: "notEmpty" },
      ]},
      { key: "right", label: "Right value", type: "text" },
    ],
  },
  {
    type: "condition.switch", category: "condition", label: "Switch",
    description: "Multi-way branch on a value",
    inputs: 1,
    outputs: [
      { id: "case1", label: "Case 1" }, { id: "case2", label: "Case 2" },
      { id: "case3", label: "Case 3" }, { id: "case4", label: "Case 4" },
      { id: "default", label: "Default" },
    ],
    fields: [
      { key: "value", label: "Value", type: "text", placeholder: "${message}" },
      { key: "case1", label: "Case 1 value", type: "text" },
      { key: "case2", label: "Case 2 value", type: "text" },
      { key: "case3", label: "Case 3 value", type: "text" },
      { key: "case4", label: "Case 4 value", type: "text" },
    ],
  },
  {
    type: "condition.hasRole", category: "condition", label: "Has Role?",
    description: "Branch on whether the trigger user has the role",
    inputs: 1, outputs: [{ id: "true", label: "Yes" }, { id: "false", label: "No" }],
    fields: [{ key: "roleId", label: "Role ID", type: "text", required: true }],
  },
  {
    type: "condition.isAdmin", category: "condition", label: "Is Administrator?",
    description: "Branch on whether the trigger user has Administrator permission",
    inputs: 1, outputs: [{ id: "true", label: "Yes" }, { id: "false", label: "No" }],
    fields: [],
  },
  {
    type: "condition.hasPermission", category: "condition", label: "Has Permission?",
    description: "Branch on whether the trigger user has a specific Discord permission",
    inputs: 1, outputs: [{ id: "true", label: "Yes" }, { id: "false", label: "No" }],
    fields: [
      { key: "permission", label: "Permission", type: "select", required: true, default: "ManageMessages",
        options: [
          "Administrator","ManageGuild","ManageRoles","ManageChannels","ManageMessages","ManageWebhooks",
          "ManageNicknames","ManageEmojisAndStickers","ManageEvents","ManageThreads",
          "KickMembers","BanMembers","ModerateMembers",
          "ViewChannel","SendMessages","SendMessagesInThreads","CreatePublicThreads","CreatePrivateThreads",
          "EmbedLinks","AttachFiles","ReadMessageHistory","MentionEveryone","UseExternalEmojis",
          "AddReactions","Connect","Speak","MuteMembers","DeafenMembers","MoveMembers","UseVAD",
          "PrioritySpeaker","Stream","UseApplicationCommands","RequestToSpeak",
          "ChangeNickname","ViewAuditLog","ViewGuildInsights",
        ].map((p) => ({ label: p, value: p })),
        help: "Uses Discord's PermissionFlagsBits names." },
    ],
  },
  {
    type: "condition.isBot", category: "condition", label: "Is Bot?",
    description: "Branch on whether the trigger user is a bot",
    inputs: 1, outputs: [{ id: "true", label: "Yes" }, { id: "false", label: "No" }],
    fields: [],
  },

  // ───────────── LOGIC ─────────────
  {
    type: "logic.loop", category: "logic", label: "Loop (N times)",
    description: "Repeat the body output N times. Index in ${i}",
    inputs: 1, outputs: [{ id: "body", label: "Body" }, { id: "done", label: "Done" }],
    fields: [{ key: "times", label: "Times", type: "number", default: 3 }],
  },
  {
    type: "logic.foreach", category: "logic", label: "For Each",
    description: "Iterate a comma-separated list. Current item in ${item}, index in ${i}",
    inputs: 1, outputs: [{ id: "body", label: "Body" }, { id: "done", label: "Done" }],
    fields: [{ key: "list", label: "List (comma separated or ${var})", type: "text" }],
  },
  {
    type: "logic.tryCatch", category: "logic", label: "Try / Catch",
    description: "Run the try branch; on any error, run the catch branch",
    inputs: 1, outputs: [{ id: "try", label: "Try" }, { id: "catch", label: "Catch" }],
    fields: [],
  },
  {
    type: "logic.stop", category: "logic", label: "Stop Flow",
    description: "End the flow execution here",
    inputs: 1, outputs: [], fields: [],
  },

  // ───────────── ACTIONS — MESSAGING ─────────────
  {
    type: "action.sendMessage", category: "action", label: "Send Message",
    description: "Send a message to a channel. Supports text or embed + buttons / select menus.",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID (blank = current)", type: "text" },
      { key: "messageType", label: "Message type", type: "select", default: "text", options: [
        { label: "Plain text", value: "text" }, { label: "Embed", value: "embed" },
      ]},
      { key: "content", label: "Content / Embed description", type: "textarea", placeholder: "Hello ${username}!" },
      { key: "embedTitle", label: "Embed title (embed only)", type: "text" },
      { key: "embedColor", label: "Embed color hex (embed only)", type: "text", default: "#5865F2" },
      { key: "embedImage", label: "Embed image URL (embed only)", type: "text" },
      { key: "embedFooter", label: "Embed footer (embed only)", type: "text" },
      { key: "buttons", label: "Buttons", type: "buttons", default: "[]",
        help: 'Add up to 5 buttons. Use the same Custom ID in a "Button Click" trigger.' },
      { key: "selectMenu", label: "Select menu", type: "selectMenu", default: "",
        help: 'Use the same Custom ID in a "Select Menu Submit" trigger.' },
      { key: "saveAs", label: "Save message ID as variable", type: "text", placeholder: "lastMsgId" },
    ],
  },
  {
    type: "action.reply", category: "action", label: "Reply to Message",
    description: "Reply to the trigger message. Supports text or embed + buttons / select menus.",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "messageType", label: "Reply type", type: "select", default: "text", options: [
        { label: "Plain text", value: "text" }, { label: "Embed", value: "embed" },
      ]},
      { key: "content", label: "Content / Embed description", type: "textarea", required: true, placeholder: "Hi ${username}" },
      { key: "embedTitle", label: "Embed title (embed only)", type: "text" },
      { key: "embedColor", label: "Embed color hex (embed only)", type: "text", default: "#5865F2" },
      { key: "embedImage", label: "Embed image URL (embed only)", type: "text" },
      { key: "embedFooter", label: "Embed footer (embed only)", type: "text" },
      { key: "mention", label: "Ping the author", type: "boolean", default: false },
      { key: "buttons", label: "Buttons", type: "buttons", default: "[]" },
      { key: "selectMenu", label: "Select menu", type: "selectMenu", default: "" },
    ],
  },
  {
    type: "action.editMessage", category: "action", label: "Edit Message",
    description: "Edit a previously-sent message by its ID",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "messageId", label: "Message ID", type: "text", required: true, placeholder: "${lastMsgId}" },
      { key: "content", label: "New content", type: "textarea", required: true },
    ],
  },
  {
    type: "action.deleteMessage", category: "action", label: "Delete Message",
    description: "Delete a message by ID",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "messageId", label: "Message ID", type: "text", required: true },
    ],
  },
  {
    type: "action.bulkDelete", category: "action", label: "Bulk Delete (Purge)",
    description: "Delete the last N messages in a channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "count", label: "Count (1–100)", type: "number", default: 10 },
    ],
  },
  {
    type: "action.addReaction", category: "action", label: "Add Reaction",
    description: "React to a message with an emoji",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "messageId", label: "Message ID", type: "text", required: true },
      { key: "emoji", label: "Emoji", type: "text", required: true, placeholder: "👍" },
    ],
  },
  { type: "action.dm", category: "action", label: "Send DM",
    description: "Send a direct message to a user",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "userId", label: "User ID", type: "text", required: true },
      { key: "messageType", label: "Message type", type: "select", default: "text", options: [
        { label: "Plain text", value: "text" }, { label: "Embed", value: "embed" },
      ]},
      { key: "content", label: "Content / Embed description", type: "textarea", required: true },
      { key: "embedTitle", label: "Embed title (embed only)", type: "text" },
      { key: "embedColor", label: "Embed color hex (embed only)", type: "text", default: "#5865F2" },
      { key: "buttons", label: "Buttons", type: "buttons", default: "[]" },
    ] },
  {
    type: "action.typing", category: "action", label: "Show Typing",
    description: "Trigger the typing indicator in a channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "channelId", label: "Channel ID", type: "text" }],
  },
  {
    type: "action.pinMessage", category: "action", label: "Pin Message",
    description: "Pin a message in a channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "messageId", label: "Message ID", type: "text", required: true },
    ],
  },

  // ───────────── ACTIONS — MODERATION ─────────────
  { type: "action.ban", category: "action", label: "Ban User", description: "Ban a user from the server",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "reason", label: "Reason", type: "text" }] },
  { type: "action.unban", category: "action", label: "Unban User", description: "Unban a user from the server",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }] },
  { type: "action.kick", category: "action", label: "Kick User", description: "Kick a user from the server",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "reason", label: "Reason", type: "text" }] },
  { type: "action.timeout", category: "action", label: "Timeout User", description: "Timeout a user for a duration",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "duration", label: "Duration (ms)", type: "number", default: 60000 }] },
  { type: "action.removeTimeout", category: "action", label: "Remove Timeout", description: "Remove timeout from a user",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }] },
  { type: "action.setNickname", category: "action", label: "Set Nickname", description: "Change a member's nickname",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "nickname", label: "New nickname", type: "text", required: true }] },

  // ───────────── ACTIONS — ROLES ─────────────
  { type: "action.addRole", category: "action", label: "Add Role to User", description: "Give a role to a user",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "roleId", label: "Role ID", type: "text", required: true }] },
  { type: "action.removeRole", category: "action", label: "Remove Role from User", description: "Remove a role from a user",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "userId", label: "User ID", type: "text", required: true }, { key: "roleId", label: "Role ID", type: "text", required: true }] },
  {
    type: "action.createRole", category: "action", label: "Create Role",
    description: "Create a new role in the server. Saves new role ID into a variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "name", label: "Role name", type: "text", required: true },
      { key: "color", label: "Color hex (e.g. #5865F2)", type: "text", default: "#99AAB5" },
      { key: "hoist", label: "Display separately (hoist)", type: "boolean", default: false },
      { key: "mentionable", label: "Mentionable", type: "boolean", default: false },
      { key: "permissions", label: "Permission flags (comma)", type: "text", placeholder: "SendMessages,ViewChannel",
        help: "Discord PermissionFlagsBits names." },
      { key: "saveAs", label: "Save new role ID as variable", type: "text", default: "newRoleId" },
    ],
  },
  {
    type: "action.deleteRole", category: "action", label: "Delete Role",
    description: "Delete a role by ID",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "roleId", label: "Role ID", type: "text", required: true }],
  },
  {
    type: "action.editRole", category: "action", label: "Edit Role",
    description: "Edit an existing role's name/color",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "roleId", label: "Role ID", type: "text", required: true },
      { key: "name", label: "New name (optional)", type: "text" },
      { key: "color", label: "New color hex (optional)", type: "text" },
    ],
  },

  // ───────────── ACTIONS — CHANNELS ─────────────
  {
    type: "action.createChannel", category: "action", label: "Create Channel",
    description: "Create a new text/voice/category channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "name", label: "Channel name", type: "text", required: true },
      { key: "channelType", label: "Type", type: "select", default: "text", options: [
        { label: "Text", value: "text" }, { label: "Voice", value: "voice" }, { label: "Category", value: "category" },
        { label: "Announcement", value: "announcement" }, { label: "Forum", value: "forum" },
      ]},
      { key: "categoryId", label: "Parent category ID (optional)", type: "text" },
      { key: "topic", label: "Topic (text only)", type: "text" },
      { key: "saveAs", label: "Save new channel ID as variable", type: "text", default: "newChannelId" },
    ],
  },
  {
    type: "action.deleteChannel", category: "action", label: "Delete Channel",
    description: "Delete a channel by ID",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "channelId", label: "Channel ID", type: "text", required: true }],
  },
  {
    type: "action.editChannel", category: "action", label: "Edit Channel",
    description: "Rename or change topic of a channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "name", label: "New name (optional)", type: "text" },
      { key: "topic", label: "New topic (optional)", type: "text" },
    ],
  },
  {
    type: "action.createThread", category: "action", label: "Create Thread",
    description: "Create a thread in a channel (or off a message)",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID", type: "text", required: true },
      { key: "name", label: "Thread name", type: "text", required: true },
      { key: "messageId", label: "Anchor message ID (optional)", type: "text" },
      { key: "saveAs", label: "Save thread ID as variable", type: "text", default: "newThreadId" },
    ],
  },
  {
    type: "action.archiveThread", category: "action", label: "Archive Thread",
    description: "Archive a thread by ID",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "threadId", label: "Thread ID", type: "text", required: true }],
  },

  // ───────────── ACTIONS — BOT / PRESENCE ─────────────
  {
    type: "action.setPresence", category: "action", label: "Set Bot Presence",
    description: "Change the bot's status and activity",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "status", label: "Status", type: "select", default: "online", options: [
        { label: "Online", value: "online" }, { label: "Idle", value: "idle" },
        { label: "Do Not Disturb", value: "dnd" }, { label: "Invisible", value: "invisible" },
      ]},
      { key: "activityType", label: "Activity type", type: "select", default: "Playing", options: [
        { label: "Playing", value: "Playing" }, { label: "Watching", value: "Watching" },
        { label: "Listening", value: "Listening" }, { label: "Competing", value: "Competing" },
        { label: "Custom", value: "Custom" },
      ]},
      { key: "activity", label: "Activity text", type: "text", placeholder: "with no-code bots" },
    ],
  },
  {
    type: "action.refreshSlashCommands", category: "action", label: "Refresh Slash Commands",
    description: "Re-register every Slash Command node with Discord. Same as bot startup.",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "scope", label: "Scope", type: "select", default: "global", options: [
        { label: "Global (all servers)", value: "global" },
        { label: "Current guild only", value: "guild" },
      ]},
    ],
  },
  {
    type: "action.fetchUser", category: "action", label: "Fetch User",
    description: "Fetch a user by ID and save fields as variables",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "userId", label: "User ID", type: "text", required: true, default: "${user}" },
      { key: "saveAs", label: "Save username as", type: "text", default: "fetchedUsername" },
    ],
  },
  {
    type: "action.sendFile", category: "action", label: "Send File",
    description: "Send a file (URL) as an attachment to a channel",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Channel ID (blank = current)", type: "text" },
      { key: "url", label: "File URL", type: "text", required: true },
      { key: "filename", label: "Filename (optional)", type: "text", placeholder: "image.png" },
      { key: "content", label: "Message content (optional)", type: "textarea" },
    ],
  },

  // ───────────── INTERACTIONS ─────────────
  {
    type: "interaction.reply", category: "interaction", label: "Interaction Reply",
    description: "Reply to a slash / button / select interaction. Supports text or embed + buttons / select menus.",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "messageType", label: "Reply type", type: "select", default: "text", options: [
        { label: "Plain text", value: "text" }, { label: "Embed", value: "embed" },
      ]},
      { key: "content", label: "Content / Embed description", type: "textarea", required: true },
      { key: "embedTitle", label: "Embed title (embed only)", type: "text" },
      { key: "embedColor", label: "Embed color hex (embed only)", type: "text", default: "#5865F2" },
      { key: "embedImage", label: "Embed image URL (embed only)", type: "text" },
      { key: "ephemeral", label: "Ephemeral (only the user sees it)", type: "boolean", default: false },
      { key: "buttons", label: "Buttons", type: "buttons", default: "[]",
        help: 'Add up to 5 buttons. Custom ID is what your "Button Click" trigger listens for.' },
      { key: "selectMenu", label: "Select menu", type: "selectMenu", default: "" },
    ],
  },
  {
    type: "interaction.deferReply", category: "interaction", label: "Defer Reply",
    description: "Defer the interaction reply (gives you up to 15 minutes)",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "ephemeral", label: "Ephemeral", type: "boolean", default: false }],
  },
  {
    type: "interaction.showModal", category: "interaction", label: "Show Modal",
    description: "Open a modal popup on a button / slash interaction. Define questions (text inputs).",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "customId", label: "Modal Custom ID", type: "text", required: true, placeholder: "my_modal",
        help: "Use this same ID in a 'Modal Submit' trigger to handle the answers." },
      { key: "title", label: "Modal title", type: "text", required: true, default: "Form" },
      { key: "fields", label: "Questions", type: "modalFields",
        default: '[{"customId":"q1","label":"Your name","style":"Short","required":true,"placeholder":"Enter here"}]',
        help: 'Up to 5 questions. On submit, answers become ${field_<customId>}.' },
    ],
  },

  // ───────────── API ─────────────
  {
    type: "api.request", category: "api", label: "API Request",
    description: "Call an external HTTP API and extract values into variables",
    inputs: 1, outputs: [{ id: "ok", label: "Success" }, { id: "err", label: "Failure" }],
    fields: [
      { key: "method", label: "Method", type: "select", default: "GET", options: ["GET","POST","PUT","PATCH","DELETE"].map(v=>({label:v,value:v})) },
      { key: "url", label: "URL", type: "text", required: true, placeholder: "https://api.example.com/x" },
      { key: "headers", label: "Headers (JSON)", type: "json", default: "{}" },
      { key: "body", label: "Body (JSON)", type: "json", default: "" },
      { key: "extract", label: "Extract (var=path lines)", type: "textarea", placeholder: "price=data.price\nname=user.name",
        help: "Each line saves a JSON path into a variable usable as ${var}." },
    ],
  },
  {
    type: "api.webhook", category: "api", label: "Send Webhook",
    description: "Send a payload to any webhook URL (Discord webhooks, Slack, etc.)",
    inputs: 1, outputs: [{ id: "ok", label: "Success" }, { id: "err", label: "Failure" }],
    fields: [
      { key: "url", label: "Webhook URL", type: "text", required: true },
      { key: "content", label: "Content", type: "textarea" },
      { key: "username", label: "Override username", type: "text" },
    ],
  },

  // ───────────── DELAY ─────────────
  { type: "delay.wait", category: "delay", label: "Delay",
    description: "Wait for a duration before continuing",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "ms", label: "Milliseconds", type: "number", default: 1000 }] },

  // ───────────── STORAGE ─────────────
  { type: "storage.set", category: "storage", label: "Storage Set",
    description: "Save a value persistently (JSON file in the bot folder)",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "key", label: "Key", type: "text", required: true }, { key: "value", label: "Value", type: "text", required: true }] },
  { type: "storage.get", category: "storage", label: "Storage Get",
    description: "Read a value into a variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "key", label: "Key", type: "text", required: true }, { key: "varName", label: "Save as variable", type: "text", required: true }] },
  { type: "storage.delete", category: "storage", label: "Storage Delete",
    description: "Remove a stored key",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "key", label: "Key", type: "text", required: true }] },
  { type: "storage.increment", category: "storage", label: "Counter Increment",
    description: "Increment a numeric counter and save the new value",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "key", label: "Counter key", type: "text", required: true },
      { key: "by", label: "Increment by", type: "number", default: 1 },
      { key: "varName", label: "Save new value as", type: "text", default: "count" },
    ],
  },

  // ───────────── UTILITY ─────────────
  {
    type: "utility.randomKey", category: "utility", label: "Random Key",
    description: "Generate a random string and save it as a variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "length", label: "Length", type: "number", default: 16 },
      { key: "upper", label: "Uppercase letters", type: "boolean", default: true },
      { key: "lower", label: "Lowercase letters", type: "boolean", default: true },
      { key: "numbers", label: "Numbers", type: "boolean", default: true },
      { key: "symbols", label: "Symbols", type: "boolean", default: false },
      { key: "varName", label: "Save as variable", type: "text", default: "key" },
    ],
  },
  {
    type: "utility.randomNumber", category: "utility", label: "Random Number",
    description: "Generate a random integer between min and max",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "min", label: "Min", type: "number", default: 1 },
      { key: "max", label: "Max", type: "number", default: 100 },
      { key: "varName", label: "Save as variable", type: "text", default: "n" },
    ],
  },
  {
    type: "utility.randomChoice", category: "utility", label: "Random Choice",
    description: "Pick a random item from a comma-separated list",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "list", label: "Items (comma separated)", type: "text", required: true, placeholder: "rock,paper,scissors" },
      { key: "varName", label: "Save as variable", type: "text", default: "choice" },
    ],
  },
  {
    type: "utility.math", category: "utility", label: "Math",
    description: "Evaluate a math expression (supports + - * / % () and ${vars}). Result saved as variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "expr", label: "Expression", type: "text", required: true, placeholder: "${a} + ${b} * 2" },
      { key: "varName", label: "Save result as", type: "text", default: "result" },
    ],
  },
  {
    type: "utility.string", category: "utility", label: "String Operation",
    description: "Manipulate text: upper / lower / trim / replace / slice / length",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "input", label: "Input", type: "text", required: true, placeholder: "${message}" },
      { key: "op", label: "Operation", type: "select", default: "upper", options: [
        { label: "UPPER", value: "upper" }, { label: "lower", value: "lower" },
        { label: "trim", value: "trim" }, { label: "replace", value: "replace" },
        { label: "slice", value: "slice" }, { label: "length", value: "length" },
        { label: "reverse", value: "reverse" },
      ]},
      { key: "arg1", label: "Arg 1 (replace from / slice start)", type: "text" },
      { key: "arg2", label: "Arg 2 (replace to / slice end)", type: "text" },
      { key: "varName", label: "Save as", type: "text", default: "out" },
    ],
  },
  {
    type: "utility.json", category: "utility", label: "Parse JSON",
    description: "Parse a JSON string and extract a path into a variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "input", label: "Input JSON string", type: "textarea", required: true },
      { key: "path", label: "Path (e.g. data.user.name)", type: "text" },
      { key: "varName", label: "Save as", type: "text", default: "parsed" },
    ],
  },
  {
    type: "utility.timestamp", category: "utility", label: "Timestamp / Date",
    description: "Format the current time and save as a variable",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "format", label: "Format", type: "select", default: "iso", options: [
        { label: "ISO (2025-04-30T...)", value: "iso" },
        { label: "Unix seconds", value: "unix" },
        { label: "Unix ms", value: "unixms" },
        { label: "Discord <t:...:F>", value: "discord" },
        { label: "Locale (toLocaleString)", value: "locale" },
      ]},
      { key: "varName", label: "Save as", type: "text", default: "now" },
    ],
  },
  {
    type: "utility.transcript", category: "utility", label: "Transcript",
    description: "Generate a channel transcript and send it to a channel or user",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "channelId", label: "Source channel ID", type: "text", required: true },
      { key: "format", label: "Format", type: "select", default: "html", options: [{label:"HTML",value:"html"},{label:"Text",value:"text"}] },
      { key: "destType", label: "Send to", type: "select", default: "channel", options: [{label:"Channel",value:"channel"},{label:"DM user",value:"user"}] },
      { key: "destId", label: "Destination ID", type: "text", required: true },
      { key: "limit", label: "Message limit", type: "number", default: 100 },
    ],
  },
  {
    type: "utility.log", category: "utility", label: "Log to Console",
    description: "Print a message to the bot's console / sandbox log",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [{ key: "message", label: "Message", type: "textarea", default: "" }],
  },
  {
    type: "utility.setVariable", category: "utility", label: "Set Variable",
    description: "Set a workflow variable usable later as ${name}",
    inputs: 1, outputs: [{ id: "out", label: "Then" }],
    fields: [
      { key: "name", label: "Variable name", type: "text", required: true },
      { key: "value", label: "Value", type: "text", required: true },
    ],
  },
  {
    type: "utility.accessControl", category: "utility", label: "Access Control",
    description: "Allow only listed users / roles past this gate",
    inputs: 1, outputs: [{ id: "ok", label: "Allowed" }, { id: "denied", label: "Denied" }],
    fields: [
      { key: "enabled", label: "Enabled", type: "boolean", default: true },
      { key: "userIds", label: "Allowed user IDs (comma)", type: "text" },
      { key: "roleIds", label: "Allowed role IDs (comma)", type: "text" },
    ],
  },
  {
    type: "utility.cooldown", category: "utility", label: "Cooldown / Rate Limit",
    description: "Allow a user past at most once every N seconds",
    inputs: 1, outputs: [{ id: "ok", label: "OK" }, { id: "blocked", label: "Blocked" }],
    fields: [
      { key: "key", label: "Cooldown key (per-user by default)", type: "text", default: "${userId}" },
      { key: "seconds", label: "Cooldown seconds", type: "number", default: 30 },
    ],
  },
];

export const NODE_MAP: Record<string, NodeTypeDef> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, n]),
);

export const CATEGORY_LABELS: Record<string, string> = {
  trigger: "Triggers",
  condition: "Conditions",
  logic: "Logic",
  action: "Actions",
  interaction: "Interactions",
  api: "API",
  delay: "Delay",
  storage: "Storage",
  utility: "Utilities",
  subflow: "Subflows",
};

export const CATEGORY_COLORS: Record<string, string> = {
  trigger: "var(--cat-trigger)",
  condition: "var(--cat-condition)",
  logic: "var(--cat-logic)",
  action: "var(--cat-action)",
  interaction: "var(--cat-interaction)",
  api: "var(--cat-api)",
  delay: "var(--cat-delay)",
  storage: "var(--cat-storage)",
  utility: "var(--cat-utility)",
  subflow: "var(--cat-subflow)",
};
