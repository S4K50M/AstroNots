"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Map as MapIcon, Navigation2, CloudRain, Moon, Compass, ShieldAlert } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TargetsPage() {
  const [lat, setLat] = useState("69.65");
  const [lon, setLon] = useState("18.96");
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculateRoute = async () => {
    setLoading(true);
    setError("");
    setRouteData(null);
    try {
      const res = await fetch(`${API_URL}/api/routing?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Routing failed");
      setRouteData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
        
        <header className="flex items-center gap-3">
          <Crosshair size={28} className="text-violet-400" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
            Dark Sky <span className="text-slate-500">Routing</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Input Panel */}
          <div className="md:col-span-5 bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Origin Coordinates</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-mono text-cyan-400 block mb-1">LATITUDE</label>
                <input 
                  type="text" value={lat} onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-void border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-cyan-400 block mb-1">LONGITUDE</label>
                <input 
                  type="text" value={lon} onChange={(e) => setLon(e.target.value)}
                  className="w-full bg-void border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <button 
                onClick={calculateRoute} disabled={loading}
                className="mt-2 w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-lg text-xs tracking-widest uppercase transition-all flex justify-center items-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Compass size={16}/>}
                {loading ? "Calculating Vector..." : "Intercept Route"}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="md:col-span-7">
            {error && (
              <div className="bg-red-950/30 border border-red-500/50 rounded-2xl p-6 text-red-400 font-mono text-sm">
                ERROR: {error}
              </div>
            )}

            {routeData && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                {routeData.found ? (
                  <>
                    <div className="flex justify-between items-start border-b border-slate-700/50 pb-4 mb-4">
                      <div>
                        <h2 className="text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <Navigation2 size={20}/> Optimal Site Locked
                        </h2>
                        <p className="text-xs font-mono text-slate-400 mt-1">Lat: {routeData.site.lat.toFixed(4)} | Lon: {routeData.site.lon.toFixed(4)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white">{routeData.route.distance_km.toFixed(1)} km</div>
                        <div className="text-[10px] font-mono text-slate-500">~{routeData.route.estimated_drive_min} MIN DRIVE</div>
                      </div>
                    </div>

                    {/* Site Specs */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                       <div className="bg-void p-3 rounded-lg border border-slate-800 text-center">
                         <span className="block text-[9px] text-slate-500 font-mono mb-1">AURORA PROB.</span>
                         <span className="text-cyan-400 font-bold">{routeData.site.aurora_probability}%</span>
                       </div>
                       <div className="bg-void p-3 rounded-lg border border-slate-800 text-center">
                         <span className="block text-[9px] text-slate-500 font-mono mb-1"><CloudRain size={10} className="inline"/> CLOUD</span>
                         <span className="text-white font-bold">{routeData.site.cloud_cover_pct}%</span>
                       </div>
                       <div className="bg-void p-3 rounded-lg border border-slate-800 text-center">
                         <span className="block text-[9px] text-slate-500 font-mono mb-1"><Moon size={10} className="inline"/> BORTLE</span>
                         <span className="text-violet-400 font-bold">Class {routeData.site.bortle_class}</span>
                       </div>
                    </div>

                    <a 
                      href={routeData.route.google_maps_url} target="_blank" rel="noreferrer"
                      className="block w-full text-center bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-400 py-3 rounded-lg font-mono text-xs tracking-widest uppercase transition-colors"
                    >
                      Open in Google Maps
                    </a>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-amber-400 uppercase tracking-widest mb-2">No Clear Sky Sector Found</h3>
                    <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">{routeData.reason}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}