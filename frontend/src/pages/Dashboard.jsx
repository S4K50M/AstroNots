import { useState, useCallback, useRef, useEffect } from 'react'
import Navbar         from '../components/Navbar'
import AlertBanner    from '../components/AlertBanner'
import AuroraMap      from '../components/AuroraMap'
import SolarCharts    from '../components/SolarCharts'
import MetricsPanel   from '../components/MetricsPanel'
import VisibilityPanel from '../components/VisibilityPanel'
import RoutingPanel     from '../components/RoutingPanel'
import SavedLocations   from '../components/SavedLocations'
import AlertsTab        from '../components/AlertsTab'
import ForecastChart    from '../components/ForecastChart'
import { useSpaceWeather } from '../hooks/useSpaceWeather'
import { useWebSocket }    from '../hooks/useWebSocket'
import { useLocation } from '../contexts/LocationContext'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { status, mag, plasma, ovation, kp, alerts, lastPoll } = useSpaceWeather()
  // Use global location from context
  const { latitude: lat, longitude: lon, setLocation } = useLocation()

  const [wsAlerts, setWsAlerts] = useState([])
  const [inputLat, setInputLat] = useState(lat.toString())
  const [inputLon, setInputLon] = useState(lon.toString())
  const [visScore, setVisScore] = useState(null)
  const [activeTab, setActiveTab] = useState('visibility')

  // Update inputs when global location changes
  useEffect(() => {
    setInputLat(lat.toString())
    setInputLon(lon.toString())
  }, [lat, lon])

  const onMessage = useCallback((msg) => {
    if (msg.type === 'SPACE_WEATHER_ALERT' || msg.type === 'SUBSTORM_PRECURSOR') {
      setWsAlerts(prev => [msg, ...prev].slice(0, 5))
    }
  }, [])

  const { connected } = useWebSocket(onMessage)

  const applyLocation = () => {
    const la = parseFloat(inputLat)
    const lo = parseFloat(inputLon)
    if (!isNaN(la) && !isNaN(lo)) {
      setLocation(la, lo)
    }
  }

  const alertsActive = status?.alerts_active || wsAlerts.length > 0

  return (
    <div className={styles.shell}>
      <Navbar connected={connected} lastPoll={lastPoll} alertsActive={alertsActive} />
      <AlertBanner mag={mag} plasma={plasma} wsAlerts={wsAlerts} />

      <div className={styles.layout}>

        {/* ── LEFT: map + charts ── */}
        <div className={styles.left}>
          <div className={styles.mapWrap}>
            <div className={styles.mapTopBar}>
              <span className={styles.mapLabel}>OVATION Auroral Probability</span>
              <span className={styles.mapMeta}>
                {ovation?.observation_time
                  ? `${new Date(ovation.observation_time).toUTCString().slice(5,22)} UTC`
                  : 'Awaiting data…'}
              </span>
            </div>
            <AuroraMap
              ovation={ovation}
              userLat={lat}
              userLon={lon}
              score={visScore}
            />
          </div>

          <SolarCharts mag={mag} plasma={plasma} />
        </div>

        {/* ── RIGHT: control panel ── */}
        <div className={styles.right}>

          {/* Location */}
          <div className={styles.locRow}>
            <input
              className={styles.locInput}
              value={inputLat}
              onChange={e => setInputLat(e.target.value)}
              placeholder="Latitude"
            />
            <input
              className={styles.locInput}
              value={inputLon}
              onChange={e => setInputLon(e.target.value)}
              placeholder="Longitude"
            />
            <button className={styles.locBtn} onClick={applyLocation}>GO</button>
          </div>

          {/* Metrics */}
          <MetricsPanel mag={mag} plasma={plasma} kp={kp} />

          {/* Tabs */}
          <div className={styles.tabs}>
            {['visibility','routing','alerts'].map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'visibility' && (
              <VisibilityPanel lat={lat} lon={lon} kp={kp?.latest?.kp} />
            )}
            {activeTab === 'routing' && (
              <RoutingPanel lat={lat} lon={lon} />
            )}
            {activeTab === 'alerts' && (
              <AlertsTab alerts={alerts} wsAlerts={wsAlerts} />
            )}
          </div>
          <ForecastChart />
          <SavedLocations currentLat={lat} currentLon={lon} />
        </div>
      </div>
    </div>
  )
}
