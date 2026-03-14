import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (online) return null
  return (
    <div style={{
      background: 'rgba(255,184,48,0.12)', borderBottom: '1px solid rgba(255,184,48,0.3)',
      color: '#ffb830', fontFamily: 'var(--mono)', fontSize: '11px',
      padding: '6px 20px', textAlign: 'center', letterSpacing: '0.08em'
    }}>
      ⚠ OFFLINE — showing cached forecast data
    </div>
  )
}

function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show,   setShow]   = useState(false)
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: 'rgba(9,13,24,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,255,163,0.3)', borderRadius: '12px',
      padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px',
      color: '#e8eef8', fontFamily: 'var(--mono)', fontSize: '11px',
      whiteSpace: 'nowrap', boxShadow: '0 0 24px rgba(0,255,163,0.15)'
    }}>
      <span>📱 Install AuroraIntel for offline use</span>
      <button onClick={async () => {
        if (!prompt) return
        prompt.prompt()
        await prompt.userChoice
        setShow(false)
      }} style={{
        background: 'rgba(0,255,163,0.15)', border: '1px solid rgba(0,255,163,0.4)',
        color: '#00ffa3', borderRadius: '8px', padding: '6px 14px',
        cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 700
      }}>INSTALL</button>
      <button onClick={() => setShow(false)} style={{
        background: 'none', border: 'none', color: '#3d4f6e', cursor: 'pointer', fontSize: '14px'
      }}>✕</button>
    </div>
  )
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Dashboard />
      <InstallPrompt />
    </>
  )
}
