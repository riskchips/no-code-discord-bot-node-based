import { createFileRoute, Link } from "@tanstack/react-router";
import { NODE_TYPES, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/nodes";
import { PREDEFINED_VARIABLES } from "@/lib/variables";
import { Bot, ArrowLeft, Sparkles, Keyboard } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — How to build a Discord bot with no code" },
      { name: "description", content: "Step-by-step guide for the No-Code Discord Bot Builder: every node, every trigger, variables, exports, and example flows." },
      { property: "og:title", content: "BotForge Docs — Build Discord bots without code" },
      { property: "og:description", content: "Complete reference: triggers, conditions, actions, interactions, API calls, storage, and advanced flows." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const grouped = NODE_TYPES.reduce<Record<string, typeof NODE_TYPES>>((m, n) => {
    (m[n.category] ||= []).push(n); return m;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}>
            <Bot className="w-5 h-5" />
          </div>
          <div className="font-semibold">BotForge Docs</div>
          <div className="ml-auto">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to builder
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Hero */}
        <section>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full mb-3">
            <Sparkles className="w-3 h-3" /> No-code Discord bots
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Build, test and export a Discord bot — without writing code.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
            Drag triggers, conditions and actions onto a canvas, wire them up,
            and export a production-ready Node.js bot as a ZIP. This guide walks
            through every concept and every node.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/" className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium" style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}>
              Open the builder
            </Link>
            <a href="#nodes" className="inline-flex items-center justify-center px-4 py-2 rounded-md border font-medium hover:bg-accent">
              Browse all nodes
            </a>
          </div>
        </section>

        {/* Quickstart */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Quick start (5 steps)</h2>
          <ol className="space-y-3">
            {[
              ["Add a trigger", "From the left palette, click a Trigger node (e.g. Slash Command, On Message). Every flow starts with a trigger."],
              ["Add actions", "Add nodes like Reply to Message or Send Message and configure them in the right Inspector panel."],
              ["Wire them up", "Drag from a node's right-side handle to the next node's left handle. Right-click an edge (or select + Delete) to remove it."],
              ["Test in the Runner", "Open the Runner tab and press Run flow. The Discord-style preview shows what your bot would send."],
              ["Export", "Click 'Export Bot ZIP'. Unzip, edit config.json with your bot token, then npm install && node index.js."],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-4 items-start p-4 rounded-lg border">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm font-bold" style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}>{i + 1}</div>
                <div><div className="font-semibold">{t}</div><p className="text-sm text-muted-foreground mt-1">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* Variables */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Variables &amp; templating</h2>
          <p className="text-muted-foreground">
            Anywhere a node accepts text, you can inject runtime values with{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{"${name}"}</code>.
            These names are <strong>reserved</strong> — the inspector will warn you if you try to
            create a variable with one of them.
          </p>
          {Array.from(new Set(PREDEFINED_VARIABLES.map((v) => v.group))).map((group) => (
            <div key={group} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {PREDEFINED_VARIABLES.filter((v) => v.group === group).map((v) => (
                  <div key={v.name} className="p-3 rounded-md border bg-card">
                    <div className="font-mono text-sm text-foreground">{`\${${v.name}}`}</div>
                    <div className="text-xs text-muted-foreground mt-1">{v.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Shortcuts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Keyboard className="w-6 h-6" /> Keyboard shortcuts
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              ["Ctrl / ⌘ + C", "Copy the selected node"],
              ["Ctrl / ⌘ + V", "Paste a copied node into the canvas"],
              ["Ctrl / ⌘ + D", "Duplicate the selected node"],
              ["Delete / Backspace", "Delete the selected node or edge"],
              ["Right-click an edge", "Instantly delete the connection"],
              ["Alt-click an edge", "Delete that single connection"],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-md border bg-card flex items-center gap-3">
                <code className="px-2 py-1 rounded bg-muted text-xs font-mono shrink-0">{k}</code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons rows */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Button rows &amp; columns</h2>
          <p className="text-muted-foreground">
            Each message can carry up to <strong>5 rows × 5 buttons = 25 buttons</strong>. In any
            message-sending node (Send Message, Reply, Interaction Reply), open the
            <strong> Buttons</strong> editor, click <em>Add row</em>, then add buttons inside that row.
            Each row renders as one horizontal line in Discord.
          </p>
        </section>

        {/* Components: buttons / select / modal */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Buttons, select menus &amp; modals</h2>
          <p className="text-muted-foreground">
            Any message-sending node (Send Message, Reply, Interaction Reply) has a
            visual <strong>Buttons</strong> editor and a <strong>Select Menu</strong> editor — no
            JSON required. Each component has a <strong>Custom ID</strong>.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Add a button or select menu to your reply (click the + icon).</li>
            <li>Set a Custom ID, e.g. <code className="px-1 bg-muted rounded">help_btn</code>.</li>
            <li>Add a <strong>Button Click</strong> trigger (or <strong>Select Menu Submit</strong>) with the same Custom ID.</li>
            <li>That trigger fires whenever a user clicks/uses the component.</li>
          </ol>
          <p className="text-muted-foreground">
            <strong>Modals</strong>: connect a button trigger → <em>Show Modal</em> node, define
            its questions, then handle answers in a separate flow that starts with{" "}
            <em>Modal Submit</em>. Each answer is exposed as <code className="px-1 bg-muted rounded">{"${field_<id>}"}</code>.
          </p>
        </section>

        {/* Examples */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Example flows</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Welcome new members", body: "On Member Join → Send Message (channelId = welcome) → Add Role." },
              { title: "Slash command with options", body: "Slash Command (name=greet, options: user:user:Target) → Interaction Reply: Hello ${opt_user}!" },
              { title: "Reaction roles", body: "On Reaction Add (👍) → Add Role to User. Use ${userId} from the payload." },
              { title: "Ticket system", body: "Slash Command /ticket → Create Channel (text, save as ${ticketId}) → Send Message in ${ticketId} → Interaction Reply (ephemeral)." },
              { title: "Anti-spam cooldown", body: "On Message → Cooldown (per ${userId}, 10s) → Reply. The 'Blocked' branch silently drops repeats." },
              { title: "Poll", body: "Slash Command /poll → Send Message embed with buttons (yes/no/maybe) → Button Click triggers update a counter via Storage Increment." },
            ].map((e) => (
              <div key={e.title} className="p-4 rounded-lg border bg-card">
                <div className="font-semibold">{e.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{e.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Node reference */}
        <section id="nodes" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Complete node reference</h2>
            <p className="text-muted-foreground mt-1">Every node currently in the palette and exactly what it does.</p>
          </div>
          {categories.map((cat) => (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                <h3 className="text-lg font-semibold">{CATEGORY_LABELS[cat] ?? cat}</h3>
                <span className="text-xs text-muted-foreground">({grouped[cat].length})</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {grouped[cat].map((n) => (
                  <div key={n.type} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{n.label}</div>
                      <code className="text-[10px] text-muted-foreground">{n.type}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.description}</p>
                    {n.fields.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Fields</div>
                        <ul className="text-xs space-y-1">
                          {n.fields.map((f) => (
                            <li key={f.key} className="flex gap-2">
                              <span className="font-mono text-foreground/80">{f.key}</span>
                              <span className="text-muted-foreground">— {f.label}{f.required ? " (required)" : ""}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {n.outputs.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Outputs</div>
                        <div className="flex flex-wrap gap-1.5">
                          {n.outputs.map((o) => (
                            <span key={o.id} className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{o.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Export */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Exporting and running your bot</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click <strong>Export Bot ZIP</strong> in the top bar.</li>
            <li>Unzip — you'll get <code className="px-1 bg-muted rounded">index.js</code>, an <code className="px-1 bg-muted rounded">engine/</code> folder, your flows, and <code className="px-1 bg-muted rounded">config.json</code>.</li>
            <li>Open <code className="px-1 bg-muted rounded">config.json</code> and put your token at the path you configured (default <code className="px-1 bg-muted rounded">bot.token</code>). You can also set <code className="px-1 bg-muted rounded">DISCORD_TOKEN</code> as an env var.</li>
            <li>Run <code className="px-1 bg-muted rounded">npm install</code> then <code className="px-1 bg-muted rounded">node index.js</code>.</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Slash commands are registered automatically on startup. Cron-scheduled
            flows are wired up via <code className="px-1 bg-muted rounded">node-cron</code>.
          </p>
        </section>

        <footer className="pt-8 pb-12 text-center text-sm text-muted-foreground">
          Built with the No-Code Discord Bot Builder · <Link to="/" className="underline">Open the builder</Link>
        </footer>
      </main>
    </div>
  );
}