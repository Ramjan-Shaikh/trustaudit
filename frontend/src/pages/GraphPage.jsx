import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MemoryGraph from "../components/MemoryGraph";
import NodeEditor from "../components/NodeEditor";
import { clearMemory } from "../api";

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearing, setClearing] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleClearMemory = async () => {
    if (!window.confirm("Are you sure you want to clear all memory graph data? This cannot be undone.")) {
      return;
    }

    setClearing(true);
    try {
      const result = await clearMemory();
      alert(result.message || "Memory graph cleared successfully!");
      handleRefresh();
    } catch (err) {
      console.error("Error clearing memory:", err);
      alert("Failed to clear memory graph.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800/90 backdrop-blur-sm p-4 rounded-2xl border border-gray-700 shadow-2xl"
      >
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">🧠 Memory Graph</h2>
            <p className="text-sm text-gray-400">
              Visualize how your prompts, results, and audits connect together.
            </p>
          </div>
          <button
            onClick={handleClearMemory}
            disabled={clearing}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearing ? "Clearing..." : "🗑️ Clear Memory"}
          </button>
        </div>

        <MemoryGraph key={refreshKey} onNodeSelect={setSelectedNode} />
      </motion.div>

      <AnimatePresence>
        {selectedNode && (
          <NodeEditor
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onMemoryUpdate={handleRefresh}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

