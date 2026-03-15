"use client";

function Metric({ label, value, unit, colorClass }) {
  return (
    <div className="bg-void/50 border border-slate-700/50 p-4 rounded-xl flex flex-col items-center justify-center shadow-inner">
      <div className="text-[10px] font-mono tracking-widest text-slate-400 mb-1">{label}</div>
      <div className={`text-3xl font-black ${colorClass}`}>
        {value ?? '--'}
      </div>
      {unit && <div className="text-xs font-mono text-slate-500 mt-1">{unit}</div>}
    </div>
  )
}

export default function MetricsPanel({ mag, plasma, kp }) {
  // Supporting both 'bz_gsm' and 'bz' depending on your backend's exact response
  const bz    = mag?.latest?.bz_gsm ?? mag?.latest?.bz;
  const speed = plasma?.latest?.speed;
  const dens  = plasma?.latest?.density;
  const bt    = mag?.latest?.bt;
  const kpVal = kp?.latest?.kp;

  // Converting your inline style colors to Tailwind text color classes
  const kpColorClass  = kpVal >= 7 ? 'text-red-500' : kpVal >= 5 ? 'text-amber-500' : 'text-emerald-400';
  const bzColorClass  = bz != null && bz < -7 ? 'text-red-500' : bz != null && bz < -4 ? 'text-amber-500' : 'text-emerald-400';
  const spdColorClass = speed != null && speed > 500 ? 'text-amber-500' : 'text-cyan-400';

  const stormLabel = kpVal >= 8 ? 'G4–G5 EXTREME' : kpVal >= 7 ? 'G3 STRONG' :
    kpVal >= 6 ? 'G2 MODERATE' : kpVal >= 5 ? 'G1 MINOR' :
    kpVal >= 3 ? 'ACTIVE' : 'QUIET';

  return (
    <div className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl h-full flex flex-col">
      <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2">
        Solar Wind · Live
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="BZ GSM"  value={bz?.toFixed(1)}    unit="nT"    colorClass={bzColorClass}  />
        <Metric label="SPEED"   value={speed != null ? Math.round(speed) : null} unit="km/s" colorClass={spdColorClass} />
        <Metric label="DENSITY" value={dens?.toFixed(1)}  unit="p/cm³" colorClass="text-cyan-400" />
        <Metric label="BT TOTAL" value={bt?.toFixed(1)}   unit="nT"    colorClass="text-emerald-400" />
      </div>

      <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4 border-b border-slate-700/50 pb-2 mt-auto">
        Geomagnetic Activity
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 bg-void/50 border border-slate-700/50 p-5 rounded-xl">
        <div className="flex flex-col min-w-[120px]">
          <div className={`text-5xl font-black ${kpColorClass} drop-shadow-md`}>
            {kpVal != null ? kpVal.toFixed(1) : '--'}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Kp Index</div>
          <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${kpColorClass}`}>{stormLabel}</div>
        </div>
        
        {/* The Kp Gauge */}
        <div className="flex-1 w-full flex flex-col gap-2">
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 transition-all duration-1000" 
              style={{ width: `${((kpVal ?? 0) / 9) * 100}%` }} 
            />
          </div>
          <div className="flex justify-between px-1 text-[10px] font-mono text-slate-500">
            {[0,3,5,7,9].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}