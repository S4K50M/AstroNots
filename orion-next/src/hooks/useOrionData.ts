"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useOrionData() {
  const [data, setData] = useState({
    status: null,
    visibility: null,
    loading: true,
  });

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        // Fetch Status & Visibility concurrently (using your FastAPI endpoints)
        const [statusRes, visRes] = await Promise.all([
          fetch(`${API_URL}/api/space-weather/status`),
          // Hardcoding a default lat/lon for the initial boot (e.g., Tromsø or user's location)
          fetch(`${API_URL}/api/visibility?lat=69.65&lon=18.96`)
        ]);

        const statusData = await statusRes.json();
        const visData = await visRes.json();

        setData({
          status: statusData,
          visibility: visData,
          loading: false,
        });
      } catch (error) {
        console.error("Uplink Failure:", error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchTelemetry();
    // Poll every 60 seconds
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, []);

  return data;
}