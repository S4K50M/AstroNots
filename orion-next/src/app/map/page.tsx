"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useVisibility } from "@/hooks/useVisibility";
import { motion } from "framer-motion";
import { Map as MapIcon, Crosshair, Activity, Layers, LocateFixed } from "lucide-react";

// Dynamically import Leaflet map to prevent Next.js SSR crashes
const AuroraMap = dynamic(() => import("@/components/AuroraMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <MapIcon size={32} className="text-cyan-500" />
        <span className="text-xs font-mono tracking-widest text-cyan-400">INITIALIZING GEOSPATIAL ENGINE...</span>
      </div>
    </div>
  )
});

export default function MapPage() {
  // Defaulting to Tromsø, Norway
  const [targetLat, setTargetLat] = useState(69.65);
  const [targetLon, setTargetLon] = useState(18.96);

  // Fetching the OVATION grid and Kp data
  const { ovation, kp, loading: swLoading } = useSpaceWeather();
  const { visibility } = useVisibility(targetLat, targetLon);

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      
      {/* === BACKGROUND: THE ACTUAL MAP === */}
      <div className="absolute inset-0 z-0">
        <AuroraMap 
          ovation={ovation} 
          userLat={targetLat} 
          userLon={targetLon} 
        />
      </div>

      {/* === FOREGROUND: TACTICAL HUD === */}
      <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
        
        {/* TOP HUD ROW */}
        <div className="flex justify-between items-start">
          
          {/* Top Left: Title & Live Intel */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-surface/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-xl shadow-2xl pointer-events-auto"
          >
            <h1 className="text-lg md:text-xl font-black tracking-[0.2em] text-white uppercase flex items-center gap-2 mb-3">
              <MapIcon className="text-cyan-400" size={20} /> Tactical <span className="text-slate-500">Grid</span>
            </h1>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-void/50 px-2 py-1.5 rounded border border-slate-700">
                <Activity size={12} className="text-violet-400" />
                <span>KP INDEX:</span>
                <span className="font-bold text-white">{kp?.latest?.kp?.toFixed(2) || '--'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-void/50 px-2 py-1.5 rounded border border-slate-700">
                <Layers size={12} className="text-emerald-400" />
                <span>OVATION MODEL:</span>
                <span className="text-emerald-300">
                  {swLoading ? "SYNCING..." : "ONLINE"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Top Right: Map Controls (Floating Buttons) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-2 pointer-events-auto"
          >
            <button 
              className="bg-surface/80 backdrop-blur-xl border border-slate-700/50 hover:bg-cyan-900/40 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 p-3 rounded-xl transition-all shadow-lg active:scale-95"
              title="Locate Me"
            >
              <LocateFixed size={20} />
            </button>
          </motion.div>

        </div>


        {/* BOTTOM HUD ROW */}
        <div className="grid grid-cols-5 items-stretch gap-2 sm:gap-3 md:gap-4 pb-16 md:pb-0 w-full">
          
          {/* Bottom Left: REVISED Map Legend */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface/80 backdrop-blur-xl border border-slate-700/50 p-2.5 sm:p-3 md:p-4 rounded-xl shadow-2xl pointer-events-auto w-full col-span-4 min-w-0"
          >
            <h3 className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-3">Emission Spectrum (Probability)</h3>
            
            {/* The Accurate Aurora Gradient Bar */}
            <div 
              className="h-2 w-full rounded-full mb-2" 
              style={{ background: 'linear-gradient(to right, rgba(4,120,87,0), rgb(4,120,87) 20%, rgb(16,185,129) 50%, rgb(168,85,247) 80%, rgb(255,40,100) 100%)' }}
            />
            
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-3">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            {/* Scientific Breakdown */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[8px] font-mono text-slate-400 border-t border-slate-700/50 pt-3">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> GREEN: Oxygen (Active)</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> PURPLE: Nitrogen (Storm)</div>
              <div className="flex items-center gap-1.5 col-span-2"><span className="w-2 h-2 rounded-full bg-[#ff2864]"></span> CRIMSON: High-Alt Oxygen (Extreme)</div>
            </div>

            {ovation?.forecast_time && (
              <div className="mt-3 text-[8px] font-mono text-cyan-500/70 text-center border-t border-slate-700/50 pt-2">
                FORECAST VALID: {new Date(ovation.forecast_time).toISOString().split('T')[1].substring(0,5)} UTC
              </div>
            )}
          </motion.div>

          {/* Bottom Right: Target Lock Coordinates */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-950/40 backdrop-blur-xl border border-cyan-900/50 p-1.5 sm:p-2 md:p-2.5 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.1)] pointer-events-auto flex items-center justify-center gap-2 w-full col-span-1 min-w-0"
          >
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-900/50 border border-cyan-500/50 shrink-0">
              <Crosshair size={12} className="text-cyan-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] sm:text-[8px] font-bold tracking-[0.14em] text-cyan-500 uppercase">Target Lock</span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] font-mono text-white tracking-wider truncate">
                {targetLat.toFixed(2)}N, {targetLon.toFixed(2)}E
              </span>
              <span className="text-[7px] sm:text-[8px] font-mono text-violet-400 mt-0.5 truncate">
                VISIBILITY: {visibility?.composite_score || '--'}/100
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}