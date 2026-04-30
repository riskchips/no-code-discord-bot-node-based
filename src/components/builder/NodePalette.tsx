import { useMemo, useState } from "react";
import { NODE_TYPES, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/nodes";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus } from "lucide-react";

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
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search nodes…"
            className="h-8 text-xs pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: CATEGORY_COLORS[cat] }}
                />
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {items.map((n) => (
                  <button
                    key={n.type}
                    onClick={() => onAdd(n.type)}
                    title={n.description}
                    className="group w-full text-left px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2 text-xs border border-transparent hover:border-border"
                  >
                    <span className="font-medium truncate flex-1">{n.label}</span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-70 shrink-0" />
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