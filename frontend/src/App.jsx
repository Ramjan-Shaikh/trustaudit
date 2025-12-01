import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ChatPanel from "./components/ChatPanel";
import LoginPage from "./components/LoginPage";
import WelcomeScreen from "./components/WelcomeScreen";
import GraphPage from "./pages/GraphPage";
import { getCurrentUser } from "./api";

export default function App() {
  const [showAudit, setShowAudit] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token is valid by fetching user info
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          setIsAuthenticated(true);
          // Show welcome screen - user must click "Get Started" to proceed
          setShowWelcome(true);
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem("token");
          setIsAuthenticated(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    // After login, fetch user info
    getCurrentUser()
      .then((userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        // Show welcome screen - user must click "Get Started" to proceed
        setShowWelcome(true);
        navigate("/chat", { replace: true });
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    navigate("/chat");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            🔍
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-white"
          >
            Loading...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show welcome screen
  if (showWelcome && user) {
    return (
      <WelcomeScreen
        username={user.username}
        onGetStarted={() => setShowWelcome(false)}
      />
    );
  }

  const navLinkClasses = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-semibold transition-all ${
      isActive ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700/70 text-gray-200 hover:bg-gray-600/70"
    }`;

  const isGraphRoute = location.pathname.startsWith("/graph");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-6 space-y-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100"
      >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          {user && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-200"
            >
              Welcome, <span className="text-blue-300 font-semibold">{user.username}</span>
            </motion.p>
          )}
        </div>

        <motion.div className="flex flex-wrap gap-3 items-center">
          <NavLink to="/chat" className={navLinkClasses}>
            💬 Chat
          </NavLink>
          <NavLink to="/graph" className={navLinkClasses}>
            🧠 Memory Graph
          </NavLink>
          {!isGraphRoute && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAudit(!showAudit)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold shadow-lg transition-all"
            >
              {showAudit ? "Hide Audit Review" : "Show Audit Review"}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-semibold shadow-lg transition-all"
          >
            Logout
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPanel showAudit={showAudit} />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </motion.div>
    </motion.div>
  );
}
