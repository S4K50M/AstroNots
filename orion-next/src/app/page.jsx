"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useVisibility } from "@/hooks/useVisibility";
import { useWebSocket } from "@/hooks/useWebSocket";
import { motion } from "framer-motion";
import { Compass, Satellite } from "lucide-react";

// Dynamically import Earth3D to prevent SSR crashes
const Earth3D = dynamic(() => import("@/components/Earth3D"), { ssr: false });

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function Home() {
  const [targetLat, setTargetLat] = useState(69.65);
  const [targetLon, setTargetLon] = useState(18.96);

  const { status, loading: swLoading } = useSpaceWeather();
  const { visibility, loading: visLoading } = useVisibility(targetLat, targetLon);

  const [liveAlerts, setLiveAlerts] = useState([]);
  const handleNewAlert = useCallback((msg) => {
    if (msg.type === "SPACE_WEATHER_ALERT" || msg.type === "VISIBILITY_THRESHOLD_MET") {
      setLiveAlerts((prev) => [msg, ...prev].slice(0, 5));
    }
  }, []);
  
  const { connected } = useWebSocket(handleNewAlert);

  const isAlertActive = status?.alerts_active || liveAlerts.length > 0;

  return (
    // Relative wrapper to contain the absolute 3D background
    <div className="relative h-full w-full p-4 overflow-y-auto custom-scrollbar">
      
      {/* === BACKGROUND 3D LAYER === */}
      <Earth3D />

      {/* === FOREGROUND UI LAYER === */}
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto h-full pt-10"
      >
        
        {/* =========================================
            LEFT HERO TEXT (Floats over the Earth)
            ========================================= */}
        <motion.div variants={item} className="md:col-span-8 lg:col-span-9 flex flex-col justify-start pt-10 px-4 pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            Aurora <span className="text-cyan-400">Intel</span>
          </h1>
          <p className="text-xs md:text-sm font-mono text-cyan-300 max-w-lg leading-relaxed mb-6 drop-shadow-md">
            Hyper-Local Aurora Forecasting & Astrophotographer Intelligence Platform.
          </p>
          
          <div className="flex flex-wrap gap-3">
            {['Live DSCOVR Telemetry', 'OVATION Grid', 'Dark Sky Routing'].map((badge) => (
              <span key={badge} className="bg-surface/40 backdrop-blur-md border border-cyan-900/50 text-cyan-100 text-[10px] font-mono px-3 py-1.5 rounded-sm uppercase tracking-widest shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-auto pb-10">
             <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-surface/40 backdrop-blur-md px-4 py-2 rounded-sm border border-cyan-900/50">
               Team: AstroNots
             </span>
          </div>
        </motion.div>


        {/* =========================================
            RIGHT COMMAND STACK (Glassmorphism Tiles)
            ========================================= */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 min-h-0 pb-10">
          
          {/* --- TILE 1: SYSTEM STATE --- */}
          <motion.div variants={item} className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-slate-700/50 p-5 relative overflow-hidden shrink-0 shadow-2xl">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-30 transition-colors duration-1000 ${isAlertActive ? 'bg-red-500' : 'bg-cyan-500'}`} />
            
            <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2 flex justify-between items-center relative z-10">
              System State <Satellite size={12} className={connected ? "text-cyan-400 animate-pulse" : "text-red-500"} />
            </h2>
            
            <div className="relative z-10">
              {swLoading ? (
                <div className="animate-pulse text-xl font-black text-slate-500">SYNCING...</div>
              ) : (
                <>
                  <div className={`text-4xl font-black tracking-wider ${isAlertActive ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-white'}`}>
                    {isAlertActive ? 'ALERT' : 'NOMINAL'}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-3">
                    <div className="text-[10px] font-mono text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Source: {status?.using_ace_failover ? <span className="text-violet-400">ACE (Failover)</span> : <span className="text-cyan-400">DSCOVR</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></span>
                      Stream: {connected ? <span className="text-emerald-400">Live Uplink</span> : <span className="text-red-400">Offline</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* --- TILE 2: VISIBILITY SCORE --- */}
          <motion.div variants={item} className="flex-1 rounded-2xl bg-surface/60 backdrop-blur-xl border border-slate-700/50 p-5 flex flex-col relative overflow-hidden shadow-2xl">
            <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2 flex justify-between items-center relative z-10">
              Target Visibility <Compass size={12} className="text-violet-400" />
            </h2>
            
            {visLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="text-7xl font-black text-white text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                  {visibility?.composite_score || 0}<span className="text-2xl text-slate-500">/100</span>
                </div>
                
                <p className="text-center text-[11px] font-mono text-violet-300 mt-3 min-h-[30px] leading-relaxed">
                  {visibility?.recommendation || "Awaiting target lock..."}
                </p>
                
                <div className="grid grid-cols-2 gap-3 mt-6 text-[10px] font-mono text-slate-400">
                  <div className="bg-void/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center shadow-inner">
                    <span className="text-slate-500 mb-1 tracking-widest">CLOUDS</span>
                    <span className={`text-base font-bold ${visibility?.components?.cloud_cover_pct > 50 ? 'text-red-400' : 'text-cyan-300'}`}>
                      {visibility?.components?.cloud_cover_pct ?? 0}%
                    </span>
                  </div>
                  <div className="bg-void/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center shadow-inner">
                    <span className="text-slate-500 mb-1 tracking-widest">BORTLE</span>
                    <span className="text-base font-bold text-violet-300">
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