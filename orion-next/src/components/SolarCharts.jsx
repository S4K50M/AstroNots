"use client";

import { ResponsiveContainer, AreaChart, Area, ReferenceLine, Tooltip, XAxis } from "recharts"

function fmt(ts) {
  if (!ts) return ""
  const d = new Date(ts)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function Sparkline({ data, dataKey, color, threshold, thresholdLabel, unit, label, latest }) {
  const isAlert =
    threshold != null &&
    (
      (threshold < 0 && latest != null && latest < threshold) ||
      (threshold > 0 && latest != null && latest > threshold)
    )

  const chartData = (data ?? [])
    .map(r => ({
      t: fmt(r.time_tag || r.timestamp),
      v: r[dataKey] ?? null
    }))
    .filter(r => r.v != null)

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800/70 shadow-xl flex flex-col w-full min-h-[160px]">
      <div className="absolute inset-0 bg-[#070510]/70 backdrop-blur-xl" />
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-50"
        style={{ background: `linear-gradient(to right, transparent, ${color}80, transparent)` }}
      />

      <div className="relative z-10 p-4 md:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
              {label}
            </div>
            <div className="font-mono text-[9px] mt-[2px]" style={{ color: `${color}99` }}>
              {thresholdLabel}
            </div>
          </div>

          <div
            className="font-mono text-[22px] md:text-[28px] font-bold leading-none text-right"
            style={{
              color: isAlert ? color : '#f1f5f9',
              textShadow: isAlert ? `0 0 16px ${color}75` : 'none',
            }}
          >
            {latest != null
              ? (dataKey === "speed" ? Math.round(latest) : latest.toFixed(1))
              : "--"}
            <span className="text-[11px] text-slate-500 ml-1 font-normal">{unit}</span>
          </div>
        </div>

        <div className="flex-1 w-full mt-auto">
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              {threshold != null && (
                <ReferenceLine y={threshold} stroke={`${color}55`} strokeDasharray="4 4" strokeWidth={1} />
              )}
              <Tooltip
                contentStyle={{ background: "#06040f", border: `1px solid ${color}30`, borderRadius: 8, fontFamily: "monospace", fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color }}
                formatter={v => [`${v?.toFixed(2)} ${unit}`, label]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${dataKey})`}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default function SolarCharts({ mag, plasma }) {
  const recent = mag?.recent ?? []
  const pRecent = plasma?.recent ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <Sparkline
        data={recent}
        dataKey="bz_gsm"
        color="#8b5cf6"
        threshold={-7}
        thresholdLabel="ALERT: −7.0 nT"
        unit="nT"
        label="IMF Bz (GSM)"
        latest={mag?.latest?.bz_gsm ?? mag?.latest?.bz}
      />
      <Sparkline
        data={pRecent}
        dataKey="speed"
        color="#f97316"
        threshold={500}
        thresholdLabel="ALERT: 500 km/s"
        unit="km/s"
        label="Solar Wind Speed"
        latest={plasma?.latest?.speed}
      />
    </div>
  )
}