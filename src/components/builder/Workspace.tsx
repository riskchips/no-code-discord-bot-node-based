import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Download, Upload, Play, Plus, Trash2, Copy, Settings, FileJson, Sun, Moon, Package,
} from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./Canvas";
import { NodePalette } from "./NodePalette";
import { Inspector } from "./Inspector";
import { ConfigEditor } from "./ConfigEditor";
import { RunnerPanel } from "./RunnerPanel";
import {
  createEmptyFlow,
  createEmptyProject,
  loadActiveProject,
  newId,
  saveProject,
} from "@/lib/store";
import type { Flow, FlowNode, Project } from "@/lib/types";
import { exportProjectAsZip } from "@/lib/exporter";
import { toast } from "sonner";

const THEME_KEY = "ui-theme";

function applyTheme(t: "light" | "dark") {
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem(THEME_KEY, t);
}

export function Workspace() {
  const [project, setProject] = useState<Project | null>(null);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tab, setTab] = useState("canvas");
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined"
      ? ((localStorage.getItem(THEME_KEY) as "light" | "dark") ||
          (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"))
      : "light",
  );
  const [configDirty, setConfigDirty] = useState(false);
  const [exitWarn, setExitWarn] = useState(false);

  // load / init
  useEffect(() => {
    (async () => {
      const existing = await loadActiveProject();
      const p = existing ?? createEmptyProject();
      if (!existing) await saveProject(p);
      setProject(p);
      setActiveFlowId(p.flows[0]?.id ?? null);
    })();
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme]);

  // autosave
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => { saveProject(project); }, 400);
    return () => clearTimeout(t);
  }, [project]);

  const activeFlow = useMemo(
    () => project?.flows.find((f) => f.id === activeFlowId) ?? null,
    [project, activeFlowId],
  );
  const selectedNode = useMemo(
    () => activeFlow?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [activeFlow, selectedNodeId],
  );

  if (!project || !activeFlow) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading…</div>;
  }

  const updateProject = (next: Project) => setProject({ ...next });
  const updateFlow = (next: Flow) => {
    if (!project) return;
    updateProject({
      ...project,
      flows: project.flows.map((f) => (f.id === next.id ? next : f)),
    });
  };

  const addNode = (type: string) => {
    const node: FlowNode = {
      id: newId("node"),
      type,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {},
    };
    updateFlow({ ...activeFlow, nodes: [...activeFlow.nodes, node] });
    setSelectedNodeId(node.id);
  };

  const updateSelectedData = (data: Record<string, unknown>) => {
    if (!selectedNode) return;
    updateFlow({
      ...activeFlow,
      nodes: activeFlow.nodes.map((n) => (n.id === selectedNode.id ? { ...n, data } : n)),
    });
  };

  const deleteSelected = () => {
    if (!selectedNode) return;
    updateFlow({
      ...activeFlow,
      nodes: activeFlow.nodes.filter((n) => n.id !== selectedNode.id),
      edges: activeFlow.edges.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
      ),
    });
    setSelectedNodeId(null);
  };

  const newFlow = () => {
    const f = createEmptyFlow(`Flow ${project.flows.length + 1}`);
    updateProject({ ...project, flows: [...project.flows, f] });
    setActiveFlowId(f.id);
  };
  const duplicateFlow = (id: string) => {
    const src = project.flows.find((f) => f.id === id);
    if (!src) return;
    const idMap = new Map<string, string>();
    const nodes = src.nodes.map((n) => { const nid = newId("node"); idMap.set(n.id, nid); return { ...n, id: nid }; });
    const edges = src.edges.map((e) => ({ ...e, id: newId("edge"), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
    const copy: Flow = { ...src, id: newId("flow"), name: src.name + " copy", nodes, edges };
    updateProject({ ...project, flows: [...project.flows, copy] });
  };
  const deleteFlow = (id: string) => {
    if (project.flows.length <= 1) { toast.error("Keep at least one flow"); return; }
    const next = project.flows.filter((f) => f.id !== id);
    updateProject({ ...project, flows: next });
    if (activeFlowId === id) setActiveFlowId(next[0].id);
  };

  const exportProjectJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.name || "project"}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importProjectJson = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Project;
        data.id = data.id || newId("proj");
        await saveProject(data);
        setProject(data);
        setActiveFlowId(data.flows[0]?.id ?? null);
        toast.success("Project imported");
      } catch (e) { toast.error("Invalid project JSON: " + (e as Error).message); }
    };
    input.click();
  };

  const exportZip = async () => {
    try {
      await exportProjectAsZip(project);
      toast.success("Bot ZIP downloaded");
    } catch (e) { toast.error("Export failed: " + (e as Error).message); }
  };

  const tryChangeTab = (next: string) => {
    if (tab === "config" && configDirty) {
      // ConfigEditor blocks via its own validation banner; only allow if valid
      try { JSON.parse(project.config); } catch { setExitWarn(true); return; }
    }
    setTab(next);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <Input
              value={project.name}
              onChange={(e) => updateProject({ ...project, name: e.target.value })}
              className="h-7 text-sm font-semibold border-none shadow-none focus-visible:ring-1 px-1 w-56"
            />
            <div className="text-[10px] text-muted-foreground px-1">No-Code Discord Bot Builder</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={importProjectJson}>
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
          <Button variant="ghost" size="sm" onClick={exportProjectJson}>
            <FileJson className="w-4 h-4 mr-1" /> Export JSON
          </Button>
          <Button size="sm" onClick={exportZip} style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}>
            <Package className="w-4 h-4 mr-1" /> Export Bot ZIP
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: flows */}
        <aside className="w-60 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Flows</span>
            <Button size="sm" variant="ghost" onClick={newFlow}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {project.flows.map((f) => (
                <div
                  key={f.id}
                  className={`group rounded-md p-2 cursor-pointer transition-colors ${
                    f.id === activeFlowId ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                  onClick={() => { setActiveFlowId(f.id); setSelectedNodeId(null); }}
                >
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={f.enabled}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(v) => updateProject({ ...project, flows: project.flows.map((x) => x.id === f.id ? { ...x, enabled: v } : x) })}
                    />
                    <Input
                      value={f.name}
                      onChange={(e) => updateProject({ ...project, flows: project.flows.map((x) => x.id === f.id ? { ...x, name: e.target.value } : x) })}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm border-none shadow-none focus-visible:ring-1 p-1 flex-1 bg-transparent"
                    />
                  </div>
                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={(e) => { e.stopPropagation(); duplicateFlow(f.id); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive" onClick={(e) => { e.stopPropagation(); deleteFlow(f.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1 px-2">Add nodes</div>
            <div className="h-[260px]">
              <NodePalette onAdd={addNode} />
            </div>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col min-w-0">
          <Tabs value={tab} onValueChange={tryChangeTab} className="flex flex-col flex-1 min-h-0">
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="canvas">Canvas</TabsTrigger>
                <TabsTrigger value="config">
                  Config {configDirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />}
                </TabsTrigger>
                <TabsTrigger value="runner"><Play className="w-3.5 h-3.5 mr-1" />Runner</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="canvas" className="flex-1 m-0 min-h-0">
              <div className="h-full w-full">
                <ReactFlowProvider>
                  <Canvas
                    flow={activeFlow}
                    onChange={updateFlow}
                    selectedId={selectedNodeId}
                    onSelect={setSelectedNodeId}
                  />
                </ReactFlowProvider>
              </div>
            </TabsContent>

            <TabsContent value="config" className="flex-1 m-0 min-h-0">
              <ConfigEditor
                config={project.config}
                tokenPath={project.tokenPath}
                variables={project.variables}
                onSave={(next) => updateProject({ ...project, ...next })}
                onDirtyChange={setConfigDirty}
              />
            </TabsContent>

            <TabsContent value="runner" className="flex-1 m-0 min-h-0">
              <RunnerPanel project={project} flow={activeFlow} />
            </TabsContent>
          </Tabs>
        </main>

        {/* Right inspector */}
        <aside className="w-80 border-l flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Inspector</span>
          </div>
          <div className="flex-1 min-h-0">
            <Inspector
              node={selectedNode}
              onChange={updateSelectedData}
              onDelete={deleteSelected}
            />
          </div>
        </aside>
      </div>

      <Dialog open={exitWarn} onOpenChange={setExitWarn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix the config first</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your <code>config.json</code> contains a JSON syntax error. You must fix it before leaving this tab.
          </p>
          <DialogFooter>
            <Button onClick={() => setExitWarn(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}