"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useVisibility } from "@/hooks/useVisibility";
import { useWebSocket } from "@/hooks/useWebSocket";
import { motion } from "framer-motion";
import { Compass, Satellite } from "lucide-react";

// Dynamically import Earth3D to prevent Server-Side Rendering (SSR) crashes with Three.js
const Earth3D = dynamic(() => import("@/components/Earth3D"), {
  ssr: false,
});

// --- Framer Motion Animation Variants ---
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function Home() {
  // 1. Target Coordinates (Defaulting to Tromsø, Norway)
  const [targetLat, setTargetLat] = useState(69.65);
  const [targetLon, setTargetLon] = useState(18.96);

  // 2. Global Space Weather Polling (NOAA Data)
  const { status, loading: swLoading } = useSpaceWeather();
  
  // 3. Hyper-Local Meteorological Polling (Meteoblue + Ephem)
  const { visibility, loading: visLoading } = useVisibility(targetLat, targetLon);

  // 4. Real-Time WebSocket Connection
  const [liveAlerts, setLiveAlerts] = useState([]);
  const handleNewAlert = useCallback((msg) => {
    if (msg.type === "SPACE_WEATHER_ALERT" || msg.type === "VISIBILITY_THRESHOLD_MET") {
      setLiveAlerts((prev) => [msg, ...prev].slice(0, 5));
    }
  }, []);
  
  const { connected } = useWebSocket(handleNewAlert);

  // Computed States
  const isLoading = swLoading || visLoading;
  const isAlertActive = status?.alerts_active || liveAlerts.length > 0;

  return (
    <div className="h-full w-full p-4 overflow-y-auto custom-scrollbar">
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-4 max-w-7xl mx-auto h-full"
      >
        
        {/* =========================================
            MAIN 3D VISUALIZATION TILE (Spans 9 cols)
            ========================================= */}
        <motion.div variants={item} className="md:col-span-8 lg:col-span-9 h-[450px] md:h-[600px] relative rounded-2xl bg-surface border border-slate-800/60 overflow-hidden shadow-2xl flex flex-col">
          
          <div className="absolute top-6 left-6 z-10 pointer-events-none">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-[0.2em] uppercase mb-1 drop-shadow-lg">
              Project <span className="text-cyan-400">Orion</span>
            </h1>
            <p className="text-[10px] md:text-xs font-mono text-cyan-300 max-w-sm leading-relaxed mb-4">
              Hyper-Local Aurora Forecasting & Astrophotographer Intelligence Platform.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {['Live DSCOVR Telemetry', 'OVATION Grid', 'Dark Sky Routing'].map((badge) => (
                <span key={badge} className="bg-void/80 backdrop-blur border border-slate-700/50 text-slate-300 text-[9px] font-mono px-2 py-1 rounded uppercase tracking-wider">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <Earth3D />

          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
             <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest bg-void/80 px-3 py-1.5 rounded border border-cyan-900/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
               Team: AstroNots
             </span>
          </div>
        </motion.div>


        {/* =========================================
            SIDE COMMAND STACK (Spans 3 cols)
            ========================================= */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 min-h-0">
          
          {/* --- TILE 1: SYSTEM STATE --- */}
          <motion.div variants={item} className="rounded-2xl bg-surface border border-slate-800/60 p-5 relative overflow-hidden shrink-0">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${isAlertActive ? 'bg-red-500' : 'bg-cyan-500'}`} />
            
            <h2 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2 flex justify-between items-center relative z-10">
              System State <Satellite size={12} className={connected ? "text-cyan-400 animate-pulse" : "text-red-500"} />
            </h2>
            
            <div className="relative z-10">
              {swLoading ? (
                <div className="animate-pulse text-xl font-black text-slate-600">SYNCING...</div>
              ) : (
                <>
                  <div className={`text-4xl font-black ${isAlertActive ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-white'}`}>
                    {isAlertActive ? 'ALERT' : 'NOMINAL'}
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Source: {status?.using_ace_failover ? <span className="text-violet-400 font-bold">ACE (Failover)</span> : <span className="text-cyan-400 font-bold">DSCOVR (Primary)</span>}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      Stream: {connected ? <span className="text-emerald-400">Live Socket Active</span> : <span className="text-red-400">Socket Offline</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* --- TILE 2: VISIBILITY SCORE --- */}
          <motion.div variants={item} className="flex-1 rounded-2xl bg-surface border border-slate-800/60 p-5 flex flex-col relative overflow-hidden">
            <h2 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2 flex justify-between items-center relative z-10">
              Target Visibility <Compass size={12} className="text-violet-400" />
            </h2>
            
            {visLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="text-6xl font-black text-white text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  {visibility?.composite_score || 0}<span className="text-2xl text-slate-600">/100</span>
                </div>
                
                <p className="text-center text-[10px] font-mono text-violet-400 mt-2 min-h-[30px]">
                  {visibility?.recommendation || "Awaiting target lock..."}
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-6 text-[9px] font-mono text-slate-400">
                  <div className="bg-void p-2 rounded border border-slate-800 flex flex-col items-center">
                    <span className="text-slate-600 mb-1">CLOUDS</span>
                    <span className={`text-sm font-bold ${visibility?.components?.cloud_cover_pct > 50 ? 'text-red-400' : 'text-white'}`}>
                      {visibility?.components?.cloud_cover_pct ?? 0}%
                    </span>
                  </div>
                  <div className="bg-void p-2 rounded border border-slate-800 flex flex-col items-center">
                    <span className="text-slate-600 mb-1">BORTLE</span>
                    <span className="text-sm font-bold text-white">
                      CLASS {visibility?.darkness_breakdown?.bortle_class ?? '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}