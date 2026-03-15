"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Activity, Bell, Crosshair } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", icon: Map, label: "Map" },
  { path: "/telemetry", icon: Activity, label: "Telemetry" },
  { path: "/alerts", icon: Bell, label: "Alerts" },
  { path: "/targets", icon: Crosshair, label: "Targets" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full md:relative md:w-20 md:h-full bg-surface/90 backdrop-blur-xl border-t md:border-t-0 md:border-r border-slate-800/60 z-50">
      
      {/* Desktop Logo Area */}
      <div className="hidden md:flex flex-col items-center pt-6 pb-8">
        <h1 className="text-xs font-black tracking-widest text-cyan-400 rotate-180" style={{ writingMode: 'vertical-rl' }}>
          ORION
        </h1>
      </div>

      <div className="flex flex-row md:flex-col justify-around md:justify-start items-center h-16 md:h-auto md:gap-8 p-2 md:p-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path} className="relative flex flex-col items-center p-2 group">
              <Icon size={20} className={`transition-colors duration-300 z-10 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className={`text-[9px] font-mono tracking-widest mt-1 z-10 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
              
              {/* Animated active indicator pill */}
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute inset-0 bg-cyan-950/40 rounded-lg md:rounded-xl border border-cyan-900/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}