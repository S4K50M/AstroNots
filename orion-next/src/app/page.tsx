import Earth3D from "@/components/Earth3D";

export default function Home() {
  return (
    <div className="h-full w-full p-4 overflow-y-auto custom-scrollbar">
      
      {/* Desktop Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 max-w-7xl mx-auto h-full">
        
        {/* Main 3D Vis / Map Area */}
        <div className="md:col-span-8 lg:col-span-9 h-[400px] md:h-full relative rounded-2xl bg-surface border border-slate-800/60 overflow-hidden flex flex-col group shadow-2xl">
          <div className="absolute top-4 left-4 z-10 bg-void/60 backdrop-blur-md border border-slate-700 p-2 rounded flex flex-col gap-1 pointer-events-none">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">Geospatial Array</span>
            <span className="text-[9px] font-mono text-slate-400">Live 3D Telemetry</span>
          </div>
          
          {/* Drop your 3D Earth here */}
          <Earth3D />
        </div>

        {/* Side Metrics Panel (Stacks under map on mobile) */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 min-h-0">
          
          <div className="rounded-2xl bg-surface border border-slate-800/60 p-5 shadow-lg relative overflow-hidden">
            {/* Cool background glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-cyan-500 blur-3xl opacity-10 pointer-events-none"></div>
            
            <h2 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2">
              System Status
            </h2>
            <div className="text-5xl font-black text-white">NOMINAL</div>
            <div className="text-xs font-mono text-cyan-400 mt-2">Uplink Established</div>
          </div>

          <div className="flex-1 rounded-2xl bg-surface border border-slate-800/60 p-5 shadow-lg">
             <h2 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2">
              Quick Actions
            </h2>
            {/* Pop-up animated button */}
            <button className="w-full bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-500 hover:text-void text-cyan-400 transition-all duration-300 py-3 rounded-lg font-mono text-xs uppercase tracking-widest active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              Refresh Telemetry
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}