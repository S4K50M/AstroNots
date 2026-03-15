import { useState, useEffect } from "react"
import { getVisibility } from "../services/api"

function ScoreRing({ score }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(100, score ?? 0)) / 100)

  const color =
    score >= 70 ? "#00ffa3" :
    score >= 40 ? "#ffb830" :
    "#ff4d4d"

  return (
    <div className="relative w-[80px] h-[80px] shrink-0">
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="7"
        />

        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease, stroke 0.4s",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span
          className="text-[20px] font-bold leading-none"
          style={{ color }}
        >
          {score != null ? Math.round(score) : "--"}
        </span>

        <span className="text-[9px] text-gray-500">/100</span>
      </div>
    </div>
  )
}

function Bar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-gray-400 w-[58px]">
        {label}
      </span>

      <div className="flex-1 h-[4px] bg-zinc-800 rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-700"
          style={{
            width: `${value ?? 0}%`,
            background: color,
          }}
        />
      </div>

      <span className="font-mono text-[10px] text-gray-400 w-[22px] text-right">
        {value != null ? Math.round(value) : "--"}
      </span>
    </div>
  )
}

export default function VisibilityPanel({ lat, lon, kp }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lat || !lon) return

    setLoading(true)

    getVisibility(lat, lon)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lon])

  const score = data?.composite_score
  const comp = data?.components
  const photo = data?.photo_settings
  const rec = data?.recommendation
  const dark = data?.darkness_breakdown

  return (
    <div className="flex flex-col gap-3">

      <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 font-mono">
        Visibility Score
      </div>

      {loading && (
        <div className="font-mono text-[12px] text-gray-500">
          Calculating…
        </div>
      )}

      {!loading && (
        <>
          <div className="flex items-center gap-4">

            <ScoreRing score={score} />

            <div className="flex-1 flex flex-col gap-2">
              <Bar label="Aurora" value={comp?.aurora_probability} color="#00ffa3" />
              <Bar label="Darkness" value={comp?.darkness_score} color="#00d4ff" />
              <Bar label="Clear Sky" value={comp?.cloud_score} color="#ffb830" />
            </div>

          </div>

          {rec && (
            <div className="text-[12px] text-gray-400 bg-zinc-900 rounded-lg px-3 py-2 italic leading-relaxed">
              {rec}
            </div>
          )}

          {dark && (
            <div className="flex gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-gray-500 bg-zinc-900 px-2 py-[2px] rounded">
                Bortle {dark.bortle_class}
              </span>

              <span className="font-mono text-[10px] text-gray-500 bg-zinc-900 px-2 py-[2px] rounded">
                ☽ {Math.round(dark.lunar_score)}
              </span>

              <span className="font-mono text-[10px] text-gray-500 bg-zinc-900 px-2 py-[2px] rounded">
                ☆ {Math.round(dark.twilight_score)}
              </span>

              <span className="font-mono text-[10px] text-gray-500 bg-zinc-900 px-2 py-[2px] rounded">
                Cloud {comp?.cloud_cover_pct != null ? `${Math.round(comp.cloud_cover_pct)}%` : "--"}
              </span>
            </div>
          )}

          {photo && (
            <div className="flex flex-col gap-2">

              <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 font-mono">
                Photography · Kp {kp ?? "--"}
              </div>

              <div className="grid grid-cols-3 gap-2">

                <div className="bg-zinc-900 border border-white/10 rounded-lg p-2 text-center">
                  <div className="font-mono text-[9px] text-gray-500 mb-1 tracking-wide">
                    APERTURE
                  </div>
                  <div className="font-mono text-[15px] font-bold text-emerald-400">
                    {photo.aperture}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-lg p-2 text-center">
                  <div className="font-mono text-[9px] text-gray-500 mb-1 tracking-wide">
                    SHUTTER
                  </div>
                  <div className="font-mono text-[15px] font-bold text-emerald-400">
                    {photo.shutter}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-lg p-2 text-center">
                  <div className="font-mono text-[9px] text-gray-500 mb-1 tracking-wide">
                    ISO
                  </div>
                  <div className="font-mono text-[15px] font-bold text-emerald-400">
                    {photo.iso}
                  </div>
                </div>

              </div>

              {photo.note && (
                <div className="font-mono text-[10px] text-gray-500 leading-relaxed">
                  {photo.note}
                </div>
              )}

            </div>
          )}

        </>
      )}

    </div>
  )
}