import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signup, login } from "../api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage("Please enter both username and password");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      if (isSignup) {
        await signup(username, password);
        setMessage("Signup successful! Please log in.");
        setIsSignup(false);
        setPassword(""); // Clear password field
      } else {
        const res = await login(username, password);
        localStorage.setItem("token", res.access_token);
        onLogin();
      }
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.detail || err.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-5xl mb-4"
          >
            🔍
          </motion.div>
          <motion.h2
            key={isSignup ? "signup" : "login"}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
          >
            {isSignup ? "Create Account" : "Welcome Back"}
          </motion.h2>
          <p className="text-gray-400 mt-2">
            {isSignup ? "Join TrustAudit++ today" : "Sign in to continue"}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <input
              type="text"
              placeholder="Username"
              className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-gray-700/50 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-lg font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⏳
                  </motion.span>
                  Processing...
                </span>
              ) : (
                isSignup ? "Sign Up" : "Login"
              )}
            </motion.button>
          </motion.div>
        </form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-center text-gray-400"
        >
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <motion.span
            onClick={() => setIsSignup(!isSignup)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-blue-400 cursor-pointer font-semibold hover:text-blue-300 transition-colors"
          >
            {isSignup ? "Login" : "Sign up"}
          </motion.span>
        </motion.p>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 text-center text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-2"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
