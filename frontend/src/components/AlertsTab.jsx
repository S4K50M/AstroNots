import { useState } from 'react'
import styles from './AlertsTab.module.css'

function parseMessage(msg) {
  if (!msg) return { title: 'Unknown Alert', impacts: [], valid: '', type: '' }
  const lines = msg.replace(/\r/g, '').split('\n').filter(l => l.trim())
  
  const titleLine = lines.find(l => l.includes('WARNING') || l.includes('WATCH') || l.includes('ALERT') || l.includes('SUMMARY'))
  const title = titleLine ? titleLine.trim() : lines[0]
  
  const validFrom = lines.find(l => l.startsWith('Valid From'))?.replace('Valid From: ', '') || ''
  const validUntil = lines.find(l => l.includes('Now Valid Until') || l.includes('Valid To'))?.split(': ')[1] || ''
  
  const impactStart = lines.findIndex(l => l.includes('Potential Impacts'))
  const impacts = impactStart >= 0 
    ? lines.slice(impactStart + 1).filter(l => l.trim() && !l.includes('www.')).slice(0, 4)
    : []

  return { title, impacts, validFrom, validUntil }
}

function severityFromId(product_id) {
  if (!product_id) return 'info'
  if (product_id.includes('K08') || product_id.includes('K09')) return 'extreme'
  if (product_id.includes('K07')) return 'severe'
  if (product_id.includes('K06') || product_id.includes('K05')) return 'moderate'
  if (product_id.includes('K04') || product_id.includes('K03')) return 'minor'
  return 'info'
}

const SEVERITY_COLORS = {
  extreme:  '#ff4d4d',
  severe:   '#ff4d4d',
  moderate: '#ffb830',
  minor:    '#00d4ff',
  info:     '#7a8aaa',
}

const SEVERITY_LABELS = {
  extreme:  'G4-G5 EXTREME',
  severe:   'G3 STRONG',
  moderate: 'G1-G2 STORM',
  minor:    'WATCH',
  info:     'INFO',
}

export default function AlertsTab({ alerts, wsAlerts }) {
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]     = useState('all')

  const noaaAlerts = (alerts?.alerts || []).slice(0, 20)
  
  const filtered = filter === 'all' 
    ? noaaAlerts 
    : noaaAlerts.filter(a => {
        const sev = severityFromId(a.product_id)
        if (filter === 'storm') return ['extreme','severe','moderate'].includes(sev)
        if (filter === 'watch') return sev === 'minor'
        return true
      })

  return (
    <div className={styles.wrap}>

      {/* Real-time WS alerts */}
      {wsAlerts?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Real-time Events</div>
          {wsAlerts.map((a, i) => (
            <div key={i} className={styles.rtAlert}>
              <span className={styles.rtType}>{a.event?.type ?? a.type}</span>
              <span className={styles.rtMsg}>
                {a.event?.bz_gsm != null && `Bz ${a.event.bz_gsm.toFixed(1)} nT`}
                {a.event?.speed_km_s != null && ` · Speed ${Math.round(a.event.speed_km_s)} km/s`}
                {a.event?.warning && ` · ${a.event.warning}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.filters}>
        {['all','storm','watch'].map(f => (
          <button
            key={f}
            className={`${styles.filter} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <span className={styles.count}>{filtered.length} alerts</span>
      </div>

      {/* NOAA alerts list */}
      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>No alerts matching filter</div>
        )}
        {filtered.map((alert, i) => {
          const sev     = severityFromId(alert.product_id)
          const color   = SEVERITY_COLORS[sev]
          const label   = SEVERITY_LABELS[sev]
          const parsed  = parseMessage(alert.message)
          const isOpen  = expanded === i
          const time    = alert.issue_datetime 
            ? new Date(alert.issue_datetime).toUTCString().slice(5, 22) + ' UTC'
            : ''

          return (
            <div
              key={i}
              className={styles.alertCard}
              style={{ borderLeftColor: color }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <div className={styles.alertTop}>
                <span className={styles.alertSev} style={{ color }}>{label}</span>
                <span className={styles.alertTime}>{time}</span>
                <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
              </div>
              <div className={styles.alertTitle}>{parsed.title}</div>

              {isOpen && (
                <div className={styles.alertDetail}>
                  {parsed.validFrom && (
                    <div className={styles.valid}>
                      Valid: {parsed.validFrom} → {parsed.validUntil}
                    </div>
                  )}
                  {parsed.impacts.length > 0 && (
                    <div className={styles.impacts}>
                      <div className={styles.impactsLabel}>Potential Impacts:</div>
                      {parsed.impacts.map((imp, j) => (
                        <div key={j} className={styles.impact}>· {imp}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
