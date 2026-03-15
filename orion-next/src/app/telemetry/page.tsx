"use client";

import { useEffect, useState } from "react";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { motion } from "framer-motion";
import { Activity, Wind, Compass, Zap, BarChart2, ShieldAlert } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Framer Motion Variants ---
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
};

export default function TelemetryPage() {
  const { mag, plasma, loading: swLoading } = useSpaceWeather();
  const [forecast, setForecast] = useState<any[]>([]);
  const [forecastLoading, setForecastLoading] = useState(true);

  // Fetch the 3-Day Kp Forecast
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch(`${API_URL}/api/forecast`);
        if (res.ok) {
          const data = await res.json();
          // Format time for the X-Axis
          const formatted = data.forecast?.map((d: any) => ({
            ...d,
            formattedTime: new Date(d.time_tag).toLocaleDateString([], { weekday: 'short', hour: '2-digit' }),
          })) || [];
          setForecast(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch forecast:", err);
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecast();
  }, []);

  // Format historical Mag and Plasma data for the Line Charts
  const recentMag = mag?.recent?.map((m: any) => ({
    time: new Date(m.time_tag).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bz: m.bz,
    bt: m.bt,
  })) || [];

  const recentPlasma = plasma?.recent?.map((p: any) => ({
    time: new Date(p.time_tag).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    speed: p.speed,
    density: p.density,
  })) || [];

  // Helper to color the Kp bars like NOAA (Green -> Yellow -> Red)
  const getKpColor = (kp: number) => {
    if (kp >= 6) return "#ef4444"; // Red (Severe Storm)
    if (kp >= 4.5) return "#f59e0b"; // Amber (Active/Minor Storm)
    return "#10b981"; // Emerald (Quiet)
  };

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 pb-20">
        
        {/* HEADER */}
        <header className="flex items-center gap-3 mb-2">
          <Activity size={28} className="text-cyan-400" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
            Solar Wind <span className="text-slate-500">Telemetry</span>
          </h1>
        </header>

        {swLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-cyan-500 animate-pulse font-mono tracking-widest gap-4 mt-20">
            <Activity size={40} className="animate-spin-slow" />
            CALIBRATING SENSORS...
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
            
            {/* =========================================
                LIVE METRICS (4 BLOCKS)
                ========================================= */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Total Bt */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 text-slate-400 mb-2 font-mono text-[10px] tracking-widest uppercase">
                  <ShieldAlert size={14}/> Total Field (Bt)
                </div>
                <div className="text-3xl md:text-4xl font-black text-white">{mag?.latest?.bt?.toFixed(1) || '--'} <span className="text-sm text-slate-500">nT</span></div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">Interplanetary Magnetic Field Strength</p>
              </motion.div>

              {/* Bz GSM */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${(mag?.latest?.bz < 0) ? 'bg-violet-500' : 'bg-slate-500'}`} />
                <div className="flex items-center gap-2 text-violet-400 mb-2 font-mono text-[10px] tracking-widest uppercase relative z-10">
                  <Compass size={14}/> IMF Bz (GSM)
                </div>
                <div className="text-3xl md:text-4xl font-black text-white relative z-10">{mag?.latest?.bz?.toFixed(1) || '--'} <span className="text-sm text-slate-500">nT</span></div>
                <p className={`text-[10px] mt-2 font-mono font-bold relative z-10 ${(mag?.latest?.bz < -5) ? "text-violet-400" : "text-slate-400"}`}>
                  {(mag?.latest?.bz < 0) ? "SOUTHWARD (FAVORABLE)" : "NORTHWARD (UNFAVORABLE)"}
                </p>
              </motion.div>

              {/* Solar Wind Speed */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${(plasma?.latest?.speed > 500) ? 'bg-cyan-500' : 'bg-slate-500'}`} />
                <div className="flex items-center gap-2 text-cyan-400 mb-2 font-mono text-[10px] tracking-widest uppercase relative z-10">
                  <Wind size={14}/> Wind Speed
                </div>
                <div className="text-3xl md:text-4xl font-black text-white relative z-10">{plasma?.latest?.speed?.toFixed(0) || '--'} <span className="text-sm text-slate-500">km/s</span></div>
                <p className={`text-[10px] mt-2 font-mono font-bold relative z-10 ${(plasma?.latest?.speed > 500) ? "text-cyan-400" : "text-slate-400"}`}>
                  {(plasma?.latest?.speed > 500) ? "HIGH SPEED STREAM" : "NOMINAL BACKGROUND"}
                </p>
              </motion.div>

              {/* Density */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400 mb-2 font-mono text-[10px] tracking-widest uppercase">
                  <Zap size={14}/> Plasma Density
                </div>
                <div className="text-3xl md:text-4xl font-black text-white">{plasma?.latest?.density?.toFixed(1) || '--'} <span className="text-sm text-slate-500">p/cm³</span></div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">Proton Concentration</p>
              </motion.div>

            </div>

            {/* =========================================
                GRAPHS (2-HOUR HISTORY)
                ========================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* GRAPH 1: IMF Bz */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl h-[300px] flex flex-col">
                <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Compass size={14} className="text-violet-400" /> IMF Bz (Last 2 Hours)
                </h2>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentMag}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={30} />
                      <YAxis stroke="#c084fc" tick={{fontSize: 10}} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#334155', color: '#fff', fontSize: '12px'}} />
                      {/* Zero Line (Neutral) */}
                      <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                      {/* Alert Threshold Line (-5 nT) */}
                      <ReferenceLine y={-5} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideBottomRight', value: 'Storm Threshold', fill: '#ef4444', fontSize: 10 }} />
                      <Line type="monotone" dataKey="bz" stroke="#c084fc" strokeWidth={2} dot={false} activeDot={{r: 4, fill: '#c084fc'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* GRAPH 2: Solar Wind Speed */}
              <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl h-[300px] flex flex-col">
                <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                  <Wind size={14} className="text-cyan-400" /> Solar Wind Speed (Last 2 Hours)
                </h2>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentPlasma}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={30} />
                      <YAxis stroke="#22d3ee" tick={{fontSize: 10}} domain={['dataMin - 20', 'dataMax + 20']} />
                      <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#334155', color: '#fff', fontSize: '12px'}} />
                      <Line type="monotone" dataKey="speed" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{r: 4, fill: '#22d3ee'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

            </div>

            {/* =========================================
                3-DAY KP FORECAST BAR CHART
                ========================================= */}
            <motion.div variants={item} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl h-[350px] flex flex-col">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                   <BarChart2 size={14} className="text-emerald-400" /> 3-Day Planetary K-Index Forecast
                 </h2>
                 {forecastLoading && <span className="text-[10px] font-mono text-cyan-500 animate-pulse">LOADING FORECAST...</span>}
               </div>

               <div className="flex-1 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={forecast} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                     <XAxis dataKey="formattedTime" stroke="#475569" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={20} />
                     <YAxis stroke="#475569" tick={{fontSize: 10}} domain={[0, 9]} ticks={[0, 2, 4, 6, 8, 9]} />
                     <Tooltip 
                       cursor={{fill: '#1e293b', opacity: 0.4}}
                       contentStyle={{backgroundColor: '#09090b', borderColor: '#334155', color: '#fff', fontSize: '12px', fontFamily: 'monospace'}} 
                       formatter={(value: number) => [`Kp ${value}`, "Predicted Intensity"]}
                     />
                     {/* G1 Minor Storm Reference Line */}
                     <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'G1 Storm (Kp 5)', fill: '#f59e0b', fontSize: 10 }} />
                     
                     <Bar dataKey="kp" radius={[2, 2, 0, 0]}>
                       {forecast.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={getKpColor(entry.kp)} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}