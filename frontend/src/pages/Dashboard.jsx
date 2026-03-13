import { useState, useCallback, useRef } from 'react'
import Navbar         from '../components/Navbar'
import AlertBanner    from '../components/AlertBanner'
import AuroraMap      from '../components/AuroraMap'
import SolarCharts    from '../components/SolarCharts'
import MetricsPanel   from '../components/MetricsPanel'
import VisibilityPanel from '../components/VisibilityPanel'
import RoutingPanel   from '../components/RoutingPanel'
import { useSpaceWeather } from '../hooks/useSpaceWeather'
import { useWebSocket }    from '../hooks/useWebSocket'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { status, mag, plasma, ovation, kp, alerts, lastPoll } = useSpaceWeather()

  const [wsAlerts, setWsAlerts] = useState([])
  const [lat, setLat] = useState(55.86)
  const [lon, setLon] = useState(-4.25)
  const [inputLat, setInputLat] = useState('55.86')
  const [inputLon, setInputLon] = useState('-4.25')
  const [visScore, setVisScore] = useState(null)
  const [activeTab, setActiveTab] = useState('visibility')

  const onMessage = useCallback((msg) => {
    if (msg.type === 'SPACE_WEATHER_ALERT' || msg.type === 'SUBSTORM_PRECURSOR') {
      setWsAlerts(prev => [msg, ...prev].slice(0, 5))
    }
  }, [])

  const { connected } = useWebSocket(onMessage)

  const applyLocation = () => {
    const la = parseFloat(inputLat)
    const lo = parseFloat(inputLon)
    if (!isNaN(la) && !isNaN(lo)) { setLat(la); setLon(lo) }
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
              <div className={styles.alertsList}>
                <div className={styles.sectionLabel}>Active NOAA Alerts</div>
                {alerts?.alerts?.length > 0 ? alerts.alerts.map((a, i) => (
                  <div key={i} className={styles.alertItem}>
                    <div className={styles.alertSev}>{a.severity ?? 'WATCH'}</div>
                    <div className={styles.alertMsg}>{a.message?.slice(0, 200) ?? 'Geomagnetic disturbance in progress'}</div>
                  </div>
                )) : (
                  <div className={styles.noAlerts}>No active alerts</div>
                )}
                {wsAlerts.length > 0 && (
                  <>
                    <div className={styles.sectionLabel} style={{marginTop:12}}>Real-time Events</div>
                    {wsAlerts.map((a, i) => (
                      <div key={i} className={`${styles.alertItem} ${styles.wsAlert}`}>
                        <div className={styles.alertSev} style={{color:'var(--teal)'}}>{a.event?.type ?? a.type}</div>
                        <div className={styles.alertMsg}>
                          {a.event?.bz_gsm != null && `Bz ${a.event.bz_gsm.toFixed(1)} nT`}
                          {a.event?.speed_km_s != null && `Speed ${Math.round(a.event.speed_km_s)} km/s`}
                          {a.event?.warning}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
