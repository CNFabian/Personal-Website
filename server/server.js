// ============================================================
// server.js — Socket.io + Express server for Egyptian Rat Screw
// ============================================================

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { RatScrew, DEFAULT_RULES } = require('./gameLogic');
const {
  initDatabase,
  createUser,
  findUserByUsername,
  findUserById,
  verifyPassword,
  incrementWins,
  getTopPlayers,
  getUserStats,
} = require('./db');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ratscrew_default_secret';
const JWT_EXPIRY = '30d';

// ---- Initialize database ----
initDatabase();

// ---- Express app ----
const app = express();

app.use(cors({
  origin: [
    'https://cnfabian.com',
    'https://www.cnfabian.com',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
}));

app.use(express.json());

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

/** Express middleware to verify auth token */
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

// ============================================================
// REST API Routes
// ============================================================

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// ---- Auth ----

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = createUser(username, password || null);
    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, username: user.username, wins: user.wins } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
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

// Verify token & return user data (for auto-login)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  res.json({
    success: true,
    user: { id: user.id, username: user.username, wins: user.wins },
  });
});

// ---- Leaderboard ----

app.get('/api/leaderboard', (_req, res) => {
  const leaderboard = getTopPlayers(5);
  res.json({ leaderboard });
});

// ---- User stats ----

app.get('/api/user/:username', (req, res) => {
  const user = findUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ username: user.username, wins: user.wins });
});

// ============================================================
// HTTP + Socket.io setup
// ============================================================

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://cnfabian.com',
      'https://www.cnfabian.com',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
  },
});

// ============================================================
// Room management
// ============================================================

const rooms = new Map();
// rooms : Map<roomCode, {
//   players: Map<socketId, { playerNumber, userId?, username? }>,
//   game: RatScrew | null,
//   rules: GameRules | null,
//   disconnectTimers: Map<socketId, timeoutId>,
//   winRecorded: boolean,
//   hostSocketId: string
// }>

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function getRoomForSocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.players.has(socketId)) {
      return { code, room };
    }
  }
  return null;
}

function broadcastGameState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;

  const state = room.game.serialize();
  io.to(roomCode).emit('gameStateUpdate', state);

  // ---- Win recording ----
  if (state.gameState === 'GAME_OVER' && state.winner && !room.winRecorded) {
    room.winRecorded = true;

    // Find the winning player's user data
    for (const [, playerData] of room.players) {
      if (playerData.playerNumber === state.winner && playerData.userId) {
        try {
          const updatedUser = incrementWins(playerData.userId);
          console.log(`[winRecord] ${updatedUser.username} now has ${updatedUser.wins} wins`);

          // Notify both players of the updated win counts
          const winData = {};
          for (const [sid, pd] of room.players) {
            if (pd.userId) {
              const stats = getUserStats(pd.userId);
              winData[pd.playerNumber] = {
                username: pd.username,
                wins: stats ? stats.wins : 0,
              };
            }
          }
          io.to(roomCode).emit('winRecorded', winData);
        } catch (err) {
          console.error('[winRecord] Error recording win:', err.message);
        }
        break;
      }
    }
  }
}

