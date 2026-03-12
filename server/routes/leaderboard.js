// ============================================================
// routes/leaderboard.js — Leaderboard and user stats routes
// ============================================================

const express = require('express');
const {
  getTopPlayers,
  findUserByUsername,
} = require('../db');

const router = express.Router();

router.get('/', (_req, res) => {
  const leaderboard = getTopPlayers(5);
  res.json({ leaderboard });
});

router.get('/user/:username', (req, res) => {
  const user = findUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ username: user.username, wins: user.wins });
});

module.exports = { router };
