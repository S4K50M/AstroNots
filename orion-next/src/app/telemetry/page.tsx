"use client";

import { useEffect, useState } from "react";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { motion } from "framer-motion";
import { Activity, Wind, Compass, Zap, BarChart2, ShieldAlert } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from "recharts";
import SolarCharts from "@/components/SolarCharts"
import MetricsPanel from "@/components/MetricsPanel"
import { useSpace } from "@/hooks/useSpace";
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
  const { kp } = useSpace();
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
            <MetricsPanel mag={mag} plasma={plasma} kp={kp}/>

            {/* =========================================
                GRAPHS (2-HOUR HISTORY)
                ========================================= */}
            <SolarCharts mag={mag} plasma={plasma} />
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