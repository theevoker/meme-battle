import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { GameSettings, MemeSubmission, Player, Room, Vote } from '../types';

function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

const AVATAR_COLORS = [
  '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#009688',
  '#4CAF50', '#FF9800', '#795548', '#607D8B'
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// Check and auto-advance timeouts on room
export function checkAndUpdateRoomTimeouts(room: Room): { room: Room; modified: boolean } {
  let modified = false;
  const updatedRoom = { ...room };

  // 1. MEME_CREATION phase timeout
  if (updatedRoom.state === 'MEME_CREATION' && updatedRoom.roundStartTime) {
    const elapsed = Math.floor((Date.now() - updatedRoom.roundStartTime) / 1000);
    if (elapsed >= updatedRoom.settings.roundDuration) {
      // Transition to SHOWCASE_VOTING
      startShowcaseVotingPhase(updatedRoom);
      modified = true;
    }
  }

  // 2. SHOWCASE_VOTING phase timeout
  if (updatedRoom.state === 'SHOWCASE_VOTING' && updatedRoom.showcaseStartTime) {
    const elapsed = Math.floor((Date.now() - updatedRoom.showcaseStartTime) / 1000);
    if (elapsed >= 20) {
      advanceShowcase(updatedRoom);
      modified = true;
    }
  }

  // 3. Mark offline players
  const now = Date.now();
  const players = { ...updatedRoom.players };
  Object.values(players).forEach(p => {
    if (p.lastSeen && (now - p.lastSeen > 30000) && p.isConnected) {
      players[p.id] = { ...p, isConnected: false };
      modified = true;
    }
  });
  updatedRoom.players = players;

  return { room: updatedRoom, modified };
}

function startShowcaseVotingPhase(room: Room) {
  const submissionKeys = Object.keys(room.submissions);
  if (submissionKeys.length === 0) {
    if (room.currentRound < room.settings.totalRounds) {
      room.currentRound++;
      room.state = 'MEME_CREATION';
      room.roundStartTime = Date.now();
    } else {
      room.state = 'FINAL_LEADERBOARD';
    }
    return;
  }
  room.state = 'SHOWCASE_VOTING';
  room.currentShowcaseIndex = 0;
  room.showcaseStartTime = Date.now();
}

function advanceShowcase(room: Room) {
  room.currentShowcaseIndex++;
  const submissionList = Object.values(room.submissions);
  if (room.currentShowcaseIndex >= submissionList.length) {
    calculateRoundResults(room);
  } else {
    room.showcaseStartTime = Date.now();
  }
}

function checkAutoAdvanceShowcase(room: Room) {
  const submissions = Object.values(room.submissions);
  const currentSub = submissions[room.currentShowcaseIndex];
  if (!currentSub) return;

  const currentRoundVotes = room.votes[room.currentRound] || {};
  const connectedPlayers = Object.values(room.players).filter(p => p.isConnected);
  const eligibleVoters = connectedPlayers.filter(p => p.id !== currentSub.authorId);
  const subVotes = Object.values(currentRoundVotes).filter(v => v.submissionId === currentSub.id);

  if (eligibleVoters.length > 0 && subVotes.length >= eligibleVoters.length) {
    advanceShowcase(room);
  }
}

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

  room.roundScores[currentRound] = roundPointsEarned;
  room.state = 'ROUND_RESULTS';
}

// --- Direct Google Cloud Firestore API methods ---

// 1. Create Room in Firestore
export async function fsCreateRoom(hostName: string, settings: GameSettings) {
  let roomCode = generateRoomCode();
  let roomRef = doc(db, 'rooms', roomCode);
  let snap = await getDoc(roomRef);

  while (snap.exists()) {
    roomCode = generateRoomCode();
    roomRef = doc(db, 'rooms', roomCode);
    snap = await getDoc(roomRef);
  }

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
    state: 'LOBBY',
    currentRound: 1,
    roundStartTime: null,
    showcaseStartTime: null,
    currentShowcaseIndex: 0,
    settings,
    players: { [playerId]: hostPlayer },
    submissions: {},
    votes: {},
    roundScores: {}
  };

  await setDoc(roomRef, newRoom);

  return {
    success: true,
    roomCode,
    playerId,
    isHost: true,
    room: newRoom
  };
}

// 2. Join Room in Firestore
export async function fsJoinRoom(roomCode: string, playerName: string) {
  const code = roomCode.trim();
  const roomRef = doc(db, 'rooms', code);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    throw new Error('Room not found in Google Cloud Database. Check code & try again.');
  }

  const room = snap.data() as Room;

  const existingPlayer = Object.values(room.players).find(
    p => p.name.toLowerCase() === (playerName || '').toLowerCase()
  );

  let playerId: string;
  let isHost = false;

  if (existingPlayer) {
    playerId = existingPlayer.id;
    room.players[playerId] = {
      ...existingPlayer,
      isConnected: true,
      lastSeen: Date.now()
    };
    isHost = existingPlayer.isHost;
  } else {
    if (room.state !== 'LOBBY') {
      throw new Error('Game is currently in progress. Please wait for next game.');
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

  await setDoc(roomRef, room);

  return {
    success: true,
    roomCode: code,
    playerId,
    isHost,
    room
  };
}

// 3. Poll / Heartbeat Room in Firestore
export async function fsPollRoom(roomCode: string, playerId: string) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    throw new Error('Room not found');
  }

  let room = snap.data() as Room;

  // Check if phase timed out and needs state transition
  const { room: updatedRoom, modified } = checkAndUpdateRoomTimeouts(room);

  // ONLY write back to Firestore if a phase transition actually occurred (e.g. timeout reached)
  if (modified) {
    try {
      await setDoc(roomRef, updatedRoom);
    } catch (err) {
      console.warn('[Firestore] Timeout state update failed (likely quota limit), continuing with calculated state:', err);
    }
  }

  let timeLeft = 0;
  if (updatedRoom.state === 'MEME_CREATION' && updatedRoom.roundStartTime) {
    const elapsed = Math.floor((Date.now() - updatedRoom.roundStartTime) / 1000);
    timeLeft = Math.max(0, updatedRoom.settings.roundDuration - elapsed);
  }

  let showcaseTimeLeft = 0;
  if (updatedRoom.state === 'SHOWCASE_VOTING' && updatedRoom.showcaseStartTime) {
    const elapsed = Math.floor((Date.now() - updatedRoom.showcaseStartTime) / 1000);
    showcaseTimeLeft = Math.max(0, 20 - elapsed);
  }

  return {
    success: true,
    room: updatedRoom,
    timeLeft,
    showcaseTimeLeft
  };
}

