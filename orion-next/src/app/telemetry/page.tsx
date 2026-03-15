"use client";

import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { motion } from "framer-motion";
import { Activity, Wind, Compass, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function TelemetryPage() {
  const { status, mag, plasma, loading } = useSpaceWeather();

  // Format data for Recharts
  const chartData = mag?.recent?.map((m: any, i: number) => ({
    time: new Date(m.time_tag).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bz: m.bz,
    speed: plasma?.recent?.[i]?.speed || null,
  })) || [];

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
        
        <header className="flex items-center gap-3">
          <Activity size={28} className="text-cyan-400" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
            Solar Wind <span className="text-slate-500">Telemetry</span>
          </h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-cyan-500 animate-pulse font-mono tracking-widest">
            CALIBRATING SENSORS...
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Live Metrics Cards */}
            <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-violet-400 mb-2 font-mono text-xs tracking-widest uppercase"><Compass size={14}/> IMF Bz</div>
              <div className="text-5xl font-black text-white">{mag?.latest?.bz?.toFixed(1) || '--'} <span className="text-lg text-slate-500">nT</span></div>
              <p className="text-xs text-slate-400 mt-2 font-mono">{mag?.latest?.bz < -5 ? "⚠️ Southward (Favorable)" : "Northward (Unfavorable)"}</p>
            </div>

            <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 mb-2 font-mono text-xs tracking-widest uppercase"><Wind size={14}/> Speed</div>
              <div className="text-5xl font-black text-white">{plasma?.latest?.speed?.toFixed(0) || '--'} <span className="text-lg text-slate-500">km/s</span></div>
              <p className="text-xs text-slate-400 mt-2 font-mono">{plasma?.latest?.speed > 500 ? "🚀 High Speed Stream" : "Nominal Background"}</p>
            </div>

            <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-2 font-mono text-xs tracking-widest uppercase"><Zap size={14}/> Density</div>
              <div className="text-5xl font-black text-white">{plasma?.latest?.density?.toFixed(1) || '--'} <span className="text-lg text-slate-500">p/cm³</span></div>
              <p className="text-xs text-slate-400 mt-2 font-mono">Particle Concentration</p>
            </div>

            {/* Main Graph */}
            <div className="md:col-span-3 bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl h-[400px] flex flex-col">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-6">2-Hour IMF Bz vs Speed Overlay</h2>
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10, fill: '#64748b'}} />
                    <YAxis yAxisId="left" stroke="#c084fc" tick={{fontSize: 10}} domain={['-15', '15']} />
                    <YAxis yAxisId="right" orientation="right" stroke="#22d3ee" tick={{fontSize: 10}} domain={['300', '800']} />
                    <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#334155', color: '#fff'}} />
                    <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Line yAxisId="left" type="monotone" dataKey="bz" stroke="#c084fc" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#22d3ee" strokeWidth={2} dot={false} opacity={0.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}