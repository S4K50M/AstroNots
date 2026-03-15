"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useSpaceWeather() {
  const [data, setData] = useState({
    status: null,
    mag: null,
    plasma: null,
    ovation: null,
    kp: null,
    alerts: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, magRes, plasmaRes, ovationRes, kpRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/space-weather/status`),
        fetch(`${API_URL}/api/space-weather/mag`),
        fetch(`${API_URL}/api/space-weather/plasma`),
        fetch(`${API_URL}/api/space-weather/ovation`),
        fetch(`${API_URL}/api/space-weather/kp`),
        fetch(`${API_URL}/api/space-weather/noaa-alerts`),
      ]);

      setData({
        status: statusRes.ok ? await statusRes.json() : null,
        mag: magRes.ok ? await magRes.json() : null,
        plasma: plasmaRes.ok ? await plasmaRes.json() : null,
        ovation: ovationRes.ok ? await ovationRes.json() : null,
        kp: kpRes.ok ? await kpRes.json() : null,
        alerts: alertsRes.ok ? await alertsRes.json() : null,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("Failed to fetch space weather:", err);
      setData((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    fetchAll(); // Initial fetch
    const interval = setInterval(fetchAll, 60000); // Poll every 1 minute
    return () => clearInterval(interval);
  }, [fetchAll]);

  return data;
}