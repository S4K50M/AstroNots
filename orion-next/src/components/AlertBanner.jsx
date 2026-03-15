export default function AlertBanner({ mag, plasma, wsAlerts }) {
  const bz = mag?.latest?.bz_gsm
  const speed = plasma?.latest?.speed

  const bzAlert = bz != null && bz < -7
  const speedAlert = speed != null && speed > 500

  const latest = wsAlerts?.[0]

  if (!bzAlert && !speedAlert && !latest) return null

  return (
    <div className="flex flex-wrap gap-4 px-5 py-2 border-b border-red-400/30 bg-red-400/10 animate-[fadeIn_0.4s_ease]">

      {bzAlert && (
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-red-400 whitespace-nowrap">
            ⚡ BZ ALERT
          </span>

          <span className="text-[12px] text-gray-400">
            Southward IMF — Bz = <b className="text-white">{bz?.toFixed(1)} nT</b> (threshold −7.0 nT)
          </span>
        </span>
      )}

      {speedAlert && (
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-amber-400 whitespace-nowrap">
            🌬 SPEED ALERT
          </span>

          <span className="text-[12px] text-gray-400">
            Solar wind <b className="text-white">{Math.round(speed)} km/s</b> exceeds 500 km/s
          </span>
        </span>
      )}

      {latest?.type === "SUBSTORM_PRECURSOR" && (
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-teal-400 whitespace-nowrap">
            ⚠ SUBSTORM
          </span>

          <span className="text-[12px] text-gray-400">
            Onset likely within ~10 min — head outside now
          </span>
        </span>
      )}

    </div>
  )
}