// ============================================================
// Socket event handlers
// ============================================================

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ---- Create Room ----
  socket.on('createRoom', (data) => {
    const existing = getRoomForSocket(socket.id);
    if (existing) {
      socket.leave(existing.code);
      existing.room.players.delete(socket.id);
      if (existing.room.players.size === 0) rooms.delete(existing.code);
    }

    const roomCode = generateRoomCode();

    // Extract auth data if provided
    const playerData = {
      playerNumber: 1,
      userId: data?.userId || null,
      username: data?.username || null,
    };

    // Verify token if provided
    if (data?.token) {
      const decoded = verifyToken(data.token);
      if (decoded) {
        playerData.userId = decoded.userId;
        playerData.username = decoded.username;
      }
    }

    rooms.set(roomCode, {
      players: new Map([[socket.id, playerData]]),
      game: null,
      rules: null, // Rules will be set when host starts the game
      disconnectTimers: new Map(),
      winRecorded: false,
      hostSocketId: socket.id,
    });

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, playerNumber: 1 });
    socket.emit('waitingForOpponent', { message: `Room ${roomCode} created. Waiting for opponent...` });

    console.log(`[createRoom] ${socket.id} created room ${roomCode}` +
      (playerData.username ? ` as ${playerData.username}` : ''));
  });

  // ---- Join Room ----
  socket.on('joinRoom', (data) => {
    const roomCode = (data?.roomCode || '').toUpperCase().trim();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('roomError', { message: 'Room not found. Check the code and try again.' });
      return;
    }

    if (room.players.size >= 2) {
      socket.emit('roomError', { message: 'Room is full.' });
      return;
    }

    const existing = getRoomForSocket(socket.id);
    if (existing) {
      socket.leave(existing.code);
      existing.room.players.delete(socket.id);
      if (existing.room.players.size === 0) rooms.delete(existing.code);
    }

    // Extract auth data
    const playerData = {
      playerNumber: 2,
      userId: data?.userId || null,
      username: data?.username || null,
    };

    if (data?.token) {
      const decoded = verifyToken(data.token);
      if (decoded) {
        playerData.userId = decoded.userId;
        playerData.username = decoded.username;
      }
    }

    room.players.set(socket.id, playerData);
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, playerNumber: 2 });

    // Notify the host that someone joined
    io.to(roomCode).emit('playerJoined', {
      message: `Player 2 joined the room.`,
      playerCount: room.players.size,
    });

    console.log(`[joinRoom] ${socket.id} joined room ${roomCode}` +
      (playerData.username ? ` as ${playerData.username}` : ''));
  });

  // ---- Start Game (host only) ----
  socket.on('startGame', (data) => {
    const roomCode = data?.roomCode;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('roomError', { message: 'Room not found.' });
      return;
    }

    // Only the host can start
    if (room.hostSocketId !== socket.id) {
      socket.emit('roomError', { message: 'Only the host can start the game.' });
      return;
    }

    // Need at least 2 players
    if (room.players.size < 2) {
      socket.emit('roomError', { message: 'Need at least 2 players to start.' });
      return;
    }

    // Validate rules: at least one active
    const rules = data?.rules || DEFAULT_RULES;
    const hasActiveRule = Object.values(rules).some(v => v === true);
    if (!hasActiveRule) {
      socket.emit('roomError', { message: 'Enable at least one rule.' });
      return;
    }

    room.rules = { ...rules };
    room.game = new RatScrew(room.rules);
    room.winRecorded = false;

    // Build player info to send to clients
    const playerInfo = {};
    for (const [, pd] of room.players) {
      if (pd.username) {
        playerInfo[pd.playerNumber] = { username: pd.username };
        if (pd.userId) {
          const stats = getUserStats(pd.userId);
          if (stats) playerInfo[pd.playerNumber].wins = stats.wins;
        }
      }
    }

    io.to(roomCode).emit('gameStart', {
      gameState: room.game.serialize(),
      rules: room.rules,
      playerInfo,
    });

    console.log(`[startGame] Host started game in room ${roomCode}`);
  });

  // ---- Play Card ----
  socket.on('playCard', (data) => {
    const roomCode = data?.roomCode;
    const player = data?.player;
    const room = rooms.get(roomCode);

    if (!room || !room.game) return;
    if (!room.players.has(socket.id)) return;
    if (room.players.get(socket.id).playerNumber !== player) return;

    room.game.playCard(player);
    broadcastGameState(roomCode);
  });

  // ---- Attempt Slap ----
  socket.on('attemptSlap', (data) => {
    const roomCode = data?.roomCode;
    const player = data?.player;
    const room = rooms.get(roomCode);

    if (!room || !room.game) return;
    if (!room.players.has(socket.id)) return;
    if (room.players.get(socket.id).playerNumber !== player) return;

    room.game.attemptSlap(player);
    broadcastGameState(roomCode);
  });

  // ---- Restart Game ----
  socket.on('restartGame', (data) => {
    const roomCode = data?.roomCode;
    const room = rooms.get(roomCode);

    if (!room) return;
    if (!room.players.has(socket.id)) return;
    if (room.players.size < 2) return;

    room.game = new RatScrew(room.rules);
    room.winRecorded = false;

    // Re-build player info
    const playerInfo = {};
    for (const [, pd] of room.players) {
      if (pd.username) {
        playerInfo[pd.playerNumber] = { username: pd.username };
        if (pd.userId) {
          const stats = getUserStats(pd.userId);
          if (stats) playerInfo[pd.playerNumber].wins = stats.wins;
        }
      }
    }

    io.to(roomCode).emit('gameStart', {
      gameState: room.game.serialize(),
      rules: room.rules,
      playerInfo,
    });

    console.log(`[restartGame] Room ${roomCode}`);
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);

    const result = getRoomForSocket(socket.id);
    if (!result) return;

    const { code: roomCode, room } = result;
    const disconnectedPlayer = room.players.get(socket.id);
    room.players.delete(socket.id);

    // If the game is in progress, notify about disconnect
    if (room.game) {
      io.to(roomCode).emit('opponentDisconnected', {
        message: `Player ${disconnectedPlayer.playerNumber} disconnected.`,
      });
    } else {
      // Still in lobby — notify remaining players about updated count
      io.to(roomCode).emit('playerLeft', {
        message: `Player ${disconnectedPlayer.playerNumber} left the room.`,
        playerCount: room.players.size,
      });
    }

    const timer = setTimeout(() => {
      const currentRoom = rooms.get(roomCode);
      if (currentRoom && currentRoom.players.size < 2) {
        io.to(roomCode).emit('roomError', { message: 'Room closed due to inactivity.' });
        rooms.delete(roomCode);
        console.log(`[cleanup] Room ${roomCode} removed`);
      }
    }, 60_000);

    room.disconnectTimers.set(socket.id, timer);
  });
});

// ============================================================
// Start
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`Egyptian Rat Screw server listening on port ${PORT}`);
});
