"use client";

function Metric({ label, value, unit, colorClass, glowColor }) {
  return (
    <div className="relative bg-[#070512]/60 border border-slate-800/70 p-3 md:p-4 rounded-xl flex flex-col items-center justify-center text-center overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-50"
        style={{ background: `linear-gradient(to right, transparent, ${glowColor}80, transparent)` }}
      />
      <div className="text-[9px] md:text-[10px] font-mono tracking-widest text-slate-500 mb-1">{label}</div>
      <div
        className={`text-2xl md:text-3xl font-black ${colorClass} tracking-tight`}
        style={{ textShadow: `0 0 18px ${glowColor}45` }}
      >
        {value ?? '--'}
      </div>
      {unit && <div className="text-[10px] font-mono text-slate-600 mt-1">{unit}</div>}
    </div>
  )
}

export default function MetricsPanel({ mag, plasma, kp }) {
  const bz    = mag?.latest?.bz_gsm ?? mag?.latest?.bz;
  const speed = plasma?.latest?.speed;
  const dens  = plasma?.latest?.density;
  const bt    = mag?.latest?.bt;
  const kpVal = kp?.latest?.kp;

  const kpColorClass  = kpVal >= 7 ? 'text-rose-400'    : kpVal >= 5 ? 'text-orange-400'  : 'text-teal-400';
  const bzColorClass  = bz != null && bz < -7 ? 'text-rose-400' : bz != null && bz < -4 ? 'text-fuchsia-400' : 'text-violet-400';
  const spdColorClass = speed != null && speed > 600 ? 'text-rose-400' : speed != null && speed > 500 ? 'text-orange-400' : 'text-amber-300';

  const stormLabel = kpVal >= 8 ? 'G4–G5 EXTREME' : kpVal >= 7 ? 'G3 STRONG' :
    kpVal >= 6 ? 'G2 MODERATE' : kpVal >= 5 ? 'G1 MINOR' :
    kpVal >= 3 ? 'ACTIVE' : 'QUIET';

  const kpGlowColor = kpVal >= 7 ? '#f87171' : kpVal >= 5 ? '#fb923c' : '#2dd4bf';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800/70 shadow-xl w-full">
      <div className="absolute inset-0 bg-[#07050f]/75 backdrop-blur-xl" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />

      <div className="relative z-10 p-4 md:p-6 flex flex-col gap-4">

        {/* Solar Wind header */}
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <div className="w-0.5 h-4 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]" />
          <div className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">Solar Wind · Live</div>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shadow-[0_0_6px_#f97316]" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Metric label="BZ GSM"   value={bz?.toFixed(1)}    unit="nT"    colorClass={bzColorClass}       glowColor="#8b5cf6" />
          <Metric label="SPEED"    value={speed != null ? Math.round(speed) : null} unit="km/s" colorClass={spdColorClass} glowColor="#f97316" />
          <Metric label="DENSITY"  value={dens?.toFixed(1)}  unit="p/cm³" colorClass="text-amber-300"     glowColor="#d97706" />
          <Metric label="BT TOTAL" value={bt?.toFixed(1)}    unit="nT"    colorClass="text-teal-400"      glowColor="#14b8a6" />
        </div>

        {/* Geomagnetic header */}
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3 mt-1">
          <div className="w-0.5 h-4 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6]" />
          <div className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">Geomagnetic Activity</div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-[#06040e]/60 border border-slate-800/50 p-4 md:p-5 rounded-xl">
          <div className="flex flex-col items-center md:items-start min-w-[120px]">
            <div
              className={`text-4xl md:text-5xl font-black ${kpColorClass}`}
              style={{ textShadow: kpVal >= 3 ? `0 0 28px ${kpGlowColor}65` : 'none' }}
            >
              {kpVal != null ? kpVal.toFixed(1) : '--'}
            </div>
            <div className="text-[9px] font-mono text-slate-500 mt-1 tracking-widest">Kp Index</div>
            <div className={`text-[9px] font-bold tracking-[0.16em] uppercase mt-1.5 ${kpColorClass}`}>{stormLabel}</div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-2 mt-2 md:mt-0">
            <div className="h-3 w-full bg-slate-900/80 rounded-full overflow-hidden border border-slate-800/50">
              <div
                className="h-full transition-all duration-1000 rounded-full"
                style={{
                  width: `${((kpVal ?? 0) / 9) * 100}%`,
                  background: 'linear-gradient(to right, #0d9488, #d97706 55%, #dc2626)',
                  boxShadow: kpVal >= 5 ? `0 0 10px ${kpGlowColor}55` : 'none',
                }}
              />
            </div>
            <div className="flex justify-between px-1 text-[10px] font-mono text-slate-600">
              {[0, 3, 5, 7, 9].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}