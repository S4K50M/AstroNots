"use client";

import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket(onMessageCallback?: (msg: any) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const clientId = useRef(`client-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const connectWs = () => {
      const ws = new WebSocket(`${WS_URL}/${clientId.current}`);
      wsRef.current = ws;

      ws.onopen = () => {
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
        console.error("WebSocket Error:", err);
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