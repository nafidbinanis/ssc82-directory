const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ssc82-dev-secret-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next(); // allow anonymous read-only access; routes decide what's required
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin privileges required' });
  next();
}

module.exports = { authenticate, requireAuth, requireAdmin, JWT_SECRET };
