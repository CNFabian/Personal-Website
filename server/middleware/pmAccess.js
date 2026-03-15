// ============================================================
// middleware/pmAccess.js — PM Dashboard access control
// ============================================================
// Two-layer protection:
//   1. IP allowlist (PM_ALLOWED_IPS env var, comma-separated)
//   2. PM JWT token in Authorization header (except login route)
//
// Always returns 404 on failure — do not reveal the route exists.
// ============================================================

const jwt = require('jsonwebtoken');

const PM_JWT_SECRET = process.env.PM_JWT_SECRET || 'pm_default_secret';
const PM_JWT_EXPIRY = '12h';

// ---- JWT helpers ----

function generatePmToken() {
  return jwt.sign({ pm: true }, PM_JWT_SECRET, { expiresIn: PM_JWT_EXPIRY });
}

function verifyPmToken(token) {
  try {
    return jwt.verify(token, PM_JWT_SECRET);
  } catch {
    return null;
  }
}

// ---- Middleware ----

function pmAccess(req, res, next) {
  // Layer 1: IP check
  const forwarded = req.headers['x-forwarded-for'];
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : req.ip;

  const allowedIPs = process.env.PM_ALLOWED_IPS
    ? process.env.PM_ALLOWED_IPS.split(',').map(ip => ip.trim())
    : [];

  // Always allow localhost (dev), plus any configured IPs
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';
  const ipAllowed = isLocalhost || allowedIPs.includes(clientIP);

  if (!ipAllowed) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Layer 2: PM token check — skip for the login route itself
  if (req.path === '/auth/login') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(404).json({ error: 'Not found' });
  }

  const decoded = verifyPmToken(authHeader.slice(7));
  if (!decoded) {
    return res.status(404).json({ error: 'Not found' });
  }

  next();
}

module.exports = { pmAccess, generatePmToken, verifyPmToken };
