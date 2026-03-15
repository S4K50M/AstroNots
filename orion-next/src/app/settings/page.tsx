"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, MapPin, Save, Check } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";

export default function SettingsPage() {
  const { latitude, longitude, setLocation } = useLocation();
  const [latInput, setLatInput] = useState(latitude.toString());
  const [lonInput, setLonInput] = useState(longitude.toString());
  const [saved, setSaved] = useState(false);

  // Update inputs when global location changes
  useEffect(() => {
    setLatInput(latitude.toString());
    setLonInput(longitude.toString());
  }, [latitude, longitude]);

  const handleSave = () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLocation(lat, lon);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatInput(position.coords.latitude.toString());
          setLonInput(position.coords.longitude.toString());
          setLocation(position.coords.latitude, position.coords.longitude);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto h-full flex flex-col gap-6">
        
        <header className="flex items-center gap-3">
          <Settings size={28} className="text-violet-400" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase">
            Global <span className="text-slate-500">Settings</span>
          </h1>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2">
            <MapPin size={16} className="text-cyan-400" /> Location Coordinates
          </h2>
          
          <p className="text-[11px] font-mono text-slate-400 mb-6 leading-relaxed">
            Set your global latitude and longitude. These coordinates will be used across all pages 
            (Map, Photography, Telemetry, Routing) for aurora visibility calculations and forecasts.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-mono text-cyan-400 block mb-2 uppercase tracking-wider">
                Latitude (-90 to 90)
              </label>
              <input 
                type="number" 
                step="any"
                value={latInput} 
                onChange={(e) => setLatInput(e.target.value)}
                min="-90"
                max="90"
                className="w-full bg-void border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="69.65"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-mono text-cyan-400 block mb-2 uppercase tracking-wider">
                Longitude (-180 to 180)
              </label>
              <input 
                type="number" 
                step="any"
                value={lonInput} 
                onChange={(e) => setLonInput(e.target.value)}
                min="-180"
                max="180"
                className="w-full bg-void border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="18.96"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={handleSave}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-lg text-xs tracking-widest uppercase transition-all flex justify-center items-center gap-2"
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Location
                  </>
                )}
              </button>
              
              <button 
                onClick={handleGetCurrentLocation}
                className="px-4 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 font-bold py-3 rounded-lg text-xs tracking-widest uppercase transition-all flex justify-center items-center gap-2"
              >
                <MapPin size={16} />
                Use Current
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
              Current Global Location
            </div>
            <div className="text-sm font-mono text-white">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
