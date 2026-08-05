import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GameSettings, MemeSubmission, Player, Room, Vote, PhotoLibrary, MemeTemplate, ImageTextPositionsMap } from './src/types';
import { CLASSIC_MEME_TEMPLATES } from './src/data/templates';

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
const LIBRARIES_DIR = path.join(DATA_DIR, 'libraries');
const USERS_FILE = path.join(DATA_DIR, 'users_db.json');
const BUILTIN_JSON_FILE = path.join(DATA_DIR, 'builtin_libraries.json');

// Ensure data & libraries directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}
if (!fs.existsSync(LIBRARIES_DIR)) {
  try {
    fs.mkdirSync(LIBRARIES_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create libraries dir:', err);
  }
}

// User Accounts DB helper functions
interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: 'email' | 'google';
  isDeveloper: boolean;
  createdAt: string;
}

function loadUsers(): Record<string, StoredUser> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading users db:', e);
  }
  return {};
}

function saveUsers(users: Record<string, StoredUser>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving users db:', e);
  }
}

// Built-in Library JSON file helper functions
function getBuiltinTemplates(): MemeTemplate[] {
  try {
    if (fs.existsSync(BUILTIN_JSON_FILE)) {
      const raw = fs.readFileSync(BUILTIN_JSON_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } else {
      // Seed BUILTIN_JSON_FILE if it doesn't exist yet
      fs.writeFileSync(BUILTIN_JSON_FILE, JSON.stringify(CLASSIC_MEME_TEMPLATES, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Error reading builtin_libraries.json:', e);
  }
  return CLASSIC_MEME_TEMPLATES;
}

function saveBuiltinTemplates(templates: MemeTemplate[]) {
  try {
    fs.writeFileSync(BUILTIN_JSON_FILE, JSON.stringify(templates, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving builtin_libraries.json:', e);
  }
}

// GitHub Repo config
const GITHUB_OWNER = 'theevoker';
const GITHUB_REPO = 'meme-battle-libraries';

// Helper to push a file to GitHub repository if token is available
async function pushToGitHubRepo(filePath: string, contentBuffer: Buffer | string, commitMessage: string) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN;
  if (!token) {
    console.warn(`[GitHub API] No GITHUB_TOKEN set in environment. Skipping push for ${filePath}`);
    return false;
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Meme-Battle-App'
      }
    });
    if (getRes.ok) {
      const existingData: any = await getRes.json();
      sha = existingData.sha;
    }

    const contentBase64 = Buffer.isBuffer(contentBuffer)
      ? contentBuffer.toString('base64')
      : Buffer.from(contentBuffer).toString('base64');

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Meme-Battle-App'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        sha
      })
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error(`[GitHub API Error ${putRes.status}] Failed to push ${filePath}:`, errText);
      return false;
    }

    console.log(`[GitHub API Success] Successfully pushed ${filePath} to GitHub.`);
    return true;
  } catch (err) {
    console.warn('[GitHub API Exception] Failed to push to GitHub:', err);
    return false;
  }
}

