import { useState, useEffect } from 'react'
import { getVisibility } from '../services/api'
import styles from './VisibilityPanel.module.css'

function ScoreRing({ score }) {
  const r      = 32
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(100, score ?? 0)) / 100)
  const color  = score >= 70 ? '#00ffa3' : score >= 40 ? '#ffb830' : '#ff4d4d'

  return (
    <div className={styles.ringWrap}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringNum} style={{ color }}>{score != null ? Math.round(score) : '--'}</span>
        <span className={styles.ringDenom}>/100</span>
      </div>
    </div>
  )
}

function Bar({ label, value, color }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
      <span className={styles.barVal}>{value != null ? Math.round(value) : '--'}</span>
    </div>
  )
}

export default function VisibilityPanel({ lat, lon, kp }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lat || !lon) return
    setLoading(true)
    getVisibility(lat, lon)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lat, lon])

  const score = data?.composite_score
  const comp  = data?.components
  const photo = data?.photo_settings
  const rec   = data?.recommendation
  const dark  = data?.darkness_breakdown

  return (
    <div className={styles.panel}>
      <div className={styles.sectionLabel}>Visibility Score</div>

      {loading && <div className={styles.loading}>Calculating…</div>}

      {!loading && (
        <>
          <div className={styles.scoreRow}>
            <ScoreRing score={score} />
            <div className={styles.bars}>
              <Bar label="Aurora"   value={comp?.aurora_probability} color="#00ffa3" />
              <Bar label="Darkness" value={comp?.darkness_score}     color="#00d4ff" />
              <Bar label="Clear Sky" value={comp?.cloud_score}       color="#ffb830" />
            </div>
          </div>

          {rec && <div className={styles.rec}>{rec}</div>}

          {dark && (
            <div className={styles.darkDetail}>
              <span>Bortle {dark.bortle_class}</span>
              <span>☽ {Math.round(dark.lunar_score)}</span>
              <span>☆ {Math.round(dark.twilight_score)}</span>
              <span>Cloud {comp?.cloud_cover_pct != null ? `${Math.round(comp.cloud_cover_pct)}%` : '--'}</span>
            </div>
          )}

          {photo && (
            <div className={styles.photoWrap}>
              <div className={styles.sectionLabel} style={{marginBottom: 8}}>Photography · Kp {kp ?? '--'}</div>
              <div className={styles.photoGrid}>
                <div className={styles.photoCard}>
                  <div className={styles.photoKey}>APERTURE</div>
                  <div className={styles.photoVal}>{photo.aperture}</div>
                </div>
                <div className={styles.photoCard}>
                  <div className={styles.photoKey}>SHUTTER</div>
                  <div className={styles.photoVal}>{photo.shutter}</div>
                </div>
                <div className={styles.photoCard}>
                  <div className={styles.photoKey}>ISO</div>
                  <div className={styles.photoVal}>{photo.iso}</div>
                </div>
              </div>
              {photo.note && <div className={styles.photoNote}>{photo.note}</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
