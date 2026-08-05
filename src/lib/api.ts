import { GameSettings, Room } from '../types';
import { getServerUrl } from './serverConfig';

export interface CreateRoomResponse {
  success: boolean;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  room: Room;
  message?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  room: Room;
  message?: string;
}

export interface PollRoomResponse {
  success: boolean;
  room: Room;
  timeLeft: number;
  showcaseTimeLeft: number;
  message?: string;
}

export interface GenericRoomResponse {
  success: boolean;
  room?: Room;
  message?: string;
}

// Get effective base API URL
function getApiBaseUrl(): string {
  const base = getServerUrl();
  return base.replace(/\/+$/, '');
}

// 1. Create Room
export async function apiCreateRoom(hostName: string, settings: GameSettings): Promise<CreateRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, settings })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to create room');
  }
  return data;
}

// 2. Join Room
export async function apiJoinRoom(roomCode: string, playerName: string): Promise<JoinRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, playerName })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to join room');
  }
  return data;
}

// 3. Poll Room State
export async function apiPollRoom(roomCode: string, playerId: string): Promise<PollRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/poll?playerId=${encodeURIComponent(playerId)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to poll room state');
  }
  return data;
}

// 4. Update Game Settings
export async function apiUpdateSettings(roomCode: string, playerId: string, settings: GameSettings): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, settings })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to update settings');
  }
  return data;
}

// 5. Start Game
export async function apiStartGame(
  roomCode: string,
  playerId: string,
  userEmail?: string,
  isDeveloper?: boolean
): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, userEmail, isDeveloper })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to start game');
  }
  return data;
}

// 6. Submit Meme
export async function apiSubmitMeme(
  roomCode: string,
  playerId: string,
  templateId: string,
  templateName: string,
  imageDataUrl: string
): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/submit-meme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, templateId, templateName, imageDataUrl })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to submit meme');
  }
  return data;
}

// 7. Cast Vote
export async function apiCastVote(
  roomCode: string,
  playerId: string,
  submissionId: string,
  points: 200 | 0 | -200
): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, submissionId, points })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to cast vote');
  }
  return data;
}

// 8. Next Round
export async function apiNextRound(roomCode: string, playerId: string): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/next-round`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to advance round');
  }
  return data;
}

// 9. Restart Game
export async function apiRestartGame(roomCode: string, playerId: string): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to restart game');
  }
  return data;
}

// 10. Leave Room
export async function apiLeaveRoom(roomCode: string, playerId: string): Promise<GenericRoomResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/rooms/${roomCode}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  });
  return await res.json();
}

