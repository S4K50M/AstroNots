"use client";

import { useEffect, useState } from "react";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { useLocation } from "@/contexts/LocationContext";
import { motion } from "framer-motion";
import { Activity, BarChart2, MapPin } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import SolarCharts from "@/components/SolarCharts";
import MetricsPanel from "@/components/MetricsPanel";
import { useSpace } from "@/hooks/useSpace";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as any;
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120 } }
} as any;

// Deterministic star field — no Math.random() to avoid hydration mismatch
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  left: `${((i * 37 + 13) % 97)}%`,
  top: `${((i * 53 + 7) % 94)}%`,
  r: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
  opacity: 0.12 + (i % 5) * 0.07,
  twinkle: i % 4 === 0,
  twinkleDelay: (i * 0.38) % 3,
}));

// Horizontal solar-wind stream particles
const SOLAR_STREAMS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  top: `${3 + ((i * 7 + 5) % 92)}%`,
  duration: 7 + (i % 6) * 1.5,
  delay: (i * 0.55) % 8,
  w: 60 + (i % 5) * 38,
  h: i % 6 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  opacity: 0.18 + (i % 4) * 0.09,
}));

function getKpBarColor(kp: number) {
  if (kp >= 7) return "#f87171";
  if (kp >= 5) return "#fb923c";
  if (kp >= 3) return "#fbbf24";
  return "#34d399";
}

export default function TelemetryPage() {
  const { latitude, longitude } = useLocation();
  const { kp } = useSpace();
  const { mag, plasma, loading: swLoading } = useSpaceWeather();
  const [forecast, setForecast] = useState<any[]>([]);
  const [forecastLoading, setForecastLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch(`${API_URL}/api/forecast`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.forecast?.map((d: any) => ({
            ...d,
            formattedTime: new Date(d.time_tag).toLocaleDateString([], { weekday: "short", hour: "2-digit" }),
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

  return (
    <div className="relative h-full w-full overflow-hidden">

      {/* ── SOLAR BACKGROUND ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Deep space base */}
        <div className="absolute inset-0 bg-[#04030b]" />

        {/* Solar corona — pulsing warm glow top-center */}
        <motion.div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(251,146,60,0.13) 0%, rgba(234,88,12,0.05) 45%, transparent 70%)" }}
          animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.07, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Warm side-scatter top-left */}
        <div
          className="absolute top-0 left-0 w-[380px] h-[280px]"
          style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(251,146,60,0.05) 0%, transparent 65%)" }}
        />

        {/* Cool nebula — bottom-right */}
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[420px]"
          style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(109,40,217,0.08) 0%, rgba(67,56,202,0.03) 55%, transparent 75%)" }}
        />

        {/* Stars */}
        {STARS.map(s =>
          s.twinkle ? (
            <motion.div
              key={s.id}
              className="absolute rounded-full bg-white"
              style={{ left: s.left, top: s.top, width: s.r, height: s.r }}
              animate={{ opacity: [s.opacity, Math.min(s.opacity * 3, 0.9), s.opacity] }}
              transition={{ duration: 2.5 + s.twinkleDelay, repeat: Infinity, ease: "easeInOut", delay: s.twinkleDelay }}
            />
          ) : (
            <div
              key={s.id}
              className="absolute rounded-full bg-white"
              style={{ left: s.left, top: s.top, width: s.r, height: s.r, opacity: s.opacity }}
            />
          )
        )}

        {/* Solar wind stream particles */}
        {SOLAR_STREAMS.map(s => (
          <motion.div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: s.top,
              height: s.h,
              width: s.w,
              background: `linear-gradient(to right, transparent, rgba(251,146,60,${s.opacity}), rgba(251,146,60,${s.opacity + 0.1}), transparent)`,
            }}
            initial={{ left: "-8%" }}
            animate={{ left: "110%" }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "linear" }}
          />
        ))}

        {/* Faint instrument scan rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-orange-200/[0.018]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[1400px] rounded-full border border-orange-200/[0.012]" />
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="relative z-10 h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20">

          {/* HEADER */}
          <header className="flex items-center gap-3 mb-1">
            <div className="relative shrink-0">
              <Activity size={24} className="text-orange-400" />
              <div className="absolute inset-0 blur-lg bg-orange-400/25 rounded-full" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.18em] text-white uppercase leading-none">
                Solar Wind <span className="text-orange-400">Telemetry</span>
              </h1>
              <p className="text-[9px] font-mono text-slate-500 mt-0.5 tracking-widest uppercase">Live DSCOVR / ACE Stream</p>
            </div>
          </header>

          {swLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 mt-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Activity size={34} className="text-orange-400/70" />
              </motion.div>
              <span className="text-orange-400/50 font-mono text-xs tracking-[0.25em] uppercase">Calibrating Sensors...</span>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">

              <motion.div variants={item}>
                <MetricsPanel mag={mag} plasma={plasma} kp={kp} />
              </motion.div>

              <motion.div variants={item}>
                <SolarCharts mag={mag} plasma={plasma} />
              </motion.div>

              {/* 3-DAY KP FORECAST */}
              <motion.div variants={item} className="relative rounded-2xl overflow-hidden border border-slate-800/70 shadow-xl flex flex-col h-[360px]">
                <div className="absolute inset-0 bg-[#060411]/80 backdrop-blur-xl" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/25 to-transparent" />

                <div className="relative z-10 flex justify-between items-center px-4 pt-4 pb-0">
                  <h2 className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase flex items-center gap-2">
                    <BarChart2 size={12} className="text-orange-400" />
                    3-Day Planetary K-Index Forecast
                  </h2>
                  {forecastLoading && (
                    <span className="text-[9px] font-mono text-orange-400/50 animate-pulse">SYNCING...</span>
                  )}
                </div>

                <div className="relative z-10 flex-1 px-3 pt-3 pb-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecast} margin={{ top: 14, right: 4, left: -22, bottom: 0 }} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#150f22" vertical={false} />
                      <XAxis
                        dataKey="formattedTime"
                        stroke="#2a1f3d"
                        tick={{ fontSize: 9, fill: "#4a3860", fontFamily: "monospace" }}
                        minTickGap={22}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#2a1f3d"
                        tick={{ fontSize: 9, fill: "#4a3860", fontFamily: "monospace" }}
                        domain={[0, 9]}
                        ticks={[0, 2, 4, 6, 8, 9]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(251,146,60,0.04)" }}
                        contentStyle={{ backgroundColor: "#06030f", borderColor: "#2a1f3d", color: "#e2d8f0", fontSize: "11px", fontFamily: "monospace", borderRadius: 8 }}
                        formatter={(value: any) => [`Kp ${value}`, "Predicted"]}
                      />
                      <ReferenceLine y={5} stroke="rgba(251,146,60,0.3)" strokeDasharray="4 3" strokeWidth={1} />
                      <ReferenceLine y={7} stroke="rgba(248,113,113,0.25)" strokeDasharray="4 3" strokeWidth={1} />
                      <Bar dataKey="kp" radius={[3, 3, 0, 0]} maxBarSize={28}>
                        {forecast.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getKpBarColor(entry.kp)}
                            opacity={0.9}
                            style={{ filter: entry.kp >= 5 ? `drop-shadow(0 0 4px ${getKpBarColor(entry.kp)}70)` : "none" }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="relative z-10 flex justify-between items-center px-4 py-2 border-t border-slate-800/40 text-[8px] font-mono text-slate-600 tracking-wider">
                  <span>NOAA SWPC 3-DAY FORECAST</span>
                  <span>UPDATES EVERY 6H</span>
                </div>
              </motion.div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}