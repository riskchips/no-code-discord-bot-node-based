import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2 } from "lucide-react";
import { runFlow } from "@/lib/runtime";
import type { DiscordEvent, Flow, LogEntry, Project } from "@/lib/types";
import { DiscordPreview } from "./DiscordPreview";

interface Props {
  project: Project;
  flow: Flow;
}

export function RunnerPanel({ project, flow }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<DiscordEvent[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setLogs([]);
    setEvents([]);
    setRunning(true);
    await runFlow({
      project,
      flow,
      onLog: (e) => setLogs((prev) => [...prev, e]),
      onDiscordEvent: (e) => setEvents((prev) => [...prev, e]),
    });
    setRunning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        <h3 className="font-semibold text-sm">Test Runner</h3>
        <span className="text-xs text-muted-foreground">Discord-style live preview</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setLogs([]); setEvents([]); }}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
          <Button size="sm" onClick={run} disabled={running}>
            <Play className="w-3.5 h-3.5 mr-1" />
            {running ? "Running…" : "Run flow"}
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="min-h-0 border-r">
          <DiscordPreview events={events} />
        </div>
        <div className="min-h-0 flex flex-col">
          <div className="px-3 py-2 border-b text-xs font-semibold uppercase text-muted-foreground shrink-0">
            Logs
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1 font-mono text-[11px]">
              {logs.length === 0 && (
                <div className="text-muted-foreground">
                  Click <strong>Run flow</strong>. API calls actually execute; Discord actions are
                  simulated and shown in the chat preview.
                </div>
              )}
              {logs.map((l, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      l.level === "error"
                        ? "text-destructive"
                        : l.level === "warn"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : ""
                    }
                  >
                    [{l.level}]
                  </span>
                  <span className="break-all">{l.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}