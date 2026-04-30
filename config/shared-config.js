const fs = require('node:fs')
const path = require('node:path')

const CONFIG_FILE = path.resolve(__dirname, '..', '.config')

let cachedConfig = null

function stripWrappingQuotes(value) {
  if (!value) return value
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function parseConfigFile(content) {
  const parsed = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim())
    if (key) parsed[key] = value
  }

  return parsed
}

function asNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function withNoTrailingSlash(value) {
  return value.replace(/\/$/, '')
}

function withWsProtocol(value) {
  return withNoTrailingSlash(value).replace(/^http/i, 'ws')
}

function loadSharedConfig() {
  if (cachedConfig) return cachedConfig

  const fileValues = fs.existsSync(CONFIG_FILE)
    ? parseConfigFile(fs.readFileSync(CONFIG_FILE, 'utf8'))
    : {}

  const source = { ...fileValues, ...process.env }
  const appHost = source.APP_HOST || '127.0.0.1'
  const apiPrefix = source.API_PREFIX || '/api'
  const backendPort = asNumber(source.BACKEND_PORT || source.PORT, 3000)
  const backendBaseUrl = withNoTrailingSlash(
    source.BACKEND_PUBLIC_BASE || `http://${appHost}:${backendPort}`
  )
  const backendWsUrl = withWsProtocol(source.BACKEND_WS_URL || backendBaseUrl)
  const frontendApiBase = withNoTrailingSlash(source.FRONTEND_API_BASE || backendBaseUrl)
  const frontendWsUrl = withWsProtocol(source.FRONTEND_WS_URL || frontendApiBase)

  cachedConfig = {
    appHost,
    apiPrefix,
    backendHost: source.BACKEND_HOST || appHost,
    backendPort,
    backendBaseUrl,
    backendWsUrl,
    frontendDevHost: source.FRONTEND_DEV_HOST || appHost,
    frontendDevPort: asNumber(source.FRONTEND_DEV_PORT, 5173),
    frontendPreviewPort: asNumber(source.FRONTEND_PREVIEW_PORT, 4173),
    frontendProxyTarget: withNoTrailingSlash(source.FRONTEND_PROXY_TARGET || backendBaseUrl),
    frontendApiBase,
    frontendWsUrl,
    mongoUri: source.MONGO_URI || source.MONGODB_URI || 'mongodb://localhost:27017/ciren',
    mqttHost: source.MQTT_HOST || 'localhost',
    mqttPort: asNumber(source.MQTT_PORT, 1883),
    mqttClientId: source.MQTT_CLIENT_ID || 'ciren-backend',
    jwtSecret: source.JWT_SECRET || 'ciren-secret-key',
    jwtExpires: source.JWT_EXPIRES || '7d',
  }

  process.env.APP_HOST = cachedConfig.appHost
  process.env.API_PREFIX = cachedConfig.apiPrefix
  process.env.BACKEND_PORT = String(cachedConfig.backendPort)
  process.env.PORT = String(cachedConfig.backendPort)
  process.env.BACKEND_PUBLIC_BASE = cachedConfig.backendBaseUrl
  process.env.BACKEND_WS_URL = cachedConfig.backendWsUrl
  process.env.FRONTEND_DEV_HOST = cachedConfig.frontendDevHost
  process.env.FRONTEND_DEV_PORT = String(cachedConfig.frontendDevPort)
  process.env.FRONTEND_PREVIEW_PORT = String(cachedConfig.frontendPreviewPort)
  process.env.FRONTEND_PROXY_TARGET = cachedConfig.frontendProxyTarget
  process.env.FRONTEND_API_BASE = cachedConfig.frontendApiBase
  process.env.FRONTEND_WS_URL = cachedConfig.frontendWsUrl
  process.env.VITE_API_BASE = cachedConfig.frontendApiBase
  process.env.VITE_WS_URL = cachedConfig.frontendWsUrl
  process.env.VITE_API_PREFIX = cachedConfig.apiPrefix
  process.env.MONGO_URI = cachedConfig.mongoUri
  process.env.MONGODB_URI = cachedConfig.mongoUri
  process.env.MQTT_HOST = cachedConfig.mqttHost
  process.env.MQTT_PORT = String(cachedConfig.mqttPort)
  process.env.MQTT_CLIENT_ID = cachedConfig.mqttClientId
  process.env.JWT_SECRET = cachedConfig.jwtSecret
  process.env.JWT_EXPIRES = cachedConfig.jwtExpires

  return cachedConfig
}

module.exports = { CONFIG_FILE, loadSharedConfig }