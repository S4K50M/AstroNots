"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Map as MapIcon, 
  Activity, 
  Camera, 
  Navigation as RouteIcon, 
  Bell, 
  Settings 
} from "lucide-react";
import { motion } from "framer-motion";

// The new 7-page architecture
const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/map", icon: MapIcon, label: "Map" },
  { path: "/telemetry", icon: Activity, label: "Telemetry" },
  { path: "/photography", icon: Camera, label: "Photo" },
  { path: "/routing", icon: RouteIcon, label: "Routing" },
  { path: "/alerts", icon: Bell, label: "Alerts" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full md:relative md:w-20 md:h-full bg-surface/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-slate-800/60 z-50">
      
      {/* Desktop Logo Area */}
      <div className="hidden md:flex flex-col items-center pt-6 pb-6">
        <h1 className="text-xs font-black tracking-widest text-cyan-400 rotate-180 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ writingMode: 'vertical-rl' }}>
          ORION
        </h1>
      </div>

      {/* Mobile: horizontally scrollable (overflow-x-auto, no scrollbar)
        Desktop: vertical stack (flex-col) 
      */}
      <div className="flex flex-row md:flex-col justify-start md:justify-start items-center h-[72px] md:h-auto gap-1 md:gap-6 px-2 py-2 md:p-0 overflow-x-auto overflow-y-hidden w-full custom-scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link 
              key={item.path} 
              href={item.path} 
              // shrink-0 prevents icons from squishing on small mobile screens
              className="relative flex flex-col items-center justify-center p-2 group shrink-0 w-[64px] md:w-full h-full md:h-auto"
            >
              <Icon 
                size={20} 
                className={`transition-colors duration-300 z-10 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} 
              />
              <span className={`text-[9px] font-mono tracking-widest mt-1.5 z-10 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
              
              {/* Animated active indicator pill */}
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute inset-1 md:inset-0 md:mx-2 bg-cyan-950/40 rounded-lg md:rounded-xl border border-cyan-900/50"
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