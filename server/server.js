// ============================================================
// server.js — Socket.io multiplayer server for Egyptian Rat Screw
// ============================================================

const http = require('http');
const { Server } = require('socket.io');
const { RatScrew, DEFAULT_RULES } = require('./gameLogic');

const PORT = process.env.PORT || 3001;

// ---- HTTP + Socket.io setup ----

const httpServer = http.createServer((req, res) => {
  // Basic health-check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Egyptian Rat Screw multiplayer server');
});

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
//   players: Map<socketId, playerNumber>,
//   game: RatScrew | null,
//   rules: GameRules,
//   disconnectTimers: Map<socketId, timeoutId>
// }>

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
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
  io.to(roomCode).emit('gameStateUpdate', room.game.serialize());
}

// ============================================================
// Socket event handlers
// ============================================================

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ---- Create Room ----
  socket.on('createRoom', (data) => {
    // If player is already in a room, leave it
    const existing = getRoomForSocket(socket.id);
    if (existing) {
      socket.leave(existing.code);
      existing.room.players.delete(socket.id);
      if (existing.room.players.size === 0) rooms.delete(existing.code);
    }

    const roomCode = generateRoomCode();
    const rules = data?.rules || DEFAULT_RULES;

    rooms.set(roomCode, {
      players: new Map([[socket.id, 1]]),
      game: null,
      rules: { ...rules },
      disconnectTimers: new Map(),
    });

    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, playerNumber: 1 });
    socket.emit('waitingForOpponent', { message: `Room ${roomCode} created. Waiting for opponent...` });

    console.log(`[createRoom] ${socket.id} created room ${roomCode}`);
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

    // If player is already in another room, leave it
    const existing = getRoomForSocket(socket.id);
    if (existing) {
      socket.leave(existing.code);
      existing.room.players.delete(socket.id);
      if (existing.room.players.size === 0) rooms.delete(existing.code);
    }

    room.players.set(socket.id, 2);
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode, playerNumber: 2 });

    console.log(`[joinRoom] ${socket.id} joined room ${roomCode}`);

    // Both players present — start the game
    room.game = new RatScrew(room.rules);

    io.to(roomCode).emit('gameStart', {
      gameState: room.game.serialize(),
      rules: room.rules,
    });

    console.log(`[gameStart] Room ${roomCode}`);
  });

  // ---- Play Card ----
  socket.on('playCard', (data) => {
    const roomCode = data?.roomCode;
    const player = data?.player;
    const room = rooms.get(roomCode);

    if (!room || !room.game) return;
    if (!room.players.has(socket.id)) return;
    if (room.players.get(socket.id) !== player) return; // prevent spoofing

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
    if (room.players.get(socket.id) !== player) return;

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

    io.to(roomCode).emit('gameStart', {
      gameState: room.game.serialize(),
      rules: room.rules,
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

    // Notify remaining player
    io.to(roomCode).emit('opponentDisconnected', {
      message: `Player ${disconnectedPlayer} disconnected.`,
    });

    // Clean up room after 60 seconds if nobody rejoins
    const timer = setTimeout(() => {
      const currentRoom = rooms.get(roomCode);
      if (currentRoom && currentRoom.players.size < 2) {
        // Notify remaining player (if any)
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
