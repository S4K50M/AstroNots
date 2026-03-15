"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-void">
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Outer spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-500/30"
        />
        {/* Inner reverse spinning ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-4 rounded-full border-b-2 border-l-2 border-violet-500/50"
        />
        {/* Core pulse */}
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_20px_#22d3ee]"
        />
      </div>
      <motion.p
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="mt-6 font-mono text-[10px] tracking-[0.3em] text-cyan-500 uppercase"
      >
        Establishing Uplink...
      </motion.p>
    </div>
  );
}