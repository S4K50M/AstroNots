import styles from './AlertBanner.module.css'

export default function AlertBanner({ mag, plasma, wsAlerts }) {
  const bz    = mag?.latest?.bz_gsm
  const speed = plasma?.latest?.speed
  const bzAlert    = bz    != null && bz    < -7
  const speedAlert = speed != null && speed > 500

  const latest = wsAlerts?.[0]

  if (!bzAlert && !speedAlert && !latest) return null

  return (
    <div className={styles.banner}>
      {bzAlert && (
        <span className={styles.item}>
          <span className={styles.tag}>⚡ BZ ALERT</span>
          <span className={styles.msg}>
            Southward IMF — Bz = <b>{bz?.toFixed(1)} nT</b> (threshold −7.0 nT)
          </span>
        </span>
      )}
      {speedAlert && (
        <span className={styles.item}>
          <span className={styles.tag} style={{color:'var(--amber)'}}>🌬 SPEED ALERT</span>
          <span className={styles.msg}>
            Solar wind <b>{Math.round(speed)} km/s</b> exceeds 500 km/s
          </span>
        </span>
      )}
      {latest?.type === 'SUBSTORM_PRECURSOR' && (
        <span className={styles.item}>
          <span className={styles.tag} style={{color:'var(--teal)'}}>⚠ SUBSTORM</span>
          <span className={styles.msg}>Onset likely within ~10 min — head outside now</span>
        </span>
      )}
    </div>
  )
}
