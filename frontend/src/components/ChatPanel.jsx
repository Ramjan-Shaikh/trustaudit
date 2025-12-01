import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  executeTask,
  getChatHistory,
  clearChatHistory,
  exportChatHistory,
  exportChatHistoryAsText,
  auditTask,
} from "../api";

export default function ChatPanel({ showAudit }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async () => {
    try {
      const data = await getChatHistory(null, 100);
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        // Use the session_id from the last message
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage.session_id) {
          setSessionId(lastMessage.session_id);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setLoading(true);

    // Add user message to UI immediately
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      setLoadingStatus("Generating response...");
      const res = await executeTask(userMessage, sessionId);

      // Update session_id if we got a new one
      if (res.session_id) {
        setSessionId(res.session_id);
      }

      // Check if response was improved
      if (res.improved) {
        setLoadingStatus("Response improved based on feedback...");
      }

      // Parse audit from metadata if available
      let auditData = res.audit;
      if (res.result && res.result.metadata) {
        try {
          const metadata = JSON.parse(res.result.metadata);
          if (metadata.audit) auditData = metadata.audit;
        } catch (e) {
          // Ignore parse errors
        }
      }
      setAudit(auditData);

      // Reload chat history to get the persisted messages
      await loadChatHistory();
      setLoadingStatus("");
    } catch (err) {
      // Add error message
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `[ERROR] ${err.message}`,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all chat history?")) {
      try {
        await clearChatHistory(sessionId);
        setMessages([]);
        setSessionId(null);
        setAudit(null);
      } catch (err) {
        console.error("Failed to clear history:", err);
        alert("Failed to clear chat history");
      }
    }
  };

  const handleExportHistory = (format = "json") => {
    if (messages.length === 0) {
      alert("No messages to export");
      return;
    }

    if (format === "json") {
      exportChatHistory(messages);
    } else {
      exportChatHistoryAsText(messages);
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => {
      // You could add a toast notification here
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  const handleReauditMessage = async (msg) => {
    if (!msg.message_metadata) return;

    try {
      const metadata = JSON.parse(msg.message_metadata);
      const resultId = metadata.result_id;
      if (!resultId) return;

      setLoadingStatus("Re-auditing this answer...");
      const res = await auditTask(resultId);
      if (res && res.audit) {
        setAudit(res.audit);
      }
      setLoadingStatus("");
    } catch (err) {
      console.error("Failed to re-audit message:", err);
      alert("Failed to re-audit this answer. Please try again.");
      setLoadingStatus("");
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : messages;


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xl flex flex-col border border-gray-700 overflow-x-hidden" style={{ height: "600px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-4"
      >
        <motion.h2
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent"
        >
          💬 TrustAudit++ Chat
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-2"
        >
          {messages.length > 0 && (
            <>
              <motion.input
                whileFocus={{ scale: 1.05 }}
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm bg-gray-700/50 border border-gray-600 text-white px-3 py-1 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <motion.div className="relative group">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1 rounded-lg shadow-lg transition-all"
                  onClick={() => handleExportHistory("json")}
                  title="Export as JSON"
                >
                  📥 Export
                </motion.button>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-1 w-32 bg-gray-700 rounded-lg shadow-xl border border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10"
                >
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => handleExportHistory("json")}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-600 rounded-t-lg"
                  >
                    Export as JSON
                  </motion.button>
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => handleExportHistory("text")}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-600 rounded-b-lg"
                  >
                    Export as Text
                  </motion.button>
                </motion.div>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearHistory}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg shadow-lg transition-all"
              >
                Clear History
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Chat Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden mb-4 space-y-4 pr-2"
        style={{ maxHeight: "450px" }}
      >
        {filteredMessages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 mt-8"
          >
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {searchQuery ? "No messages match your search." : "No messages yet. Start a conversation!"}
            </motion.p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredMessages.map((msg, index) => {
              // Check if message was improved
              let isImproved = false;
              let iterations = null;
              try {
                if (msg.message_metadata) {
                  const metadata = JSON.parse(msg.message_metadata);
                  isImproved = metadata.improved || false;
                  iterations = metadata.iterations || null;
                }
              } catch (e) {
                // Ignore parse errors
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100
                  }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`max-w-[80%] rounded-lg p-3 relative group shadow-lg overflow-hidden ${msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                        : "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {msg.role === "user" ? "You" : "🤖 Assistant"}
                        {isImproved && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full shadow-md"
                          >
                            ✨ Improved
                          </motion.span>
                        )}
                        {iterations && iterations > 1 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full shadow-md"
                          >
                            {iterations}x
                          </motion.span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopyMessage(msg.content)}
                          className="text-xs bg-gray-600/80 hover:bg-gray-500 px-2 py-1 rounded-lg backdrop-blur-sm"
                          title="Copy message"
                        >
                          📋
                        </motion.button>
                        {msg.role === "assistant" && msg.message_metadata && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReauditMessage(msg)}
                            className="text-xs bg-yellow-600/80 hover:bg-yellow-500 px-2 py-1 rounded-lg backdrop-blur-sm"
                            title="Re-audit this answer"
                          >
                            🔍 Re-audit
                          </motion.button>
                        )}
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="whitespace-pre-wrap break-words overflow-wrap-anywhere"
                    >
                      {msg.content}
                    </motion.div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0px rgba(59, 130, 246, 0)",
                  "0 0 20px rgba(59, 130, 246, 0.5)",
                  "0 0 0px rgba(59, 130, 246, 0)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-3 text-gray-100 border border-blue-500/30"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🤖 Assistant
                </motion.div>
                <div className="flex gap-1">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                  ></motion.div>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                  ></motion.div>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                  ></motion.div>
                </div>
              </div>
              {loadingStatus && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-blue-300 mt-2 flex items-center gap-2"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⚡
                  </motion.span>
                  {loadingStatus}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Audit Review Section (if enabled and available) */}
      <AnimatePresence>
        {showAudit && audit && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mb-4 bg-gradient-to-br from-gray-900 to-yellow-900/20 p-3 rounded-lg border border-yellow-500/50 shadow-lg"
          >
            <motion.h4
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-yellow-400 font-semibold mb-2 text-sm flex items-center gap-2"
            >
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                🔍
              </motion.span>
              Audit Review
            </motion.h4>
            <div className="text-xs text-gray-300">
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <strong>Verdict:</strong>{" "}
                <span className={`font-semibold ${audit.verdict === "pass" ? "text-green-400" :
                    audit.verdict === "revise" ? "text-yellow-400" :
                      "text-red-400"
                  }`}>
                  {audit.verdict || "unknown"}
                </span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <strong>Confidence:</strong>{" "}
                <span className="font-semibold text-blue-400">
                  {audit.confidence !== undefined ? audit.confidence.toFixed(2) : "N/A"}
                </span>
              </motion.p>
              {audit.explanation && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-1"
                >
                  <strong>Explanation:</strong> {audit.explanation}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input field and button */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="flex gap-3"
      >
        <motion.input
          whileFocus={{ scale: 1.02, borderColor: "#3b82f6" }}
          type="text"
          placeholder="Type your message..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === "Escape") {
              setPrompt("");
            }
          }}
          className="flex-grow bg-gray-700/50 border border-gray-600 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          disabled={loading}
        />
        <motion.button
          type="submit"
          disabled={loading || !prompt.trim()}
          whileHover={loading || !prompt.trim() ? {} : { scale: 1.05 }}
          whileTap={loading || !prompt.trim() ? {} : { scale: 0.95 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              ⏳
            </motion.span>
          ) : (
            "Send"
          )}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
