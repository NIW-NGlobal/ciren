const { WebSocketServer } = require('ws')
const jwt = require('jsonwebtoken')
const { loadSharedConfig } = require('../../../config/shared-config')

const config = loadSharedConfig()
const JWT_SECRET   = config.jwtSecret
const PING_INTERVAL = 30000  // ping tiap 30s untuk deteksi dead connections

let wss = null

function initWS(serverOrPort) {
  const opts = typeof serverOrPort === 'number'
    ? { port: serverOrPort }
    : { server: serverOrPort }
  wss = new WebSocketServer(opts)

  // Ping semua client secara berkala — tandai yang tidak balas sebagai dead
  const pingTimer = setInterval(() => {
    if (!wss) return
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.terminate(); return }
      ws.isAlive = false
      ws.ping()
    })
  }, PING_INTERVAL)

  wss.on('close', () => clearInterval(pingTimer))

  wss.on('connection', (ws, req) => {
    // ── Auth: ambil token dari query string ?token=xxx ──
    const url    = new URL(req.url, config.backendWsUrl)
    const token  = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, 'No token')
      return
    }
    try {
      ws.user = jwt.verify(token, JWT_SECRET)
    } catch {
      ws.close(4001, 'Invalid token')
      return
    }

    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })
    ws.on('close', () => console.log(`[WS] Client disconnected: ${ws.user?.username}`))
    console.log(`[WS] Client connected: ${ws.user?.username}`)
  })

  const wsUrl = typeof serverOrPort === 'number'
    ? `${config.backendWsUrl.replace(/:\d+$/, '')}:${serverOrPort}`
    : config.backendWsUrl
  console.log(`[WS] Server running on ${wsUrl}`)
  return wss
}

// Broadcast ke semua authenticated client
function broadcast(type, payload) {
  if (!wss) return
  const msg = JSON.stringify({ type, payload, ts: Date.now() })
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.user) {
      try { client.send(msg) } catch { /* client disconnected */ }
    }
  })
}

module.exports = { initWS, broadcast }
