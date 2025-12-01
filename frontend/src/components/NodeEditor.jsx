import React, { useState } from "react";
import { editNode } from "../api";

export default function NodeEditor({ node, onClose, onMemoryUpdate }) {
  const [content, setContent] = useState(node?.data?.content || node.content || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Update content when node changes
  React.useEffect(() => {
    setContent(node?.data?.content || node.content || "");
    setMessage("");
  }, [node]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const updated = await editNode(node.id, content);
      if (updated) {
        setMessage("✅ Node updated successfully!");
        // Refresh memory graph after edit
        if (onMemoryUpdate) onMemoryUpdate((prev) => ({ ...prev }));
      }
    } catch (err) {
      console.error("Error updating node:", err);
      setMessage("❌ Failed to update node.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-[500px] max-w-[90%]">
        <h3 className="text-xl font-semibold text-blue-400 mb-4">
          🧩 Edit Node: {node.id}
        </h3>

        <p className="text-sm text-gray-300 mb-2">
          <strong>Type:</strong> {node.type || node.data?.type}
        </p>

        <textarea
          className="w-full p-3 rounded bg-gray-900 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows="6"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {message && <p className="text-sm mt-2">{message}</p>}

        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
