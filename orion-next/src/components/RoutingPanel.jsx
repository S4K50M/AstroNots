import { getRouting } from "../services/api"
import { useState } from "react"

export default function RoutingPanel({ lat, lon }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const findRoute = async () => {
    if (!lat || !lon) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await getRouting(lat, lon))
    } catch (e) {
      setError("Failed to calculate route. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Title */}
      <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 font-mono">
        Dark Sky Route Finder
      </div>

      {/* Description */}
      <p className="text-[12px] text-gray-400 leading-relaxed">
        Finds the nearest location within 160 km with aurora probability &gt;50%,
        cloud cover &lt;30%, and Bortle class &lt;4.
      </p>

      {/* Button */}
      <button
        onClick={findRoute}
        disabled={loading || !lat}
        className="w-full font-mono text-[12px] tracking-wide
        bg-emerald-400/10 border border-emerald-400/30 text-emerald-400
        rounded-lg px-4 py-2
        hover:bg-emerald-400/20 transition
        disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Searching…" : "⬡ FIND DARK SKY SITE"}
      </button>

      {error && (
        <div className="text-[11px] font-mono text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-zinc-900 rounded-lg p-4">

          {result.found ? (
            <>
              <div className="text-[12px] font-mono text-emerald-400 font-bold mb-3">
                ✓ Site Found
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Distance
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    {result.route.distance_km} km
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Drive Time
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    ~{result.route.estimated_drive_min} min
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Aurora
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    {result.site.aurora_probability}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Bortle
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    {result.site.bortle_class}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Cloud
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    {result.site.cloud_cover_pct}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-mono text-gray-500 mb-1">
                    Bearing
                  </div>
                  <div className="text-[14px] font-mono font-bold text-white">
                    {result.route.bearing_deg}°
                  </div>
                </div>

              </div>

              <a
                href={result.route.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="block text-center font-mono text-[11px]
                text-cyan-400 border border-cyan-400/30 rounded-md
                px-3 py-2 hover:bg-cyan-400/10 transition"
              >
                Open in Google Maps →
              </a>
            </>
          ) : (
            <>
              <div className="text-[12px] font-mono text-amber-400 font-bold mb-2">
                No qualifying site found
              </div>

              <div className="text-[12px] text-gray-400">
                {result.reason}
              </div>
            </>
          )}

        </div>
      )}

    </div>
  )
}