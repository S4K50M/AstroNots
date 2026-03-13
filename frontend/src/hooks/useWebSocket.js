import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const clientId = useRef(`client_${Math.random().toString(36).slice(2, 9)}`)

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}/ws/${clientId.current}`
    const ws    = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
      // Subscribe to all alerts
      ws.send(JSON.stringify({ action: 'subscribe', location_id: 'ALL' }))
    }
    ws.onmessage = (e) => {
      try { onMessage?.(JSON.parse(e.data)) } catch {}
    }
    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 5s
      setTimeout(connect, 5000)
    }
    ws.onerror  = () => ws.close()
    wsRef.current = ws
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { connected, send }
}
