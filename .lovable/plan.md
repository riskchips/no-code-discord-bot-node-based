
# No-Code Discord Bot Builder — Full MVP

A browser-based visual builder where users design Discord bots as node graphs, edit a live config, test triggers in a sandbox, and export a ready-to-run `node index.js` discord.js project as a ZIP. All data stays in the browser (IndexedDB).

## What you'll get

### 1. Workspace shell
- Top bar: project name, theme toggle (light/dark), Import JSON, Export JSON, **Export Bot ZIP**, Run test mode.
- Left sidebar: **Flows list** (create/rename/duplicate/delete/enable-disable), **Subflows**, **Config**, **Variables**, **Logs**.
- Main area: tabbed — **Canvas**, **Config Editor**, **Logs/Test Runner**.
- Right inspector panel: properties of the selected node (dynamic form based on node type).

### 2. Node-based canvas (React Flow)
- Drag nodes from a categorized palette: **Triggers, Conditions, Logic, Actions, Interactions, API, Delay, Storage, Utilities, Subflow**.
- Connect nodes with typed handles (success / failure / branch outputs like `true`/`false`, switch cases, loop body / loop end).
- Multi-select, copy/paste, undo/redo, minimap, snap-to-grid, auto-layout button.
- Node validation badges (missing required fields highlighted in red).
- Group/comment nodes for organization.

**Node catalog (all included in v1):**
- Triggers: `messageCreate`, `messageUpdate`, `messageDelete`, `guildMemberAdd`, `interactionCreate`, `buttonInteraction`, `selectMenuInteraction`, `slashCommand`, `webhook`, `scheduled (cron)`, `manual (test)`.
- Conditions: equals, contains, startsWith, endsWith, regex, user/role/channel check, variable compare, AND/OR/NOT composer.
- Logic: if/else, switch-case, loop (forEach / times / while), parallel, subflow call, try/catch wrapper.
- Actions — Messaging: send message, send embed, reply, edit, delete, DM user.
- Actions — Moderation: ban, kick, timeout, untimeout, add/remove role.
- Actions — Server: create/delete/rename channel, create/delete role.
- Interactions: reply, deferReply, editReply, followUp, update message, disable/remove components, **ephemeral toggle**.
- Components builder: action rows (max 5), buttons (label, customId, style, emoji, disabled, URL), select menus (string/user/role/channel, options, min/max).
- API node: GET/POST/PUT/PATCH/DELETE, headers, query, JSON or form-data body, response value extraction (`response.litecoin.usd → ltc_price`).
- Delay node, Cooldown-per-user node, Inactivity detector.
- Storage: get/set/delete key (JSON file in exported bot, IndexedDB in builder).
- Utilities: **Random Key Generator** (length + uppercase/lowercase/numbers/symbols toggles), Transcript generator (HTML/text, send to channel or DM), Logger.
- Access Control node (optional gate by user IDs / role IDs).

### 3. Config editor
- Monaco-based JSON editor with syntax highlighting.
- Real-time validation; invalid JSON blocks save and **blocks tab exit** with a warning banner until fixed.
- Free-form structure — users define any keys; example seed:
  ```json
  { "bot": { "token": "" }, "api": { "key": "" } }
  ```
- "Insert variable" helper auto-generates `${config.path.to.value}` references.
- Custom variables panel (rename, add, delete) — kept in sync with editor.
- Token path field on Export with autocomplete from config keys.

### 4. Variable system
- Defaults: `${username}`, `${userId}`, `${channelId}`, `${message}`, `${timestamp}`, plus all `${config.*}`.
- Scopes: global / workflow / execution; inspector shows which scope each variable lives in.
- Object/array path access (`${response.items[0].name}`).
- Variable picker dropdown on every text input in the inspector.

### 5. Test runner (in-browser sandbox)
- Manual trigger node lets users fire a flow with mock payload (message, member, interaction).
- Step-by-step execution log with per-node timing, inputs, outputs, errors.
- API node calls really execute (CORS permitting) so users can validate response extraction.
- Discord-side actions are **simulated** in the sandbox (logged, not sent) — real execution happens in the exported bot.

### 6. Flow management
- Multiple flows per project, each enable/disable toggle.
- Subflows reusable across flows.
- Per-flow JSON import/export.
- Whole-project import/export (flows + config + variables).

### 7. Export → ZIP (production-ready bot)
Generated structure:
```text
bot/
├── index.js              # boot, login, route events to engine
├── config.json           # user's config
├── package.json          # discord.js latest, node-fetch, archiver-free
├── README.md             # install + run instructions
├── flows/                # one JSON per flow
├── engine/
│   ├── executor.js       # node graph runner, retries, timeouts, try/catch
│   ├── context.js        # variable scopes + ${...} resolver
│   ├── interactions.js   # button/select routing by customId
│   └── triggers.js       # maps Discord events → flow entry nodes
├── nodes/                # one handler per node type
├── utils/
│   ├── api.js            # fetch wrapper
│   ├── transcript.js     # HTML/text transcript generator
│   ├── random.js         # random key generator
│   ├── cooldown.js
│   └── logger.js
└── storage/
    └── store.json        # persistent storage node backend
```
- Token resolution: reads from the configured path (`${config.bot.token}`) at boot; falls back to `process.env.DISCORD_TOKEN` if unset.
- Engine wraps every node in try/catch, logs `{ nodeId, error }`, continues execution on failure unless flow marks node as fatal.
- Per-node timeout + retry settings honored.
- Run with: `npm install && node index.js`.

ZIP is built client-side with `jszip` and downloaded directly — no backend needed.

### 8. Storage (browser)
- IndexedDB via a small wrapper (idb-keyval) for projects, flows, config, variables, logs.
- Auto-save on change, with manual "Save" indicator.
- Project-level Import/Export JSON for backup or sharing.

## UX principles
- Friendly empty states with "Create your first flow" CTAs and a starter template (ping → reply).
- Inspector forms use plain-language labels, with a "raw JSON" toggle for power users.
- Inline docs popovers on every node explaining what it does.
- Light/dark toggle persisted, system-preference default.

## Technical notes (for the build)
- React Flow (`@xyflow/react`) for the canvas; Monaco (`@monaco-editor/react`) for config; `jszip` + `file-saver` for export; `idb-keyval` for storage; `zod` for inspector form validation; shadcn/ui for chrome.
- Engine is shared logic in `src/engine/` consumed by both the in-browser test runner and the exported bot (the exported version is emitted as plain JS templates from string builders so it has zero ties to the React app).
- Node definitions live in a single registry (`src/nodes/registry.ts`) describing: type, category, inputs/outputs, inspector schema, sandbox executor, and the JS code template used during export. Adding a node = one file.
- All Discord-side execution is template-generated, not run in the browser — keeps the builder fast and avoids CORS/secret issues.
- Routes: `/` (workspace). Single-page app; tabs handle Canvas / Config / Logs.

## Out of scope for v1
- Hosting the generated bots (users run them locally or on their own host).
- Multi-user collaboration / cloud sync (local-only as chosen).
- Visual debugger replaying real Discord events (the test runner uses mocks).

After approval I'll scaffold the workspace, node registry, config editor with the exit-blocking validator, and the ZIP exporter, then fill in node handlers and inspector forms.
