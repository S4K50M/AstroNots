import { useState } from 'react'
import { getRouting } from '../services/api'
import styles from './RoutingPanel.module.css'

export default function RoutingPanel({ lat, lon }) {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const findRoute = async () => {
    if (!lat || !lon) return
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await getRouting(lat, lon))
    } catch (e) {
      setError('Failed to calculate route. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.sectionLabel}>Dark Sky Route Finder</div>
      <p className={styles.desc}>
        Finds the nearest location within 160 km with aurora probability &gt;50%,
        cloud cover &lt;30%, and Bortle class &lt;4.
      </p>

      <button className={styles.btn} onClick={findRoute} disabled={loading || !lat}>
        {loading ? 'Searching…' : '⬡ FIND DARK SKY SITE'}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.result}>
          {result.found ? (
            <>
              <div className={styles.found}>✓ Site Found</div>
              <div className={styles.grid}>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Distance</div>
                  <div className={styles.statVal}>{result.route.distance_km} km</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Drive Time</div>
                  <div className={styles.statVal}>~{result.route.estimated_drive_min} min</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Aurora</div>
                  <div className={styles.statVal}>{result.site.aurora_probability}%</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Bortle</div>
                  <div className={styles.statVal}>{result.site.bortle_class}</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Cloud</div>
                  <div className={styles.statVal}>{result.site.cloud_cover_pct}%</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Bearing</div>
                  <div className={styles.statVal}>{result.route.bearing_deg}°</div>
                </div>
              </div>
              <a
                className={styles.mapsLink}
                href={result.route.google_maps_url}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps →
              </a>
            </>
          ) : (
            <>
              <div className={styles.notFound}>No qualifying site found</div>
              <div className={styles.reason}>{result.reason}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
