import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

// Create axios instance with interceptors for authentication
const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      localStorage.removeItem("token");
      window.location.reload();
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      alert("Rate limit exceeded. Please wait a moment before sending another message.");
    } else if (error.response?.status === 400) {
      // Bad request - show user-friendly message
      const message = error.response?.data?.detail || "Invalid request. Please check your input.";
      alert(message);
    }
    return Promise.reject(error);
  }
);

// Authentication endpoints
export async function signup(username, password) {
  const res = await axios.post(`${API_BASE}/auth/signup`, { username, password });
  return res.data;
}

export async function login(username, password) {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  const res = await axios.post(`${API_BASE}/auth/token`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getCurrentUser() {
  const res = await api.get(`${API_BASE}/auth/me`);
  return res.data;
}

// Task and memory endpoints
export async function executeTask(prompt, sessionId = null) {
  const res = await api.post(`${API_BASE}/execute_task`, { prompt, session_id: sessionId });
  return res.data;
}

export async function fetchMemory() {
  const res = await api.get(`${API_BASE}/memory`);
  return res.data;
}

export async function editNode(id, content) {
  const res = await api.post(`${API_BASE}/memory/edit`, { id, content });
  return res.data;
}

export async function clearMemory() {
  const res = await api.delete(`${API_BASE}/memory/clear`);
  return res.data;
}

// Chat endpoints
export async function getChatHistory(sessionId = null, limit = 100) {
  const params = { limit };
  if (sessionId) params.session_id = sessionId;
  const res = await api.get(`${API_BASE}/chat/history`, { params });
  return res.data;
}

export async function getChatSessions(limit = 50) {
  const res = await api.get(`${API_BASE}/chat/sessions`, { params: { limit } });
  return res.data;
}

export async function clearChatHistory(sessionId = null) {
  const params = sessionId ? { session_id: sessionId } : {};
  const res = await api.delete(`${API_BASE}/chat/history`, { params });
  return res.data;
}

// Trigger a fresh audit for an existing result node
export async function auditTask(resultId) {
  const res = await api.post(`${API_BASE}/audit_task`, null, {
    params: { result_id: resultId },
  });
  return res.data;
}

// Export chat history as JSON
export function exportChatHistory(messages) {
  const dataStr = JSON.stringify(messages, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chat-history-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export chat history as text
export function exportChatHistoryAsText(messages) {
  let text = "TrustAudit++ Chat History\n";
  text += "=".repeat(50) + "\n\n";

  messages.forEach((msg) => {
    text += `${msg.role === "user" ? "You" : "Assistant"}: ${msg.content}\n\n`;
  });

  const dataBlob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chat-history-${new Date().toISOString().split("T")[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
