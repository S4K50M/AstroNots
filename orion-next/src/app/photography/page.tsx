"use client";

import { useState, useEffect } from "react";
import { getVisibility } from '@/services/api'
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useVisibility } from "@/hooks/useVisibility";
import { motion } from "framer-motion";
import { Camera, MapPin, Aperture, Clock, Zap, BarChart2, Crosshair, CloudMoon } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Subcomponents for the HUD ---

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score ?? 0)) / 100);

  const color = score >= 70 ? "#10b981" : score >= 40 ? "#8b5cf6" : "#06b6d4";

  return (
    <div className="relative w-[100px] h-[100px] shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-out, stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span className="text-3xl font-black leading-none" style={{ color }}>{score != null ? Math.round(score) : "--"}</span>
        <span className="text-[10px] text-slate-500 mt-1">/100</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value ?? 0}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[10px] text-slate-400 w-8 text-right shrink-0">{value != null ? Math.round(value) : "--"}%</span>
    </div>
  );
}

// --- Main Page Component ---

export default function PhotographyPage() {
  const [targetLat, setTargetLat] = useState(69.65);
  const [targetLon, setTargetLon] = useState(18.96);

  const { visibility, loading: visLoading } = useVisibility(targetLat, targetLon);
  const { kp, loading: swLoading } = useSpaceWeather();
  
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch(`${API_URL}/api/forecast`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.forecast?.map((d: any) => ({
            ...d,
            formattedTime: new Date(d.time_tag).toLocaleDateString([], { weekday: 'short', hour: '2-digit' }),
          })) || [];
          setForecast(formatted);
        }
      } catch (err) {}
    };
    fetchForecast();
  }, []);

  const score = visibility?.composite_score;
  const comp = visibility?.components;
  const photo = visibility?.photo_settings;
  const rec = visibility?.recommendation;
  const dark = visibility?.darkness_breakdown;

  const getKpColor = (kpVal: number) => {
    if (kpVal >= 6) return "#ef4444"; 
    if (kpVal >= 4.5) return "#f59e0b"; 
    return "#10b981"; 
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      
      {/* --- BACKGROUND ANIMATION (Slow moving aurora blurs) --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/30 blur-[120px] rounded-full mix-blend-screen"
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-emerald-600/20 blur-[120px] rounded-full mix-blend-screen"
        />
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 50, 0], scale: [1, 0.8, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-cyan-600/20 blur-[100px] rounded-full mix-blend-screen"
        />
      </div>

      {/* --- FOREGROUND CONTENT --- */}
      <div className="relative z-10 h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-24">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-3">
              <Camera size={32} className="text-violet-400" />
              <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
                Astro<span className="text-slate-500">Photography</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 bg-surface/80 backdrop-blur-xl border border-slate-700/50 px-3 py-2 rounded-lg">
              <MapPin size={14} className="text-cyan-400" />
              <input 
                className="bg-transparent border-none text-white font-mono text-xs focus:outline-none w-16" 
                value={targetLat} onChange={(e) => setTargetLat(Number(e.target.value))}
              />
              <span className="text-slate-600">,</span>
              <input 
                className="bg-transparent border-none text-white font-mono text-xs focus:outline-none w-16" 
                value={targetLon} onChange={(e) => setTargetLon(Number(e.target.value))}
              />
            </div>
          </header>

          {(visLoading || swLoading) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-violet-500 animate-pulse font-mono tracking-widest gap-4 mt-20">
              <Crosshair size={40} className="animate-spin-slow" />
              LOCKING TARGET COORDINATES...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* === LEFT: VISIBILITY BREAKDOWN === */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 flex flex-col gap-4">
                
                <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2">
                    <CloudMoon size={14} className="text-cyan-400"/> Environmental Score
                  </h2>

                  <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                    <ScoreRing score={score} />
                    <div className="flex-1 w-full flex flex-col gap-4">
                      <ProgressBar label="Aurora Prob" value={comp?.aurora_probability} color="#10b981" />
                      <ProgressBar label="Darkness" value={comp?.darkness_score} color="#a855f7" />
                      <ProgressBar label="Clear Sky" value={comp?.cloud_score} color="#06b6d4" />
                    </div>
                  </div>

                  {rec && (
                    <div className="bg-void/50 border border-slate-700/50 rounded-lg p-4 font-mono text-xs text-slate-300 leading-relaxed border-l-4 border-l-violet-500 mb-4">
                      {rec}
                    </div>
                  )}

                  {dark && (
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-3 py-1.5 rounded-md uppercase tracking-wider">
                        Bortle Class {dark.bortle_class}
                      </span>
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-3 py-1.5 rounded-md uppercase tracking-wider">
                        Moon {Math.round(dark.lunar_score)}%
                      </span>
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-3 py-1.5 rounded-md uppercase tracking-wider">
                        Cloud Cover {comp?.cloud_cover_pct != null ? `${Math.round(comp.cloud_cover_pct)}%` : "--"}
                      </span>
                    </div>
                  )}
                </div>

              </motion.div>


              {/* === RIGHT: CAMERA HUD === */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 flex flex-col gap-6">
                
                <div className="bg-black/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative">
                  {/* Camera Viewfinder Crosshairs (Styling) */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-slate-600/50" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-600/50" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-600/50" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-slate-600/50" />
                  
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                    <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                      <Camera size={14} className="text-emerald-400"/> Recommended Exposure
                    </h2>
                    <span className="text-[10px] font-mono tracking-widest bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded">
                      KP {kp?.latest?.kp?.toFixed(2) ?? "--"} DETECTED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-void border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner group hover:border-emerald-500/50 transition-colors">
                      <Aperture size={20} className="text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors" />
                      <div className="font-mono text-[10px] tracking-widest text-slate-500 mb-1">APERTURE</div>
                      <div className="text-3xl font-black text-white">{photo?.aperture || "f/2.8"}</div>
                    </div>

                    <div className="bg-void border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner group hover:border-emerald-500/50 transition-colors">
                      <Clock size={20} className="text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors" />
                      <div className="font-mono text-[10px] tracking-widest text-slate-500 mb-1">SHUTTER</div>
                      <div className="text-3xl font-black text-white">{photo?.shutter || "15s"}</div>
                    </div>

                    <div className="bg-void border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner group hover:border-emerald-500/50 transition-colors">
                      <Zap size={20} className="text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors" />
                      <div className="font-mono text-[10px] tracking-widest text-slate-500 mb-1">ISO</div>
                      <div className="text-3xl font-black text-white">{photo?.iso || "1600"}</div>
                    </div>
                  </div>

                  {photo?.note && (
                    <div className="text-[11px] font-mono text-slate-400 bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-center">
                      <span className="text-emerald-500 mr-2">PRO TIP:</span>
                      {photo.note}
                    </div>
                  )}
                </div>

                {/* === FORECAST CHART === */}
                <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-[250px]">
                  <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <BarChart2 size={14} className="text-violet-400" /> 3-Day K-Index Forecast
                  </h2>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecast} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="formattedTime" stroke="#475569" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={20} />
                        <YAxis stroke="#475569" tick={{fontSize: 10}} domain={[0, 9]} ticks={[0, 2, 4, 6, 8, 9]} />
                        <Tooltip 
                          cursor={{fill: '#1e293b', opacity: 0.4}}
                          contentStyle={{backgroundColor: '#09090b', borderColor: '#334155', color: '#fff', fontSize: '12px', fontFamily: 'monospace'}} 
                          formatter={(value: number) => [`Kp ${value}`, "Predicted Intensity"]}
                        />
                        <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" />
                        <Bar dataKey="kp" radius={[2, 2, 0, 0]}>
                          {forecast.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getKpColor(entry.kp)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}