// Fetch all libraries from disk and GitHub
async function getAllLibraries(): Promise<PhotoLibrary[]> {
  const librariesMap: Record<string, PhotoLibrary> = {};

  // 1. Built-in Classic Memes Library
  librariesMap['classic_memes'] = {
    id: 'classic_memes',
    folderName: 'classic_memes',
    displayName: 'Classic Memes',
    status: 5,
    images: getBuiltinTemplates(),
    isBuiltIn: true
  };

  // 2. Local disk libraries in .data/libraries/
  try {
    if (fs.existsSync(LIBRARIES_DIR)) {
      const folderNames = fs.readdirSync(LIBRARIES_DIR);
      for (const folderName of folderNames) {
        const folderPath = path.join(LIBRARIES_DIR, folderName);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        let status = 0;
        const files = fs.readdirSync(folderPath);
        const txtFile = files.find((f) => f.endsWith('.txt') || f === 'status' || f === '0' || f === '5');
        if (txtFile) {
          const txtContent = fs.readFileSync(path.join(folderPath, txtFile), 'utf-8').trim();
          status = parseInt(txtContent, 10) || 0;
        }

        let positionsMap: ImageTextPositionsMap = {};
        const jsonFile = files.find((f) => f.endsWith('.json'));
        if (jsonFile) {
          try {
            const rawJson = fs.readFileSync(path.join(folderPath, jsonFile), 'utf-8');
            positionsMap = JSON.parse(rawJson);
          } catch (e) {
            console.warn(`Failed reading positions JSON for ${folderName}:`, e);
          }
        }

        const images: MemeTemplate[] = [];
        files.forEach((f, i) => {
          const lower = f.toLowerCase();
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
            const cleanName = f.replace(/\.[^/.]+$/, '');
            images.push({
              id: `${folderName}_img_${i}`,
              name: cleanName,
              url: `/api/libraries/file/${encodeURIComponent(folderName)}/${encodeURIComponent(f)}`,
              isCustom: true,
              textPositions: positionsMap[cleanName] || positionsMap[f]
            });
          }
        });

        const parts = folderName.split(':');
        const displayName = parts[0] || folderName;

        librariesMap[folderName] = {
          id: folderName,
          folderName,
          displayName,
          status,
          images,
          textPositionsMap: positionsMap
        };
      }
    }
  } catch (err) {
    console.error('Error scanning local libraries:', err);
  }

  // 3. Scan GitHub Repo contents if reachable
  try {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN;
    const ghHeaders: Record<string, string> = {
      'User-Agent': 'Meme-Battle-App',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      ghHeaders['Authorization'] = `Bearer ${token}`;
    }

    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`, {
      headers: ghHeaders
    });

    if (ghRes.ok) {
      const items: any[] = await ghRes.json();
      const dirItems = items.filter((item) => item.type === 'dir');

      for (const dirItem of dirItems) {
        const folderName = dirItem.name;

        const dirContentsRes = await fetch(dirItem.url, { headers: ghHeaders });
        if (!dirContentsRes.ok) continue;

        const dirFiles: any[] = await dirContentsRes.json();
        let ghStatus: number | null = null;
        
        const txtItem = dirFiles.find((f) => {
          const lower = f.name.toLowerCase();
          return lower.endsWith('.txt') || lower === 'status' || lower === '0' || lower === '5';
        });

        if (txtItem && txtItem.download_url) {
          const txtRes = await fetch(txtItem.download_url, { headers: ghHeaders });
          if (txtRes.ok) {
            const txtStr = (await txtRes.text()).trim();
            const match = txtStr.match(/\b([0-9]+)\b/);
            ghStatus = match ? parseInt(match[1], 10) : (parseInt(txtStr, 10) || 0);
          }
        }

        let ghPositionsMap: ImageTextPositionsMap = {};
        const jsonItem = dirFiles.find((f) => f.name.toLowerCase().endsWith('.json'));
        if (jsonItem && jsonItem.download_url) {
          const jsonRes = await fetch(jsonItem.download_url, { headers: ghHeaders });
          if (jsonRes.ok) {
            try {
              ghPositionsMap = await jsonRes.json();
            } catch (e) {}
          }
        }

        // Build list of images from GitHub folder
        const ghImages: MemeTemplate[] = [];
        dirFiles.forEach((f, i) => {
          const lower = f.name.toLowerCase();
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
            const cleanName = f.name.replace(/\.[^/.]+$/, '');
            ghImages.push({
              id: `${folderName}_gh_${i}`,
              name: cleanName,
              url: `/api/libraries/file/${encodeURIComponent(folderName)}/${encodeURIComponent(f.name)}`,
              isCustom: true,
              textPositions: ghPositionsMap[cleanName] || ghPositionsMap[f.name]
            });
          }
        });

        const parts = folderName.split(':');
        const displayName = parts[0] || folderName;

        // If library already exists locally, update status and positions from GitHub if approved (status 5)
        if (librariesMap[folderName]) {
          if (ghStatus !== null) {
            librariesMap[folderName].status = ghStatus;
            try {
              const localFolderPath = path.join(LIBRARIES_DIR, folderName);
              if (fs.existsSync(localFolderPath)) {
                fs.writeFileSync(path.join(localFolderPath, 'status.txt'), String(ghStatus), 'utf-8');
              }
            } catch (e) {}
          }
          if (Object.keys(ghPositionsMap).length > 0) {
            librariesMap[folderName].textPositionsMap = {
              ...librariesMap[folderName].textPositionsMap,
              ...ghPositionsMap
            };
          }
          if (ghImages.length > 0 && librariesMap[folderName].images.length === 0) {
            librariesMap[folderName].images = ghImages;
          }
        } else {
          librariesMap[folderName] = {
            id: folderName,
            folderName,
            displayName,
            status: ghStatus !== null ? ghStatus : 0,
            images: ghImages,
            textPositionsMap: ghPositionsMap
          };
        }
      }
    } else {
      console.warn(`[GitHub Sync] GET /contents status: ${ghRes.status}`);
    }
  } catch (err) {
    console.warn('[GitHub Sync] Could not fetch GitHub repo contents:', err);
  }

  return Object.values(librariesMap);
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
  room.phaseStartTime = Date.now();
  room.lastActivity = Date.now();
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
      room.phaseStartTime = Date.now();
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
  room.phaseStartTime = Date.now();
  room.lastActivity = Date.now();
  saveDatabase();
}

// Advance showcase index to next meme
function advanceShowcase(room: Room) {
  room.currentShowcaseIndex++;
  room.lastActivity = Date.now();
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
  room.phaseStartTime = Date.now();
  room.lastActivity = Date.now();
  saveDatabase();
}

// Global background ticker (runs every second to progress room state and auto-close rooms after 5 minutes without input)
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  Object.values(rooms).forEach(room => {
    const lastActive = room.lastActivity || room.phaseStartTime || room.roundStartTime || 0;
    if (lastActive > 0 && (now - lastActive >= FIVE_MINUTES_MS)) {
      console.log(`[Room Timeout] Closing room ${room.code} due to 5 minutes of inactivity (no input).`);
      delete rooms[room.code];
      saveDatabase();
      return;
    }

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

// --- ACCOUNTS & AUTH API ENDPOINTS (Stored in server database) ---

// POST /api/auth/register - Register a new user account
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name || cleanEmail.split('@')[0]).trim();
    const users = loadUsers();
    const isDeveloper = cleanEmail === 'itai.vacht@gmail.com';

    let user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (user) {
      user.name = displayName || user.name;
      user.isDeveloper = isDeveloper;
      users[user.id] = user;
      saveUsers(users);
      return res.json({ success: true, user, message: 'Logged into existing account' });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = {
      id: userId,
      email: cleanEmail,
      name: displayName,
      passwordHash: password || '',
      provider: 'email',
      isDeveloper,
      createdAt: new Date().toISOString()
    };

    users[userId] = user;
    saveUsers(users);

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login - Login with Email & Password
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const isDeveloper = cleanEmail === 'itai.vacht@gmail.com';

    let user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Auto-register for seamless onboarding
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: userId,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        passwordHash: password || '',
        provider: 'email',
        isDeveloper,
        createdAt: new Date().toISOString()
      };
      users[userId] = user;
      saveUsers(users);
    } else {
      user.isDeveloper = isDeveloper;
      users[user.id] = user;
      saveUsers(users);
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/google/url - Constructs Google OAuth 2.0 Authorization URL
app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    return res.json({
      success: false,
      configured: false,
      message: 'GOOGLE_CLIENT_ID environment variable is not set.'
    });
  }

  const redirectUri = (req.query.redirect_uri as string) || `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    access_type: 'offline'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ success: true, configured: true, url });
});

