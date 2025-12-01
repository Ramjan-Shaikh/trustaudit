import React, { useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { fetchMemory } from "../api";

export default function MemoryGraph({ onNodeSelect }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);

  const getPosition = (type, index) => {
    const baseY = 100 + index * 150;
    switch (type) {
      case "task":
        return { x: 100, y: baseY };
      case "result":
        return { x: 400, y: baseY };
      case "audit":
        return { x: 700, y: baseY };
      default:
        return { x: 200, y: baseY };
    }
  };

  const formatNodeLabel = (node) => {
    if (node.type === "audit") {
      try {
        // Try to extract key audit fields
        const audit = JSON.parse(node.content.replace(/```json|```/g, "").trim());
        const verdict = audit.verdict || "unknown";
        const conf = audit.confidence ? ` (${audit.confidence})` : "";
        return `AUDIT: ${verdict}${conf}`;
      } catch {
        // fallback if parsing fails
        return `AUDIT: ${node.content.slice(0, 30)}...`;
      }
    }
    return `${node.type.toUpperCase()}: ${node.content.slice(0, 35)}...`;
  };

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await fetchMemory();
      if (data?.nodes && data?.edges) {
        const formattedNodes = data.nodes.map((n, i) => ({
          id: n.id,
          data: {
            label: formatNodeLabel(n),
            content: n.content,
            type: n.type,
          },
          position: getPosition(n.type, i),
          style: {
            background:
              n.type === "task"
                ? "#3b82f6"
                : n.type === "result"
                ? "#22c55e"
                : "#facc15",
            color: "black",
            borderRadius: 10,
            padding: 10,
            border: "1px solid #222",
            fontSize: 12,
            width: 200,
            cursor: "pointer",
          },
        }));

        const formattedEdges = data.edges.map((e) => ({
          id: e.id || `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: true,
          style: {
            strokeWidth: 2,
            stroke:
              e.label === "GeneratedBy"
                ? "#60a5fa"
                : e.label === "CheckedBy"
                ? "#facc15"
                : "#a3a3a3",
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: "rgba(241, 247, 248, 0.6)", color: "#fff" },
        }));

        setNodes(formattedNodes);
        setEdges(formattedEdges);
      }
    } catch (err) {
      console.error("Error loading memory graph:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  return (
    <div className="h-[600px] w-full bg-gray-900 rounded-lg p-3 border border-gray-700 shadow-xl">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">🧩 Memory Graph</h3>
        <button
          onClick={loadGraph}
          disabled={loading}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition text-sm"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      <div
        style={{
          height: "550px",
          background: "#020617",
          borderRadius: 12,
          border: "1px solid #1e293b",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onNodeSelect && onNodeSelect(node)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.25}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <MiniMap
            className="!bg-slate-900/90 !border !border-slate-600 rounded-lg shadow-lg"
            style={{ height: 140, width: 220 }}
            nodeColor={(n) => {
              const type = n.data?.type || n.type;
              if (type === "task") return "#3b82f6";
              if (type === "result") return "#22c55e";
              if (type === "audit") return "#eab308";
              return "#64748b";
            }}
            nodeStrokeColor="#e5e7eb"
            nodeStrokeWidth={1.5}
            zoomable
            pannable
          />
          <Controls />
          <Background gap={24} color="#1e293b" />
        </ReactFlow>
      </div>
    </div>
  );
}
