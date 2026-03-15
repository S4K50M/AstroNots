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
    <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col w-full min-h-[160px]">
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            {label}
          </div>
          <div className="font-mono text-[10px] text-red-400 mt-[2px]">
            {thresholdLabel}
          </div>
        </div>

        <div className={`font-mono text-[22px] md:text-[28px] font-bold leading-none text-right ${isAlert ? "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" : "text-white"}`}>
          {latest != null
            ? (dataKey === "speed" ? Math.round(latest) : latest.toFixed(1))
            : "--"}
          <span className="text-[11px] text-gray-400 ml-1 font-normal">{unit}</span>
        </div>
      </div>

      {/* Increased height to 100 to prevent squishing */}
      <div className="flex-1 w-full mt-auto">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            {threshold != null && (
              <ReferenceLine y={threshold} stroke="rgba(255,77,77,0.5)" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid #334155", borderRadius: 6, fontFamily: "monospace", fontSize: 11 }}
              labelStyle={{ color: "#a1a1aa" }}
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
  )
}

export default function SolarCharts({ mag, plasma }) {
  const recent = mag?.recent ?? []
  const pRecent = plasma?.recent ?? []

  return (
    // Grid layout: stacked on mobile, side-by-side on desktop
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <Sparkline
        data={recent}
        dataKey="bz_gsm" // Or 'bz' depending on backend
        color="#a855f7" // Violet
        threshold={-7}
        thresholdLabel="ALERT: −7.0 nT"
        unit="nT"
        label="IMF Bz (GSM)"
        latest={mag?.latest?.bz_gsm ?? mag?.latest?.bz}
      />
      <Sparkline
        data={pRecent}
        dataKey="speed"
        color="#00d4ff" // Cyan
        threshold={500}
        thresholdLabel="ALERT: 500 km/s"
        unit="km/s"
        label="Solar Wind Speed"
        latest={plasma?.latest?.speed}
      />
    </div>
  )
}