import { useState, useEffect, useRef, useCallback } from 'react'
import { getStatus, getMag, getPlasma, getOvation, getKp, getAlerts } from '../services/api'

export function useSpace() {
  const [status,  setStatus]  = useState(null)
  const [mag,     setMag]     = useState(null)
  const [plasma,  setPlasma]  = useState(null)
  const [ovation, setOvation] = useState(null)
  const [kp,      setKp]      = useState(null)
  const [alerts,  setAlerts]  = useState(null)
  const [error,   setError]   = useState(null)
  const [lastPoll, setLastPoll] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [s, m, p, k] = await Promise.all([
        getStatus(), getMag(), getPlasma(), getKp()
      ])
      setStatus(s); setMag(m); setPlasma(p); setKp(k)
      setLastPoll(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const fetchOvation = useCallback(async () => {
    try { setOvation(await getOvation()) } catch {}
  }, [])

  const fetchAlerts = useCallback(async () => {
    try { setAlerts(await getAlerts()) } catch {}
  }, [])

  useEffect(() => {
    fetchAll();   fetchOvation();   fetchAlerts()
    const t1 = setInterval(fetchAll,    60_000)
    const t2 = setInterval(fetchOvation, 1_800_000)
    const t3 = setInterval(fetchAlerts,  60_000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [fetchAll, fetchOvation, fetchAlerts])

  return { status, mag, plasma, ovation, kp, alerts, error, lastPoll, refetch: fetchAll }
}
