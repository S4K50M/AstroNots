import { useEffect, useState } from 'react'
import styles from './Navbar.module.css'

export default function Navbar({ connected, lastPoll, alertsActive }) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setUtc(`${String(n.getUTCHours()).padStart(2,'0')}:${String(n.getUTCMinutes()).padStart(2,'0')}:${String(n.getUTCSeconds()).padStart(2,'0')} UTC`)
    }
    tick(); const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="rgba(0,255,163,0.3)" strokeWidth="1"/>
          <circle cx="14" cy="14" r="8"  stroke="rgba(0,255,163,0.15)" strokeWidth="1"/>
          <circle cx="14" cy="14" r="3"  fill="#00ffa3" opacity="0.9"/>
          <path d="M14 2 Q18 9 14 14 Q10 9 14 2Z" fill="rgba(0,255,163,0.2)"/>
          <path d="M14 14 Q20 17 26 14 Q20 18 14 26 Q18 18 14 14Z" fill="rgba(0,212,255,0.15)"/>
        </svg>
        <span className={styles.title}>AURORA<span>INTEL</span></span>
      </div>

      <div className={styles.right}>
        {alertsActive && (
          <span className={styles.alertBadge}>⚡ ALERT ACTIVE</span>
        )}
        <span className={styles.time}>{utc}</span>
        <div className={styles.status}>
          <div className={`${styles.dot} ${connected ? styles.live : styles.offline}`} />
          <span>{connected ? 'LIVE' : 'RECONNECTING'}</span>
        </div>
      </div>
    </nav>
  )
}
