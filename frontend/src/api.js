import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  }
})

// Events
export const getEvents = async () => {
  const { data } = await api.get('/events')
  return data
}

export const getEvent = async (eventId) => {
  const { data } = await api.get(`/events/${eventId}`)
  return data
}

export const updateEventConfig = async (eventId, configData) => {
  const { data } = await api.put(`/events/${eventId}/config`, configData)
  return data
}

export const createEvent = async (eventData) => {
  const { data } = await api.post('/events', eventData)
  return data
}

export const runWorkflow = async (eventId, force = false) => {
  const { data } = await api.post(`/events/${eventId}/workflow/run`, { force })
  return data
}

export const getWorkflowProgress = async (eventId) => {
  const { data } = await api.get(`/events/${eventId}/progress`)
  return data
}

export const attachVideo = async (eventId, videoPath) => {
  const { data } = await api.post(`/events/${eventId}/attach`, { video_path: videoPath })
  return data
}

// Dependencies
export const checkDependencies = async () => {
  const { data } = await api.get('/dependencies')
  return data
}

export const installDependency = async (depKey) => {
  const { data } = await api.post(`/dependencies/${depKey}/install`)
  return data
}

export const configureCustomPath = async (depKey, path) => {
  const { data } = await api.post(`/dependencies/${depKey}/configure-path`, { path })
  return data
}

// System
export const getSystemStatus = async () => {
  const { data } = await api.get('/status')
  return data
}

// Models
export const getWhisperModels = async () => {
  const { data } = await api.get('/models/whisper')
  return data
}

export const getOllamaModels = async () => {
  const { data } = await api.get('/models/ollama')
  return data
}

export const getOllamaImageModels = async () => {
  const { data } = await api.get('/models/ollama-image')
  return data
}

// Fonts & Assets
export const getSystemFonts = async () => {
  const { data } = await api.get('/fonts/system')
  return data
}

export const getAssets = async (assetType) => {
  const { data } = await api.get(`/assets/${assetType}`)
  return data
}

// Modules
export const getEventModules = async (eventId) => {
  const { data } = await api.get(`/events/${eventId}/modules`)
  return data
}

export const getModuleInputs = async (eventId, moduleName) => {
  const { data } = await api.get(`/events/${eventId}/modules/${moduleName}/inputs`)
  return data
}

export const runSingleModule = async (eventId, moduleName, inputFiles = null, force = false) => {
  const { data } = await api.post(`/events/${eventId}/modules/${moduleName}/run`, {
    input_files: inputFiles,
    force
  })
  return data
}

export default api
