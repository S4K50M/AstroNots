import { useEffect, useState } from "react"

export default function Navbar({ connected, lastPoll, alertsActive }) {
  const [utc, setUtc] = useState("")

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setUtc(
        `${String(n.getUTCHours()).padStart(2, "0")}:${String(
          n.getUTCMinutes()
        ).padStart(2, "0")}:${String(n.getUTCSeconds()).padStart(2, "0")} UTC`
      )
    }

    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <nav className="flex items-center justify-between gap-2 flex-wrap px-5 py-3 border-b border-white/10 bg-black/70 backdrop-blur-xl sticky top-0 z-[200]">

      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="rgba(0,255,163,0.3)" strokeWidth="1"/>
          <circle cx="14" cy="14" r="8" stroke="rgba(0,255,163,0.15)" strokeWidth="1"/>
          <circle cx="14" cy="14" r="3" fill="#00ffa3" opacity="0.9"/>
          <path d="M14 2 Q18 9 14 14 Q10 9 14 2Z" fill="rgba(0,255,163,0.2)"/>
          <path d="M14 14 Q20 17 26 14 Q20 18 14 26 Q18 18 14 14Z" fill="rgba(0,212,255,0.15)"/>
        </svg>

        <span className="text-[15px] font-bold tracking-wide">
          AURORA
          <span className="text-emerald-400">INTEL</span>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-wrap">

        {alertsActive && (
          <span className="text-[11px] font-mono text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-1 rounded-md tracking-wide whitespace-nowrap animate-fadeIn">
            ⚡ ALERT ACTIVE
          </span>
        )}

        {/* UTC Clock */}
        <span className="hidden sm:inline text-[12px] font-mono text-emerald-400 whitespace-nowrap">
          {utc}
        </span>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 whitespace-nowrap">
          <div
            className={`w-[7px] h-[7px] rounded-full ${
              connected
                ? "bg-emerald-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span>{connected ? "LIVE" : "RECONNECTING"}</span>
        </div>

      </div>
    </nav>
  )
}