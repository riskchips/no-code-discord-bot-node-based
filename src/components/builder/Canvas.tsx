import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomFlowNode } from "./FlowNode";
import type { Flow } from "@/lib/types";
import { NODE_TYPES } from "@/lib/nodes";

const NODE_TYPES_MAP: Record<string, typeof CustomFlowNode> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, CustomFlowNode]),
);

const DEFAULT_EDGE_OPTIONS = {
  animated: true,
  style: { strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed },
};

interface Props {
  flow: Flow;
  onChange: (flow: Flow) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function Canvas({ flow, onChange, selectedId, onSelect }: Props) {
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, flow.nodes as unknown as Node[]);
      onChange({ ...flow, nodes: next as unknown as Flow["nodes"] });
    },
    [flow, onChange],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, flow.edges as unknown as Edge[]);
      onChange({ ...flow, edges: next as unknown as Flow["edges"] });
    },
    [flow, onChange],
  );
  const onConnect = useCallback(
    (c: Connection) => {
      const next = addEdge({ ...c, ...DEFAULT_EDGE_OPTIONS }, flow.edges as unknown as Edge[]);
      onChange({ ...flow, edges: next as unknown as Flow["edges"] });
    },
    [flow, onChange],
  );

  // Click an edge → delete it (with Alt) OR select & let Delete key remove it.
  const onEdgeClick = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      if (e.altKey || e.metaKey) {
        onChange({ ...flow, edges: flow.edges.filter((x) => x.id !== edge.id) });
      }
    },
    [flow, onChange],
  );

  // Right-click an edge → instant delete
  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault();
      onChange({ ...flow, edges: flow.edges.filter((x) => x.id !== edge.id) });
    },
    [flow, onChange],
  );

  // Keyboard delete for selected nodes/edges
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      // selected edges / nodes are reflected via React Flow's `selected` flag
      const selectedEdgeIds = (flow.edges as unknown as Edge[])
        .filter((x) => (x as Edge & { selected?: boolean }).selected)
        .map((x) => x.id);
      if (selectedEdgeIds.length) {
        onChange({ ...flow, edges: flow.edges.filter((x) => !selectedEdgeIds.includes(x.id)) });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flow, onChange]);

  const styledNodes = flow.nodes.map((n) => ({
    ...n,
    selected: n.id === selectedId,
  }));

  return (
    <ReactFlow
      nodes={styledNodes as unknown as Node[]}
      edges={flow.edges as unknown as Edge[]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, n) => onSelect(n.id)}
      onPaneClick={() => onSelect(null)}
      onEdgeClick={onEdgeClick}
      onEdgeContextMenu={onEdgeContextMenu}
      nodeTypes={NODE_TYPES_MAP}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      fitView
      proOptions={{ hideAttribution: true }}
      deleteKeyCode={["Delete", "Backspace"]}
    >
      <Background gap={20} size={1.2} />
      <MiniMap pannable zoomable className="!bg-card !border" />
      <Controls className="!bg-card !border !shadow-md" />
    </ReactFlow>
  );
}