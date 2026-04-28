import { useCallback, useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomFlowNode } from "./FlowNode";
import type { Flow } from "@/lib/types";
import { NODE_TYPES } from "@/lib/nodes";

const NODE_TYPES_MAP: Record<string, typeof CustomFlowNode> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, CustomFlowNode]),
);

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
      const next = addEdge({ ...c, animated: true }, flow.edges as unknown as Edge[]);
      onChange({ ...flow, edges: next as unknown as Flow["edges"] });
    },
    [flow, onChange],
  );

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
      nodeTypes={NODE_TYPES_MAP}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} />
      <MiniMap pannable zoomable className="!bg-card" />
      <Controls className="!bg-card !border" />
    </ReactFlow>
  );
}