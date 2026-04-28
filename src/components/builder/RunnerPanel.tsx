import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2 } from "lucide-react";
import { runFlow } from "@/lib/runtime";
import type { Flow, LogEntry, Project } from "@/lib/types";

interface Props {
  project: Project;
  flow: Flow;
}

export function RunnerPanel({ project, flow }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setLogs([]);
    setRunning(true);
    await runFlow({
      project,
      flow,
      onLog: (e) => setLogs((prev) => [...prev, e]),
    });
    setRunning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center gap-2">
        <h3 className="font-semibold text-sm">Test Runner</h3>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLogs([])}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
          <Button size="sm" onClick={run} disabled={running}>
            <Play className="w-3.5 h-3.5 mr-1" />
            {running ? "Running…" : "Run flow"}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1 font-mono text-xs">
          {logs.length === 0 && (
            <div className="text-muted-foreground">
              No logs yet. Add a trigger node and click <strong>Run flow</strong> to test.
              Discord-side actions are simulated; API calls really execute.
            </div>
          )}
          {logs.map((l, i) => (
            <div key={i} className="flex gap-2">
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
              <span className="break-all">
                {l.nodeType && <span className="text-muted-foreground">{l.nodeType}: </span>}
                {l.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}