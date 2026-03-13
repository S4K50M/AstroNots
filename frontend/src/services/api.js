import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 12000 })

export const getStatus   = ()              => api.get('/space-weather/status').then(r => r.data)
export const getMag      = ()              => api.get('/space-weather/mag').then(r => r.data)
export const getPlasma   = ()              => api.get('/space-weather/plasma').then(r => r.data)
export const getOvation  = ()              => api.get('/space-weather/ovation').then(r => r.data)
export const getKp       = ()              => api.get('/space-weather/kp').then(r => r.data)
export const getAlerts   = ()              => api.get('/space-weather/noaa-alerts').then(r => r.data)
export const getVisibility = (lat, lon)    => api.get('/visibility', { params: { lat, lon } }).then(r => r.data)
export const getRouting    = (lat, lon)    => api.get('/routing', { params: { lat, lon } }).then(r => r.data)
export const saveLocation  = (body)        => api.post('/locations', body).then(r => r.data)
export const getLocations  = ()            => api.get('/locations').then(r => r.data)
export const deleteLocation = (id)         => api.delete(`/locations/${id}`).then(r => r.data)
