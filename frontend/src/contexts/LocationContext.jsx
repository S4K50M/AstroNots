import { createContext, useContext, useState, useEffect } from 'react'

const LocationContext = createContext(undefined)

const DEFAULT_LAT = 69.65 // Tromsø, Norway
const DEFAULT_LON = 18.96

export function LocationProvider({ children }) {
  const [latitude, setLatitude] = useState(DEFAULT_LAT)
  const [longitude, setLongitude] = useState(DEFAULT_LON)

  // Load from localStorage on mount (same keys as Next.js app)
  useEffect(() => {
    const savedLat = localStorage.getItem('global_latitude')
    const savedLon = localStorage.getItem('global_longitude')
    
    if (savedLat && savedLon) {
      const lat = parseFloat(savedLat)
      const lon = parseFloat(savedLon)
      if (!isNaN(lat) && !isNaN(lon)) {
        setLatitude(lat)
        setLongitude(lon)
      }
    }
  }, [])

  // Listen for storage changes (when Next.js app updates location)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'global_latitude') {
        const lat = parseFloat(e.newValue)
        if (!isNaN(lat)) setLatitude(lat)
      } else if (e.key === 'global_longitude') {
        const lon = parseFloat(e.newValue)
        if (!isNaN(lon)) setLongitude(lon)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Sync with localStorage whenever location changes
  useEffect(() => {
    localStorage.setItem('global_latitude', latitude.toString())
    localStorage.setItem('global_longitude', longitude.toString())
  }, [latitude, longitude])

  const setLocation = (lat, lon) => {
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLatitude(lat)
      setLongitude(lon)
    }
  }

  return (
    <LocationContext.Provider value={{ latitude, longitude, setLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
