import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GameSettings, MemeSubmission, Player, Room, Vote } from './src/types';

const app = express();

// Enable CORS for all origins (Capacitor webviews, mobile apps, cross-domain connections)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ limit: '5gb', extended: true }));

// Database persistence file path (.data directory is ignored by Vite watcher to prevent reloads)
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'rooms_db.json');
const LEGACY_DB_FILE = path.join(process.cwd(), 'data', 'rooms_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

// In-memory room database with disk persistence
let rooms: Record<string, Room> = {};

// Load database from disk on startup
function loadDatabase() {
  try {
    let fileToRead = DB_FILE;
    if (!fs.existsSync(DB_FILE) && fs.existsSync(LEGACY_DB_FILE)) {
      fileToRead = LEGACY_DB_FILE;
    }
    if (fs.existsSync(fileToRead)) {
      const raw = fs.readFileSync(fileToRead, 'utf-8');
      rooms = JSON.parse(raw);
      console.log(`[DB] Loaded ${Object.keys(rooms).length} rooms from database persistence.`);
    }
  } catch (err) {
    console.error('[DB] Failed to load database file:', err);
    rooms = {};
  }
}

// Save database to disk asynchronously
let saveTimeout: NodeJS.Timeout | null = null;
function saveDatabase() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save database file:', err);
    }
  }, 300);
}

loadDatabase();

// Random vibrant avatar colors for players
const AVATAR_COLORS = [
  '#F43F5E', '#38BDF8', '#818CF8', '#10B981', '#F59E0B', 
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms[code]);
  return code;
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

// Helper to advance state based on elapsed time
function updateRoomTimeouts(room: Room): boolean {
  let modified = false;

  // 1. MEME_CREATION phase timeout
  if (room.state === 'MEME_CREATION' && room.roundStartTime) {
    const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
    const duration = room.settings.roundDuration;
    if (elapsed >= duration) {
      // Time is up! Transition to SHOWCASE_VOTING
      startShowcaseVotingPhase(room);
      modified = true;
    }
  }

  // 2. SHOWCASE_VOTING phase timeout
  if (room.state === 'SHOWCASE_VOTING' && room.showcaseStartTime) {
    const elapsed = Math.floor((Date.now() - room.showcaseStartTime) / 1000);
    const showcaseDuration = 20; // 20 seconds per showcase meme
    if (elapsed >= showcaseDuration) {
      advanceShowcase(room);
      modified = true;
    }
  }

  // 3. Mark offline players who haven't sent a heartbeat in 30 seconds
  const now = Date.now();
  Object.values(room.players).forEach(p => {
    if (p.lastSeen && (now - p.lastSeen > 30000) && p.isConnected) {
      p.isConnected = false;
      modified = true;
    }
  });

  if (modified) {
    saveDatabase();
  }

  return modified;
}

// Start Round Creation Phase
function startRoundCreationPhase(room: Room) {
  room.state = 'MEME_CREATION';
  room.roundStartTime = Date.now();
  saveDatabase();
}

// Get ordered submissions list (using randomized submission order)
function getOrderedSubmissions(room: Room): MemeSubmission[] {
  if (room.submissionOrder && room.submissionOrder.length > 0) {
    return room.submissionOrder.map(id => room.submissions[id]).filter(Boolean);
  }
  return Object.values(room.submissions);
}

// Start Showcase Voting Phase
function startShowcaseVotingPhase(room: Room) {
  const submissionKeys = Object.keys(room.submissions);
  if (submissionKeys.length === 0) {
    // No memes submitted, skip to next round or finish game
    if (room.currentRound < room.settings.totalRounds) {
      room.currentRound++;
      startRoundCreationPhase(room);
    } else {
      room.state = 'FINAL_LEADERBOARD';
      saveDatabase();
    }
    return;
  }

  // Randomize the order of submissions for the voting phase
  for (let i = submissionKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [submissionKeys[i], submissionKeys[j]] = [submissionKeys[j], submissionKeys[i]];
  }
  room.submissionOrder = submissionKeys;

  // Re-key room.submissions so iteration order matches the randomized submissionOrder
  const randomizedSubmissions: Record<string, MemeSubmission> = {};
  submissionKeys.forEach(key => {
    randomizedSubmissions[key] = room.submissions[key];
  });
  room.submissions = randomizedSubmissions;

  room.state = 'SHOWCASE_VOTING';
  room.currentShowcaseIndex = 0;
  room.showcaseStartTime = Date.now();
  saveDatabase();
}

// Advance showcase index to next meme
function advanceShowcase(room: Room) {
  room.currentShowcaseIndex++;
  const submissionList = getOrderedSubmissions(room);

  if (room.currentShowcaseIndex >= submissionList.length) {
    calculateRoundResults(room);
  } else {
    room.showcaseStartTime = Date.now();
    saveDatabase();
  }
}

