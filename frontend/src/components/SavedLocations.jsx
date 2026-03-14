import { useState, useEffect } from 'react'
import { saveLocation, getLocations, deleteLocation, getVisibility } from '../services/api'
import styles from './SavedLocations.module.css'

export default function SavedLocations({ currentLat, currentLon }) {
  const [locations, setLocations] = useState([])
  const [name, setName]           = useState('')
  const [threshold, setThreshold] = useState(60)
  const [saving, setSaving]       = useState(false)
  const [scores, setScores]       = useState({})

  const load = async () => {
    try {
      const data = await getLocations()
      setLocations(data.locations)
      // fetch scores for each
      data.locations.forEach(async loc => {
        try {
          const s = await getVisibility(loc.lat, loc.lon)
          setScores(prev => ({ ...prev, [loc.id]: s.composite_score }))
        } catch {}
      })
    } catch {}
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await saveLocation({ name, lat: currentLat, lon: currentLon, threshold })
      setName('')
      await load()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await deleteLocation(id)
    await load()
  }

  const scoreColor = s => s >= 70 ? '#00ffa3' : s >= 40 ? '#ffb830' : '#ff4d4d'

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Saved Locations</div>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          placeholder="Location name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div className={styles.threshRow}>
          <span className={styles.threshLabel}>Alert when score ≥</span>
          <input
            type="range" min="20" max="90" value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.threshVal}>{threshold}</span>
        </div>
        <button className={styles.btn} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : '+ SAVE CURRENT LOCATION'}
        </button>
      </div>

      {locations.length === 0 && (
        <div className={styles.empty}>No saved locations yet</div>
      )}

      {locations.map(loc => {
        const score = scores[loc.id]
        const alertFiring = score != null && score >= loc.threshold
        return (
          <div key={loc.id} className={`${styles.locCard} ${alertFiring ? styles.alertFiring : ''}`}>
            <div className={styles.locTop}>
              <span className={styles.locName}>{loc.name}</span>
              {alertFiring && <span className={styles.alertBadge}>⚡ ALERT</span>}
              <button className={styles.del} onClick={() => handleDelete(loc.id)}>✕</button>
            </div>
            <div className={styles.locMeta}>
              <span>{loc.lat.toFixed(2)}, {loc.lon.toFixed(2)}</span>
              <span>Threshold: {loc.threshold}</span>
              {score != null && (
                <span style={{ color: scoreColor(score), fontWeight: 700 }}>
                  Score: {Math.round(score)}/100
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
