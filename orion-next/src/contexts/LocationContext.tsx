"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LocationContextType {
  latitude: number;
  longitude: number;
  setLocation: (lat: number, lon: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const DEFAULT_LAT = 69.65; // Tromsø, Norway
const DEFAULT_LON = 18.96;

export function LocationProvider({ children }: { children: ReactNode }) {
  const [latitude, setLatitude] = useState<number>(DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(DEFAULT_LON);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLat = localStorage.getItem("global_latitude");
      const savedLon = localStorage.getItem("global_longitude");
      
      if (savedLat && savedLon) {
        const lat = parseFloat(savedLat);
        const lon = parseFloat(savedLon);
        if (!isNaN(lat) && !isNaN(lon)) {
          setLatitude(lat);
          setLongitude(lon);
        }
      }
    }
  }, []);

  // Save to localStorage whenever location changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("global_latitude", latitude.toString());
      localStorage.setItem("global_longitude", longitude.toString());
    }
  }, [latitude, longitude]);

  const setLocation = (lat: number, lon: number) => {
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLatitude(lat);
      setLongitude(lon);
    }
  };

  return (
    <LocationContext.Provider value={{ latitude, longitude, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