// Real-time Firestore Listener (No polling needed when active!)
export function fsSubscribeRoom(roomCode: string, onUpdate: (room: Room, timeLeft: number, showcaseTimeLeft: number) => void): Unsubscribe {
  const roomRef = doc(db, 'rooms', roomCode);
  return onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const room = snap.data() as Room;

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

    onUpdate(room, timeLeft, showcaseTimeLeft);
  });
}

// 4. Update Game Settings
export async function fsUpdateSettings(roomCode: string, playerId: string, settings: GameSettings) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;
  if (room.hostId !== playerId) throw new Error('Only host can update settings');

  room.settings = settings;
  await setDoc(roomRef, room);
  return { success: true, room };
}

// 5. Start Game
export async function fsStartGame(roomCode: string, playerId: string) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;
  if (room.hostId !== playerId) throw new Error('Only host can start game');

  room.currentRound = 1;
  room.submissions = {};
  room.votes = {};
  room.roundScores = {};
  room.state = 'MEME_CREATION';
  room.roundStartTime = Date.now();

  await setDoc(roomRef, room);
  return { success: true, room };
}

// 6. Submit Meme
export async function fsSubmitMeme(
  roomCode: string,
  playerId: string,
  templateId: string,
  templateName: string,
  imageDataUrl: string
) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;
  if (room.state !== 'MEME_CREATION') throw new Error('Not in creation state');

  const submissionId = `${room.currentRound}_${playerId}`;
  const player = room.players[playerId];
  const submission: MemeSubmission = {
    id: submissionId,
    authorId: playerId,
    authorName: player?.name || 'Player',
    authorColor: player?.avatarColor || '#FF5722',
    templateId,
    templateName,
    imageDataUrl,
    createdAt: Date.now()
  };

  room.submissions[submissionId] = submission;

  const activePlayers = Object.values(room.players).filter(p => p.isConnected);
  if (Object.keys(room.submissions).length >= activePlayers.length) {
    startShowcaseVotingPhase(room);
  }

  await setDoc(roomRef, room);
  return { success: true, room };
}

// 7. Cast Vote
export async function fsCastVote(
  roomCode: string,
  playerId: string,
  submissionId: string,
  points: 200 | 0 | -200
) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;

  if (room.state !== 'SHOWCASE_VOTING') throw new Error('Not in voting state');

  const sub = room.submissions[submissionId];
  if (!sub) throw new Error('Submission not found');
  if (sub.authorId === playerId) {
    throw new Error('YOU CANNOT VOTE ON YOUR OWN MEME!');
  }

  if (!room.votes[room.currentRound]) {
    room.votes[room.currentRound] = {};
  }

  const voteKey = `${playerId}_${submissionId}`;
  const vote: Vote = {
    voterId: playerId,
    submissionId,
    points
  };

  room.votes[room.currentRound][voteKey] = vote;
  checkAutoAdvanceShowcase(room);

  await setDoc(roomRef, room);
  return { success: true, room };
}

// 8. Next Round
export async function fsNextRound(roomCode: string, playerId: string) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;

  if (room.hostId !== playerId) throw new Error('Only host can start next round');

  if (room.currentRound < room.settings.totalRounds) {
    room.currentRound++;
    room.submissions = {};
    room.state = 'MEME_CREATION';
    room.roundStartTime = Date.now();
  } else {
    room.state = 'FINAL_LEADERBOARD';
  }

  await setDoc(roomRef, room);
  return { success: true, room };
}

// 9. Restart Game
export async function fsRestartGame(roomCode: string, playerId: string) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.data() as Room;

  room.state = 'LOBBY';
  room.currentRound = 1;
  room.submissions = {};
  room.votes = {};
  room.roundScores = {};
  Object.values(room.players).forEach(p => p.score = 0);

  await setDoc(roomRef, room);
  return { success: true, room };
}

// 10. Leave Room
export async function fsLeaveRoom(roomCode: string, playerId: string) {
  const roomRef = doc(db, 'rooms', roomCode);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const room = snap.data() as Room;

  if (room.players[playerId]) {
    room.players[playerId].isConnected = false;
    if (room.hostId === playerId) {
      const nextHost = Object.values(room.players).find(p => p.isConnected);
      if (nextHost) {
        room.hostId = nextHost.id;
        nextHost.isHost = true;
      }
    }
    await setDoc(roomRef, room);
  }
}
