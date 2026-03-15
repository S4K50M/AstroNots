import { useState, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function ForecastChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")
      .then(r => r.json())
      .then(raw => {
        const rows = raw.slice(1).map(row => ({
          time: row[0].slice(5, 13),
          kp: parseFloat(row[1]),
          observed: row[2] === "observed",
        }))

        const observed = rows.filter(r => r.observed).slice(-8)
        const predicted = rows.filter(r => !r.observed)

        setData([...observed, ...predicted])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const kpColor = kp =>
    kp >= 7 ? "#ff4d4d" : kp >= 5 ? "#ffb830" : "#00ffa3"

  const CustomDot = ({ cx, cy, payload }) => {
    if (!payload) return null

    const color = payload.observed
      ? kpColor(payload.kp)
      : "#a78bfa" // purple for predicted

    return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />
  }

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col gap-3 overflow-hidden">

      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] tracking-widest text-gray-400 font-mono">
          3-DAY KP FORECAST
        </span>

        <div className="flex gap-3 text-[9px] font-mono">
          <span className="text-emerald-400">— observed</span>
          <span className="text-purple-400">— predicted</span>
        </div>
      </div>

      {loading ? (
        <div className="text-[11px] text-gray-500 font-mono">
          Loading forecast…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 4, left: -28, bottom: 0 }}
          >

            <defs>
              {/* observed gradient */}
              <linearGradient id="kpObserved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ffa3" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#00ffa3" stopOpacity={0} />
              </linearGradient>

              {/* predicted gradient */}
              <linearGradient id="kpPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }}
              interval={7}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              domain={[0, 9]}
              ticks={[0, 3, 5, 7, 9]}
              tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
            />

            {/* Storm thresholds */}
            <ReferenceLine
              y={5}
              stroke="rgba(255,184,48,0.4)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={7}
              stroke="rgba(255,77,77,0.4)"
              strokeDasharray="4 4"
            />

            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 11
              }}
              formatter={(v, _, props) => [
                `Kp ${v?.toFixed(2)} — ${
                  props.payload?.observed ? "observed" : "predicted"
                }`
              ]}
            />

            {/* observed area */}
            <Area
              type="monotone"
              dataKey="kp"
              data={data.filter(d => d.observed)}
              stroke="#00ffa3"
              strokeWidth={1.5}
              fill="url(#kpObserved)"
              dot={<CustomDot />}
              isAnimationActive={false}
            />

            {/* predicted area */}
            <Area
              type="monotone"
              dataKey="kp"
              data={data.filter(d => !d.observed)}
              stroke="#a78bfa"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="url(#kpPred)"
              dot={<CustomDot />}
              isAnimationActive={false}
            />

          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Storm scale */}
      <div className="flex flex-wrap gap-2">
        {[
          { kp: 5, label: "G1", color: "text-teal-400 border-teal-400" },
          { kp: 6, label: "G2", color: "text-emerald-400 border-emerald-400" },
          { kp: 7, label: "G3", color: "text-amber-400 border-amber-400" },
          { kp: 8, label: "G4", color: "text-red-400 border-red-400" },
        ].map(s => (
          <div
            key={s.kp}
            className={`text-[9px] font-mono border rounded px-2 py-[2px] opacity-80 ${s.color}`}
          >
            Kp{s.kp}+ = {s.label}
          </div>
        ))}
      </div>

    </div>
  )
}