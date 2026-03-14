// ============================================================
// routes/user.js — User profile and avatar routes
// ============================================================

const express = require('express');
const {
  getFullProfile,
  getPublicProfile,
  updateAvatar,
} = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

/**
 * GET /api/user/profile (auth required)
 * Returns the authenticated user's full profile including avatar_data, chip_balance, wins, etc.
 */
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const profile = getFullProfile(req.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }
    // Parse avatar_data if it exists
    if (profile.avatar_data) {
      try {
        profile.avatar_data = JSON.parse(profile.avatar_data);
      } catch {
        profile.avatar_data = null;
      }
    }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/user/avatar (auth required)
 * Saves avatar JSON data for the user. Validates that the body contains `avatarData`
 * (object with body, hair, face, clothing, accessories, colors).
 * Stores as JSON string in the `avatar_data` column.
 */
router.put('/avatar', authMiddleware, (req, res) => {
  try {
    const { avatarData } = req.body;

    // Validate avatarData is provided and is an object
    if (!avatarData || typeof avatarData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'avatarData is required and must be an object.',
      });
    }

    // Validate required fields within avatarData
    const requiredFields = ['body', 'skinColor', 'hair', 'hairColor', 'eyes', 'top', 'topColor', 'bottom', 'bottomColor', 'hat', 'hatColor'];
    const missingFields = requiredFields.filter(field => !(field in avatarData));
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `avatarData is missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Convert avatarData to JSON string and store
    const avatarDataString = JSON.stringify(avatarData);
    updateAvatar(req.userId, avatarDataString);

    // Return the updated profile with parsed avatar_data
    const profile = getFullProfile(req.userId);
    if (profile && profile.avatar_data) {
      try {
        profile.avatar_data = JSON.parse(profile.avatar_data);
      } catch {
        profile.avatar_data = null;
      }
    }

    res.json({ success: true, message: 'Avatar updated successfully.', profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/:id (public)
 * Returns a public profile for any user by ID (username, avatar_data, wins, chip_balance).
 * Does NOT return password_hash or sensitive data.
 */
router.get('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const profile = getPublicProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Parse avatar_data if it exists
    if (profile.avatar_data) {
      try {
        profile.avatar_data = JSON.parse(profile.avatar_data);
      } catch {
        profile.avatar_data = null;
      }
    }

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
