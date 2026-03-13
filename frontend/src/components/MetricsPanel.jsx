import styles from './MetricsPanel.module.css'

function Metric({ label, value, unit, color }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={{ color: color ?? 'var(--aurora)' }}>
        {value ?? '--'}
      </div>
      {unit && <div className={styles.unit}>{unit}</div>}
    </div>
  )
}

export default function MetricsPanel({ mag, plasma, kp }) {
  const bz    = mag?.latest?.bz_gsm
  const speed = plasma?.latest?.speed
  const dens  = plasma?.latest?.density
  const bt    = mag?.latest?.bt
  const kpVal = kp?.latest?.kp

  const kpColor  = kpVal >= 7 ? 'var(--red)' : kpVal >= 5 ? 'var(--amber)' : 'var(--aurora)'
  const bzColor  = bz != null && bz < -7 ? 'var(--red)' : bz != null && bz < -4 ? 'var(--amber)' : 'var(--aurora)'
  const spdColor = speed != null && speed > 500 ? 'var(--amber)' : 'var(--teal)'

  const stormLabel = kpVal >= 8 ? 'G4–G5 EXTREME' : kpVal >= 7 ? 'G3 STRONG' :
    kpVal >= 6 ? 'G2 MODERATE' : kpVal >= 5 ? 'G1 MINOR' :
    kpVal >= 3 ? 'ACTIVE' : 'QUIET'

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Solar Wind · Live</div>

      <div className={styles.grid}>
        <Metric label="BZ GSM"  value={bz?.toFixed(1)}    unit="nT"    color={bzColor}  />
        <Metric label="SPEED"   value={speed != null ? Math.round(speed) : null} unit="km/s" color={spdColor} />
        <Metric label="DENSITY" value={dens?.toFixed(1)}  unit="p/cm³" color="var(--teal)" />
        <Metric label="BT TOTAL" value={bt?.toFixed(1)}   unit="nT"    color="var(--aurora)" />
      </div>

      <div className={styles.sectionLabel} style={{marginTop: 4}}>Geomagnetic Activity</div>

      <div className={styles.kpRow}>
        <div>
          <div className={styles.kpBig} style={{ color: kpColor }}>
            {kpVal != null ? kpVal.toFixed(0) : '--'}
          </div>
          <div className={styles.kpSub}>Kp Index</div>
          <div className={styles.kpStorm} style={{ color: kpColor }}>{stormLabel}</div>
        </div>
        <div className={styles.kpGauge}>
          <div className={styles.kpTrack}>
            <div className={styles.kpFill} style={{ width: `${((kpVal ?? 0) / 9) * 100}%` }} />
          </div>
          <div className={styles.kpTicks}>
            {[0,3,5,7,9].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}