// GET /auth/google/callback & /auth/google/callback/ - OAuth Callback Handler
const handleGoogleCallback = async (req: express.Request, res: express.Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.send(`
      <html>
        <body style="background:#0f172a;color:#ef4444;font-family:sans-serif;padding:2rem;">
          <h2>Google OAuth Error</h2>
          <p>${error || 'No authorization code provided'}</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');
    }

    // Fetch Google User Profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      throw new Error('Failed to fetch Google profile information');
    }

    const cleanEmail = profile.email.trim().toLowerCase();
    const displayName = profile.name || cleanEmail.split('@')[0];
    const avatarUrl = profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`;
    const isDeveloper = cleanEmail === 'itai.vacht@gmail.com';

    const users = loadUsers();
    let user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (user) {
      user.name = displayName;
      user.avatarUrl = avatarUrl;
      user.provider = 'google';
      user.isDeveloper = isDeveloper;
      users[user.id] = user;
      saveUsers(users);
    } else {
      const userId = `usr_goog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: userId,
        email: cleanEmail,
        name: displayName,
        avatarUrl,
        provider: 'google',
        isDeveloper,
        createdAt: new Date().toISOString()
      };
      users[userId] = user;
      saveUsers(users);
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication</title>
          <style>
            body { background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color:#38bdf8;margin-top:0;">Authentication Successful!</h3>
            <p style="color:#94a3b8;">Welcome, ${user.name}! Closing window...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.send(`
      <html>
        <body style="background:#0f172a;color:#ef4444;font-family:sans-serif;padding:2rem;">
          <h2>Google Authentication Exception</h2>
          <p>${err.message}</p>
          <script>setTimeout(() => window.close(), 4000);</script>
        </body>
      </html>
    `);
  }
};

app.get(['/auth/google/callback', '/auth/google/callback/'], handleGoogleCallback);

// POST /api/auth/google - Login or Register using Google Account
app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, avatarUrl } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Google Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name || cleanEmail.split('@')[0]).trim();
    const users = loadUsers();
    const isDeveloper = cleanEmail === 'itai.vacht@gmail.com';

    let user = Object.values(users).find((u) => u.email.toLowerCase() === cleanEmail);

    if (user) {
      user.name = displayName || user.name;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      user.provider = 'google';
      user.isDeveloper = isDeveloper;
      users[user.id] = user;
      saveUsers(users);
    } else {
      const userId = `usr_goog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: userId,
        email: cleanEmail,
        name: displayName,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        provider: 'google',
        isDeveloper,
        createdAt: new Date().toISOString()
      };
      users[userId] = user;
      saveUsers(users);
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- DEVELOPER BUILT-IN LIBRARY JSON ENDPOINTS ---

// GET /api/developer/builtin-json - Fetch raw JSON of built-in libraries
app.get('/api/developer/builtin-json', (req, res) => {
  try {
    const templates = getBuiltinTemplates();
    res.json({ success: true, jsonContent: JSON.stringify(templates, null, 2) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/developer/builtin-json - Save updated JSON of built-in libraries (itai.vacht@gmail.com only)
app.post('/api/developer/builtin-json', (req, res) => {
  try {
    const { userEmail, jsonContent } = req.body;
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    if (cleanEmail !== 'itai.vacht@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only developer account (itai.vacht@gmail.com) can edit the built-in library JSON file.'
      });
    }

    if (!jsonContent) {
      return res.status(400).json({ success: false, message: 'jsonContent is required.' });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (e: any) {
      return res.status(400).json({ success: false, message: 'Invalid JSON format: ' + e.message });
    }

    if (!Array.isArray(parsed)) {
      return res.status(400).json({ success: false, message: 'JSON must be an array of MemeTemplate objects.' });
    }

    saveBuiltinTemplates(parsed);
    res.json({
      success: true,
      message: 'Built-in library JSON file was successfully updated and saved on the server!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- PHOTO LIBRARIES API ENDPOINTS ---

// GET /api/libraries - Returns libraries where status !== 0 (or built-in)
app.get('/api/libraries', async (req, res) => {
  try {
    const all = await getAllLibraries();
    // Filter libraries: Built-in or status !== 0 (anything other than 0)
    const filtered = all.filter((lib) => lib.isBuiltIn || lib.status !== 0);
    res.json({ success: true, libraries: filtered });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/libraries/all - Returns all libraries including pending (status 0)
app.get('/api/libraries/all', async (req, res) => {
  try {
    const all = await getAllLibraries();
    res.json({ success: true, libraries: all });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/libraries/file/:folderName/:fileName - Serves library image files saved locally or proxies from GitHub
app.get('/api/libraries/file/:folderName/:fileName', async (req, res) => {
  const { folderName, fileName } = req.params;
  const filePath = path.join(LIBRARIES_DIR, folderName, fileName);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Fallback: try fetching from GitHub raw content
  try {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;
    const ghHeaders: Record<string, string> = { 'User-Agent': 'Meme-Battle-App' };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN;
    if (token) {
      ghHeaders['Authorization'] = `Bearer ${token}`;
    }

    const ghRes = await fetch(rawUrl, { headers: ghHeaders });
    if (ghRes.ok) {
      const arrayBuffer = await ghRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save locally to disk for instant serving in future requests
      const folderPath = path.join(LIBRARIES_DIR, folderName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);

      const contentType = ghRes.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      return res.send(buffer);
    }
  } catch (err) {
    console.warn(`[File Proxy] Error fetching ${folderName}/${fileName} from GitHub:`, err);
  }

  res.status(404).send('File not found');
});

// POST /api/libraries/upload - Uploads a new photo library
app.post('/api/libraries/upload', async (req, res) => {
  try {
    const { displayName, folderName, images, textPositionsMap, status } = req.body || {};
    if (!folderName || !images || !Array.isArray(images)) {
      return res.status(400).json({ success: false, message: 'Missing required library data.' });
    }

    const folderPath = path.join(LIBRARIES_DIR, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const finalStatus = status !== undefined ? Number(status) : 0;
    // Write status.txt file containing "0" or "5"
    const statusTxtPath = path.join(folderPath, 'status.txt');
    fs.writeFileSync(statusTxtPath, String(finalStatus), 'utf-8');

    // Write positions.json file
    const positionsPath = path.join(folderPath, 'positions.json');
    fs.writeFileSync(positionsPath, JSON.stringify(textPositionsMap || {}, null, 2), 'utf-8');

    // Push to GitHub if token available (await sequentially)
    await pushToGitHubRepo(`${folderName}/status.txt`, String(finalStatus), `Add status for ${folderName}`);
    await pushToGitHubRepo(`${folderName}/positions.json`, JSON.stringify(textPositionsMap || {}, null, 2), `Add text positions for ${folderName}`);

    // Save image files
    const savedImages: MemeTemplate[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      let cleanName = (img.name || `photo_${i + 1}`).trim();
      let filename = cleanName;
      if (!/\.(png|jpg|jpeg|webp)$/i.test(filename)) {
        filename += '.png';
      }
      const localImgPath = path.join(folderPath, filename);

      if (img.url) {
        let buffer: Buffer | null = null;
        if (img.url.includes('base64,')) {
          const base64Data = img.url.split('base64,')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else if (img.url.startsWith('http://') || img.url.startsWith('https://')) {
          try {
            const fetchRes = await fetch(img.url);
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              buffer = Buffer.from(arrayBuf);
            }
          } catch (e) {
            console.warn(`Could not download image url ${img.url}:`, e);
          }
        }

        if (buffer) {
          fs.writeFileSync(localImgPath, buffer);
          await pushToGitHubRepo(`${folderName}/${filename}`, buffer, `Add image ${filename} to ${folderName}`);
        }
      }

      savedImages.push({
        id: `${folderName}_img_${i}`,
        name: cleanName.replace(/\.[^/.]+$/, ''),
        url: `/api/libraries/file/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`,
        isCustom: true,
        textPositions: textPositionsMap?.[img.name] || textPositionsMap?.[cleanName]
      });
    }

    const createdLibrary: PhotoLibrary = {
      id: folderName,
      folderName,
      displayName: displayName || folderName,
      status: finalStatus,
      images: savedImages,
      textPositionsMap: textPositionsMap || {}
    };

    res.json({ success: true, library: createdLibrary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/libraries/:folderName/positions - Saves positions.json
app.post('/api/libraries/:folderName/positions', async (req, res) => {
  try {
    const { folderName } = req.params;
    const { textPositionsMap } = req.body || {};

    const folderPath = path.join(LIBRARIES_DIR, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const positionsPath = path.join(folderPath, 'positions.json');
    fs.writeFileSync(positionsPath, JSON.stringify(textPositionsMap || {}, null, 2), 'utf-8');

    await pushToGitHubRepo(`${folderName}/positions.json`, JSON.stringify(textPositionsMap || {}, null, 2), `Update positions for ${folderName}`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/libraries/:folderName/status - Updates status.txt
app.post('/api/libraries/:folderName/status', async (req, res) => {
  try {
    const { folderName } = req.params;
    const { status } = req.body || {};
    const newStatus = Number(status);

    const folderPath = path.join(LIBRARIES_DIR, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const statusTxtPath = path.join(folderPath, 'status.txt');
    fs.writeFileSync(statusTxtPath, String(newStatus), 'utf-8');

    await pushToGitHubRepo(`${folderName}/status.txt`, String(newStatus), `Update status for ${folderName} to ${newStatus}`);

    res.json({ success: true, status: newStatus });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
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
      phaseStartTime: Date.now(),
      lastActivity: Date.now(),
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
    room.lastActivity = Date.now();

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
    room.lastActivity = Date.now();

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
    room.lastActivity = Date.now();
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
    room.lastActivity = Date.now();
    if (room.hostId !== playerId) return res.status(403).json({ success: false, message: 'Only host can start game' });

    const connectedCount = Object.values(room.players).filter(p => p.isConnected).length;
    if (connectedCount < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 players are required to start the game' });
    }

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
    room.lastActivity = Date.now();
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
    room.lastActivity = Date.now();
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
    room.lastActivity = Date.now();
    if (room.hostId !== playerId) return res.status(403).json({ success: false, message: 'Only host can start next round' });

    if (room.currentRound < room.settings.totalRounds) {
      room.currentRound++;
      room.submissions = {};
      startRoundCreationPhase(room);
    } else {
      room.state = 'FINAL_LEADERBOARD';
      room.phaseStartTime = Date.now();
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
    room.lastActivity = Date.now();

    room.state = 'LOBBY';
    room.phaseStartTime = Date.now();
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

    if (room) {
      room.lastActivity = Date.now();
    }

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

// Serve meme_templates folder statically with CORS enabled
app.use('/meme_templates', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'meme _templates')));

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

// Serve Digital Asset Links for Android App Links
app.get(['/.well-known/assetlinks.json', '/assetlinks.json'], (req, res) => {
  const fileInWellKnown = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
  const fileInDist = path.join(process.cwd(), 'dist', '.well-known', 'assetlinks.json');
  const targetFile = fs.existsSync(fileInWellKnown) ? fileInWellKnown : (fs.existsSync(fileInDist) ? fileInDist : null);

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Content-Type', 'application/json');
  if (targetFile) {
    res.sendFile(targetFile);
  } else {
    res.status(404).json({ error: 'assetlinks.json not found' });
  }
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

