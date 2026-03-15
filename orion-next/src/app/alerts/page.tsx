"use client";

import { useState, useCallback } from "react";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useWebSocket } from "@/hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShieldAlert, Info } from "lucide-react";

export default function AlertsPage() {
  const { alerts: noaaAlerts, loading } = useSpaceWeather();
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  const handleNewAlert = useCallback((msg: any) => {
    if (msg.type === "SPACE_WEATHER_ALERT" || msg.type === "VISIBILITY_THRESHOLD_MET") {
      setLiveAlerts((prev) => [msg, ...prev].slice(0, 10)); // Keep latest 10
    }
  }, []);
  
  const { connected } = useWebSocket(handleNewAlert);

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
        
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={28} className="text-red-500" />
            <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
              Threat <span className="text-slate-500">Log</span>
            </h1>
          </div>
          <div className={`px-3 py-1 rounded text-[10px] font-mono tracking-widest border ${connected ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30' : 'border-red-500/50 text-red-400 bg-red-950/30'}`}>
            {connected ? 'WS: CONNECTED' : 'WS: RECONNECTING...'}
          </div>
        </header>

        <div className="flex-1 bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-4 border-b border-slate-700/50 bg-black/20 flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Live Event Stream</span>
            <span className="text-xs font-mono text-slate-500">Total Alerts: {noaaAlerts?.count || 0}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {loading && <div className="text-center py-10 text-cyan-500 font-mono animate-pulse">FETCHING LOGS...</div>}
            
            <AnimatePresence>
              {/* Render WebSocket Alerts First */}
              {liveAlerts.map((alert, idx) => (
                <motion.div 
                  key={`live-${idx}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-lg bg-red-950/20 border-l-4 border-red-500 flex gap-4"
                >
                  <ShieldAlert className="text-red-500 shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">{alert.event?.title || 'System Alert'}</h3>
                    <p className="text-xs font-mono text-slate-300 mt-1">{alert.event?.message || JSON.stringify(alert)}</p>
                  </div>
                </motion.div>
              ))}

              {/* Render NOAA Alerts */}
              {noaaAlerts?.alerts?.map((alert: any) => {
                const isWarning = alert.message.includes("WARNING") || alert.message.includes("STORM");
                return (
                  <motion.div 
                    key={alert.issue_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`p-4 rounded-lg bg-black/30 border-l-4 flex gap-4 ${isWarning ? 'border-amber-500' : 'border-cyan-500'}`}
                  >
                    <Info className={`${isWarning ? 'text-amber-500' : 'text-cyan-500'} shrink-0 mt-1`} size={20} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${isWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
                          NOAA {isWarning ? 'WARNING' : 'BULLETIN'}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500">{new Date(alert.issue_time).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-300 mt-2 whitespace-pre-wrap">{alert.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}