// Check if all eligible non-authors have voted for current showcased meme
function checkAutoAdvanceShowcase(room: Room) {
  const submissions = getOrderedSubmissions(room);
  const currentSub = submissions[room.currentShowcaseIndex];
  if (!currentSub) return;

  const currentRoundVotes = room.votes[room.currentRound] || {};
  
  // Count how many non-author connected players exist
  const connectedPlayers = Object.values(room.players).filter(p => p.isConnected);
  const eligibleVoters = connectedPlayers.filter(p => p.id !== currentSub.authorId);

  // Votes cast for current submission
  const subVotes = Object.values(currentRoundVotes).filter(v => v.submissionId === currentSub.id);

  if (eligibleVoters.length > 0 && subVotes.length >= eligibleVoters.length) {
    advanceShowcase(room);
  }
}

// Calculate scores at end of voting phase
function calculateRoundResults(room: Room) {
  const currentRound = room.currentRound;
  const currentVotes = room.votes[currentRound] || {};

  const roundPointsEarned: Record<string, number> = {};
  Object.keys(room.players).forEach(pId => {
    roundPointsEarned[pId] = 0;
  });

  Object.values(currentVotes).forEach(vote => {
    const sub = room.submissions[vote.submissionId];
    if (sub) {
      roundPointsEarned[sub.authorId] = (roundPointsEarned[sub.authorId] || 0) + vote.points;
    }
  });

  Object.entries(roundPointsEarned).forEach(([pId, pts]) => {
    if (room.players[pId]) {
      room.players[pId].score += pts;
    }
  });

  if (!room.roundScores) room.roundScores = {};
  room.roundScores[currentRound] = roundPointsEarned;

  room.state = 'ROUND_RESULTS';
  saveDatabase();
}

// Global background ticker (runs every second to progress room state)
setInterval(() => {
  Object.values(rooms).forEach(room => {
    updateRoomTimeouts(room);
  });
}, 1000);

// --- REST API ENDPOINTS ---

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRoomsCount: Object.keys(rooms).length,
    database: 'json_file_store'
  });
});

