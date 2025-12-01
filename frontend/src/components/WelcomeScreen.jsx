import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function WelcomeScreen({ onGetStarted, username }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const iconVariants = {
    animate: {
      rotate: [0, 10, -10, 0],
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-20"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center z-10 px-6"
      >
        <motion.div variants={iconVariants} animate="animate" className="mb-8">
          <div className="text-8xl mb-4">🔍</div>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
        >
          TrustAudit++
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-gray-300 mb-2"
        >
          Welcome back, <span className="text-blue-400 font-semibold">{username}</span>!
        </motion.p>

        <motion.p
          variants={itemVariants}
          className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto"
        >
          Your intelligent AI assistant with built-in auditing and memory visualization
        </motion.p>

        <motion.div variants={itemVariants}>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Get Started →
          </motion.button>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex justify-center gap-8 text-gray-500"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center"
          >
            <div className="text-3xl mb-2">🤖</div>
            <div className="text-sm">AI Powered</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center"
          >
            <div className="text-3xl mb-2">🔒</div>
            <div className="text-sm">Secure</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm">Visualized</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

