function Metric({ label, value, unit, color }) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg p-3">
      <div className="text-[9px] tracking-widest text-gray-500 font-mono mb-1">
        {label}
      </div>

      <div
        className="text-[20px] font-bold leading-none font-mono"
        style={{ color: color ?? "#00ffa3" }}
      >
        {value ?? "--"}
      </div>

      {unit && (
        <div className="text-[10px] text-gray-500 font-mono mt-1">
          {unit}
        </div>
      )}
    </div>
  )
}

export default function MetricsPanel({ mag, plasma, kp }) {
  const bz = mag?.latest?.bz_gsm
  const speed = plasma?.latest?.speed
  const dens = plasma?.latest?.density
  const bt = mag?.latest?.bt
  const kpVal = kp?.latest?.kp

  const kpColor =
    kpVal >= 7 ? "#ff4d4d" :
    kpVal >= 5 ? "#ffb830" :
    "#00ffa3"

  const bzColor =
    bz != null && bz < -7 ? "#ff4d4d" :
    bz != null && bz < -4 ? "#ffb830" :
    "#00ffa3"

  const spdColor =
    speed != null && speed > 500 ? "#ffb830" : "#14b8a6"

  const stormLabel =
    kpVal >= 8 ? "G4–G5 EXTREME" :
    kpVal >= 7 ? "G3 STRONG" :
    kpVal >= 6 ? "G2 MODERATE" :
    kpVal >= 5 ? "G1 MINOR" :
    kpVal >= 3 ? "ACTIVE" :
    "QUIET"

  return (
    <div className="flex flex-col gap-3">

      {/* Solar wind section */}
      <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 font-mono">
        Solar Wind · Live
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="BZ GSM" value={bz?.toFixed(1)} unit="nT" color={bzColor} />
        <Metric label="SPEED" value={speed != null ? Math.round(speed) : null} unit="km/s" color={spdColor} />
        <Metric label="DENSITY" value={dens?.toFixed(1)} unit="p/cm³" color="#14b8a6" />
        <Metric label="BT TOTAL" value={bt?.toFixed(1)} unit="nT" color="#00ffa3" />
      </div>

      {/* KP section */}
      <div className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2 mt-1 font-mono">
        Geomagnetic Activity
      </div>

      <div className="flex items-center gap-4">

        {/* KP value */}
        <div>
          <div
            className="text-[38px] font-extrabold leading-none font-mono"
            style={{ color: kpColor }}
          >
            {kpVal != null ? kpVal.toFixed(0) : "--"}
          </div>

          <div className="text-[10px] text-gray-400 font-mono mt-1">
            Kp Index
          </div>

          <div
            className="text-[10px] font-bold font-mono mt-1"
            style={{ color: kpColor }}
          >
            {stormLabel}
          </div>
        </div>

        {/* KP gauge */}
        <div className="flex-1">
          <div className="h-2 bg-zinc-800 rounded overflow-hidden mb-1">
            <div
              className="h-full rounded transition-all duration-700"
              style={{
                width: `${((kpVal ?? 0) / 9) * 100}%`,
                background:
                  "linear-gradient(90deg,#00ffa3 0%,#ffb830 60%,#ff4d4d 100%)"
              }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-gray-500 font-mono">
            {[0, 3, 5, 7, 9].map(n => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}