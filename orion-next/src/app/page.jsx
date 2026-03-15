"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useVisibility } from "@/hooks/useVisibility";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "@/contexts/LocationContext";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Satellite, TriangleAlert } from "lucide-react";

// Dynamically import Earth3D to prevent SSR crashes
const Earth3D = dynamic(() => import("@/components/Earth3D"), { ssr: false });
const AuroraMap = dynamic(() => import("@/components/AuroraMap"), { ssr: false });

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

const starParticles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${((i * 29) % 100)}%`,
  top: `${((i * 17 + 11) % 100)}%`,
  duration: 8 + (i % 6),
  delay: (i % 7) * 0.6,
  size: i % 3 === 0 ? 3 : 2
}));

function fmt(v, digits = 1) {
  return typeof v === "number" ? v.toFixed(digits) : "--";
}

export default function Home() {
  const { latitude, longitude } = useLocation();

  const { status, mag, plasma, ovation, kp, loading: swLoading } = useSpaceWeather();
  const { visibility, loading: visLoading } = useVisibility(latitude, longitude);

  const [liveAlerts, setLiveAlerts] = useState([]);
  const handleNewAlert = useCallback((msg) => {
    if (msg.type === "SPACE_WEATHER_ALERT" || msg.type === "VISIBILITY_THRESHOLD_MET") {
      setLiveAlerts((prev) => [msg, ...prev].slice(0, 5));
    }
  }, []);
  
  const { connected } = useWebSocket(handleNewAlert);

  const latestAlert = liveAlerts[0];
  const isAlertActive = status?.alerts_active || liveAlerts.length > 0;
  const score = visibility?.composite_score ?? 0;
  const moonPct = Math.round(visibility?.darkness_breakdown?.lunar_score ?? 0);
  const cloudPct = Math.round(visibility?.components?.cloud_cover_pct ?? 0);
  const bz = mag?.latest?.bz_gsm ?? mag?.latest?.bz;
  const windSpeed = plasma?.latest?.speed;
  const kpNow = kp?.latest?.kp;

  const liveStripItems = useMemo(() => ([
    { label: "Bz", value: `${fmt(bz, 1)} nT` },
    { label: "Solar Wind", value: `${windSpeed != null ? Math.round(windSpeed) : "--"} km/s` },
    { label: "Kp", value: fmt(kpNow, 1) },
    { label: "Cloud", value: `${cloudPct}%` },
    { label: "Moon", value: `${moonPct}%` },
    { label: "Score", value: `${score}/100` }
  ]), [bz, windSpeed, kpNow, cloudPct, moonPct, score]);

  const statusChecks = [
    { name: "DSCOVR Connected", ok: !status?.using_ace_failover },
    { name: "Open-Meteo Connected", ok: !visLoading && !!visibility },
    { name: "Ephem Running", ok: !!visibility?.darkness_breakdown },
    { name: "WebSocket Active", ok: connected }
  ];

  const alertHeadline = latestAlert?.message || "Bz dropped southward, aurora probability increased";

  return (
    // Relative wrapper to contain the absolute 3D background
    <div className="relative h-full w-full p-3 sm:p-4 overflow-y-auto custom-scrollbar">
      
      {/* === BACKGROUND 3D LAYER === */}
      <Earth3D />

      {/* === STAR PARTICLES LAYER === */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {starParticles.map((star) => (
          <motion.span
            key={star.id}
            className="absolute rounded-full bg-cyan-200/80"
            style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
            animate={{ opacity: [0.2, 1, 0.3], y: [0, -18, 0] }}
            transition={{ duration: star.duration, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] max-w-[540px] max-h-[540px] rounded-full border border-cyan-400/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* === ALERT POPUP === */}
      <AnimatePresence>
        {(isAlertActive || latestAlert) && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className="fixed top-3 left-3 right-3 sm:top-20 sm:right-6 sm:left-auto z-50 sm:max-w-sm rounded-xl border border-rose-400/40 bg-rose-950/70 backdrop-blur-xl p-3 sm:p-4 shadow-[0_0_35px_rgba(244,63,94,0.35)] animate-pulse"
          >
            <div className="flex items-center gap-2 text-rose-200 text-xs font-bold tracking-widest uppercase">
              <TriangleAlert size={14} /> Alert
            </div>
            <p className="mt-2 text-[11px] sm:text-[12px] leading-relaxed text-rose-100 break-words">{alertHeadline}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === FOREGROUND UI LAYER === */}
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 max-w-7xl mx-auto h-full pt-20 sm:pt-10"
      >

        {/* =========================================
            LEFT HERO TEXT (Floats over the Earth)
            ========================================= */}
        <motion.div variants={item} className="md:col-span-8 lg:col-span-9 flex flex-col justify-start pt-2 sm:pt-10 px-1 sm:px-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-[0.12em] sm:tracking-[0.2em] uppercase mb-2 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            Aurora <span className="text-cyan-400">Intel</span>
          </h1>

          <div className="mb-4 sm:mb-5 max-w-2xl border-l-2 border-cyan-300/40 pl-3 sm:pl-4">
            <p className="text-[13px] sm:text-sm md:text-base text-cyan-100/95 leading-relaxed tracking-wide">
              "From solar wind to dark-sky roads, Aurora Intel turns live space weather into clear, hyper-local decisions."
            </p>
            <p className="text-[10px] sm:text-[11px] font-mono text-cyan-300/70 mt-2 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
              Real-time aurora intelligence for observers and astrophotographers.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {["REAL-TIME DATA", "HYPER LOCAL", "ROUTING ENGINE", "VISIBILITY SCORE", "WEBSOCKET ALERTS"].map((tag) => (
              <span key={tag} className="text-[10px] uppercase tracking-widest text-cyan-100 bg-cyan-500/10 border border-cyan-400/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-5 rounded-xl border border-slate-700/50 bg-slate-950/45 backdrop-blur-xl p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {liveStripItems.map((itemData) => (
                <div key={itemData.label} className="rounded-lg border border-slate-800 bg-black/30 px-2 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{itemData.label}</div>
                  <div className="text-xs md:text-sm font-bold text-cyan-100 mt-1">{itemData.value}</div>
                </div>
              ))}
            </div>
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
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 min-h-0 pb-8 sm:pb-10">
          
          {/* --- TILE 1: SYSTEM STATE --- */}
          <motion.div variants={item} className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-5 relative overflow-hidden shrink-0 shadow-2xl">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-30 transition-colors duration-1000 ${isAlertActive ? 'bg-red-500' : 'bg-cyan-500'}`} />
            
            <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2 flex justify-between items-center relative z-10">
              System State <Satellite size={12} className={connected ? "text-cyan-400 animate-pulse" : "text-red-500"} />
            </h2>
            
            <div className="relative z-10">
              {swLoading ? (
                <div className="animate-pulse text-xl font-black text-slate-500">SYNCING...</div>
              ) : (
                <>
                  <div className={`text-3xl sm:text-4xl font-black tracking-wider ${connected ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                    {connected ? 'LIVE' : 'DEGRADED'}
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-3">
                    {statusChecks.map((check) => (
                      <div key={check.name} className="text-[10px] font-mono text-slate-300 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${check.ok ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></span>
                        <span className={check.ok ? 'text-emerald-300' : 'text-rose-300'}>{check.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* --- TILE 2: VISIBILITY SCORE --- */}
          <motion.div variants={item} className="flex-1 rounded-2xl bg-surface/60 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-5 flex flex-col relative overflow-hidden shadow-2xl">
            <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2 flex justify-between items-center relative z-10">
              Target Visibility <Compass size={12} className="text-violet-400" />
            </h2>
            
            {visLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white text-center drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
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

          {/* --- TILE 3: MINI MAP PREVIEW --- */}
          <motion.div variants={item} className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-slate-700/50 p-3 relative overflow-hidden shadow-2xl h-44 sm:h-52">
            <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 border-b border-slate-700/50 pb-2 relative z-10">
              Aurora Map Preview
            </h2>
            <div className="h-[calc(100%-32px)] rounded-lg overflow-hidden">
              <AuroraMap ovation={ovation} userLat={latitude} userLon={longitude} score={score} />
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}