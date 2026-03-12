// ============================================================
// routes/auth.js — Authentication routes
// ============================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
} = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ratscrew_default_secret';
const JWT_EXPIRY = '30d';

// ---- JWT helpers ----

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express middleware to verify auth token
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
  req.userId = decoded.userId;
  req.username = decoded.username;
  next();
}

// ---- Routes ----

router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = createUser(username, password || null);
    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username, wins: user.wins } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }

    const user = findUserByUsername(username.trim());
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // If the account has a password, verify it
    if (user.password_hash) {
      if (!password) {
        return res.status(401).json({ success: false, error: 'Password required for this account.' });
      }
      if (!verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ success: false, error: 'Incorrect password.' });
      }
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, wins: user.wins },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  res.json({
    success: true,
    user: { id: user.id, username: user.username, wins: user.wins },
  });
});

module.exports = {
  router,
  authMiddleware,
  generateToken,
  verifyToken,
};
