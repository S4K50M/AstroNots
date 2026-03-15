"use client";

import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket(onMessageCallback?: (msg: any) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const clientId = useRef(`client-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const connectWs = () => {
      const fullUrl = `${WS_URL}?client_id=${clientId.current}`;
      console.log("Attempting WebSocket connection to:", fullUrl);
      const ws = new WebSocket(fullUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected successfully to:", fullUrl);
        setConnected(true);
        // Subscribe to all alerts automatically
        ws.send(JSON.stringify({ action: "subscribe", location_id: "ALL" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageCallback) onMessageCallback(data);
        } catch (e) {
          console.error("WebSocket message parse error", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3 seconds
        setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", {
          readyState: ws.readyState,
          url: ws.url,
          error: err,
          timestamp: new Date().toISOString()
        });
        setConnected(false);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onMessageCallback]);

  return { connected, clientId: clientId.current };
}