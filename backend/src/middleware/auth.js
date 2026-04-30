const jwt = require('jsonwebtoken')
const { loadSharedConfig } = require('../../../config/shared-config')

const { jwtSecret: JWT_SECRET } = loadSharedConfig()

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
