import { useMemo, useState } from "react";
import { NODE_TYPES, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/nodes";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  onAdd: (type: string) => void;
}

export function NodePalette({ onAdd }: Props) {
  const [q, setQ] = useState("");
  const grouped = useMemo(() => {
    const search = q.trim().toLowerCase();
    const filtered = NODE_TYPES.filter(
      (n) =>
        !search ||
        n.label.toLowerCase().includes(search) ||
        n.description.toLowerCase().includes(search) ||
        n.category.includes(search),
    );
    const m: Record<string, typeof NODE_TYPES> = {};
    for (const n of filtered) (m[n.category] ||= []).push(n);
    return m;
  }, [q]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search nodes…"
          className="h-9"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {items.map((n) => (
                  <button
                    key={n.type}
                    onClick={() => onAdd(n.type)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CATEGORY_COLORS[n.category] }}
                    />
                    <span className="truncate">{n.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}