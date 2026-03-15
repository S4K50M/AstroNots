"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useVisibility(lat: number, lon: number) {
  const [visibility, setVisibility] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisibility = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/visibility?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const data = await res.json();
          setVisibility(data);
        }
      } catch (err) {
        console.error("Visibility fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lon) {
      fetchVisibility();
      // Optionally poll local weather every 5 mins
      const interval = setInterval(fetchVisibility, 300000); 
      return () => clearInterval(interval);
    }
  }, [lat, lon]);

  return { visibility, loading };
}