// 1. Create Room
app.post('/api/rooms/create', (req, res) => {
  try {
    const { hostName, settings } = req.body || {};
    const roomCode = generateRoomCode();
    const playerId = generatePlayerId();

    const hostPlayer: Player = {
      id: playerId,
      name: hostName || 'Host',
      avatarColor: getRandomColor(),
      isHost: true,
      score: 0,
      isConnected: true,
      lastSeen: Date.now()
    };

    const newRoom: Room = {
      code: roomCode,
      hostId: playerId,
      settings: settings || { totalRounds: 3, roundDuration: 45, customTemplates: [] },
      state: 'LOBBY',
      currentRound: 1,
      players: { [playerId]: hostPlayer },
      submissions: {},
      votes: {},
      roundStartTime: null,
      currentShowcaseIndex: 0,
      showcaseStartTime: null,
      roundScores: {}
    };

    rooms[roomCode] = newRoom;
    saveDatabase();

    res.json({
      success: true,
      roomCode,
      playerId,
      isHost: true,
      room: newRoom
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Join Room
app.post('/api/rooms/join', (req, res) => {
  try {
    const { roomCode, playerName } = req.body || {};
    const code = (roomCode || '').trim();
    const room = rooms[code];

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found. Check code & try again.' });
    }

    // Check if player name exists to handle reconnection
    const existingPlayer = Object.values(room.players).find(
      p => p.name.toLowerCase() === (playerName || '').toLowerCase()
    );

    let playerId: string;
    let isHost = false;

    if (existingPlayer) {
      playerId = existingPlayer.id;
      existingPlayer.isConnected = true;
      existingPlayer.lastSeen = Date.now();
      isHost = existingPlayer.isHost;
    } else {
      if (room.state !== 'LOBBY') {
        return res.status(400).json({ success: false, message: 'Game is currently in progress. Please wait for next game.' });
      }

      playerId = generatePlayerId();
      const newPlayer: Player = {
        id: playerId,
        name: playerName || `Player ${Object.keys(room.players).length + 1}`,
        avatarColor: getRandomColor(),
        isHost: false,
        score: 0,
        isConnected: true,
        lastSeen: Date.now()
      };

      room.players[playerId] = newPlayer;
    }

    saveDatabase();

    res.json({
      success: true,
      roomCode: code,
      playerId,
      isHost,
      room
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Poll Room State
app.get('/api/rooms/:code/poll', (req, res) => {
  try {
    const { code } = req.params;
    const playerId = req.query.playerId as string;
    const room = rooms[code];

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Update heartbeats
    if (playerId && room.players[playerId]) {
      room.players[playerId].isConnected = true;
      room.players[playerId].lastSeen = Date.now();
    }

    // Advance state if timeouts met
    updateRoomTimeouts(room);

    // Calculate time left
    let timeLeft = 0;
    if (room.state === 'MEME_CREATION' && room.roundStartTime) {
      const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
      timeLeft = Math.max(0, room.settings.roundDuration - elapsed);
    }

    let showcaseTimeLeft = 0;
    if (room.state === 'SHOWCASE_VOTING' && room.showcaseStartTime) {
      const elapsed = Math.floor((Date.now() - room.showcaseStartTime) / 1000);
      showcaseTimeLeft = Math.max(0, 20 - elapsed);
    }

    res.json({
      success: true,
      room,
      timeLeft,
      showcaseTimeLeft
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Update Game Settings
app.post('/api/rooms/:code/settings', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId, settings } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.hostId !== playerId) return res.status(403).json({ success: false, message: 'Only host can update settings' });

    room.settings = settings;
    saveDatabase();

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Start Game
app.post('/api/rooms/:code/start', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.hostId !== playerId) return res.status(403).json({ success: false, message: 'Only host can start game' });

    room.currentRound = 1;
    room.submissions = {};
    room.votes = {};
    room.roundScores = {};

    startRoundCreationPhase(room);

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Submit Meme Canvas
app.post('/api/rooms/:code/submit-meme', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId, templateId, templateName, imageDataUrl } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.state !== 'MEME_CREATION') return res.status(400).json({ success: false, message: 'Not in creation state' });

    const player = room.players[playerId];
    if (!player) return res.status(404).json({ success: false, message: 'Player not in room' });

    const submissionId = `${room.currentRound}_${playerId}`;
    const submission: MemeSubmission = {
      id: submissionId,
      authorId: playerId,
      authorName: player.name,
      authorColor: player.avatarColor,
      templateId,
      templateName,
      imageDataUrl,
      createdAt: Date.now()
    };

    room.submissions[submissionId] = submission;

    // Check if all active players submitted
    const activePlayers = Object.values(room.players).filter(p => p.isConnected);
    if (Object.keys(room.submissions).length >= activePlayers.length) {
      startShowcaseVotingPhase(room);
    } else {
      saveDatabase();
    }

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Cast Vote (Strict Self-Voting Prohibition)
app.post('/api/rooms/:code/vote', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId, submissionId, points } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.state !== 'SHOWCASE_VOTING') return res.status(400).json({ success: false, message: 'Not in voting state' });

    const sub = room.submissions[submissionId];
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    if (sub.authorId === playerId) {
      return res.status(400).json({ success: false, message: 'YOU CANNOT VOTE ON YOUR OWN MEME!' });
    }

    if (!room.votes[room.currentRound]) {
      room.votes[room.currentRound] = {};
    }

    const voteKey = `${submissionId}:${playerId}`;
    const vote: Vote = {
      voterId: playerId,
      submissionId,
      points
    };

    room.votes[room.currentRound][voteKey] = vote;

    checkAutoAdvanceShowcase(room);
    saveDatabase();

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Next Round
app.post('/api/rooms/:code/next-round', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.hostId !== playerId) return res.status(403).json({ success: false, message: 'Only host can start next round' });

    if (room.currentRound < room.settings.totalRounds) {
      room.currentRound++;
      room.submissions = {};
      startRoundCreationPhase(room);
    } else {
      room.state = 'FINAL_LEADERBOARD';
      saveDatabase();
    }

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Restart Game
app.post('/api/rooms/:code/restart', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = rooms[code];

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    room.state = 'LOBBY';
    room.currentRound = 1;
    room.submissions = {};
    room.votes = {};
    room.roundScores = {};
    Object.values(room.players).forEach(p => p.score = 0);

    saveDatabase();

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Leave Room
app.post('/api/rooms/:code/leave', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = rooms[code];

    if (room && room.players[playerId]) {
      room.players[playerId].isConnected = false;
      
      if (room.hostId === playerId) {
        const nextHost = Object.values(room.players).find(p => p.isConnected);
        if (nextHost) {
          room.hostId = nextHost.id;
          nextHost.isHost = true;
        }
      }
      saveDatabase();
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Error handling middleware for oversized payloads
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      message: 'Uploaded images are too large. Please select smaller images or fewer images at once.'
    });
  }
  next(err);
});

// Serve frontend assets in production or Vite middleware in development
async function startApp() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/.data/**', '**/data/**', '**/rooms_db.json', '**/*.json'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Meme Battle Database-Polling REST API server listening on http://0.0.0.0:${PORT}`);
  });
}

startApp();

