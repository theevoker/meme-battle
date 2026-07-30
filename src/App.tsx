import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GameSettings, GameState, Player, Room } from './types';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { CreationView } from './components/CreationView';
import { ShowcaseVotingView } from './components/ShowcaseVotingView';
import { RoundResultsView } from './components/RoundResultsView';
import { FinalLeaderboardView } from './components/FinalLeaderboardView';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { PhaseLoadingView } from './components/PhaseLoadingView';
import { Language, getTranslations } from './i18n';
import {
  apiCreateRoom,
  apiJoinRoom,
  apiPollRoom,
  apiUpdateSettings,
  apiStartGame,
  apiSubmitMeme,
  apiCastVote,
  apiNextRound,
  apiRestartGame,
  apiLeaveRoom
} from './lib/api';
import { getServerUrl } from './lib/serverConfig';

export default function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  
  const [lang, setLang] = useState<Language>('en');
  const t = getTranslations(lang);

  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Phase transition loading state
  const [isPhaseLoading, setIsPhaseLoading] = useState(false);
  const [phaseLoadingState, setPhaseLoadingState] = useState<GameState>('LOBBY');
  const prevRoomRef = useRef<{ state: GameState; round: number } | null>(null);

  // Timers
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(45);
  const [showcaseTimeLeft, setShowcaseTimeLeft] = useState<number>(20);

  useEffect(() => {
    // Set html dir attribute for Hebrew RTL support
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  // Monitor room state transitions to trigger synchronized phase loading screens for all players
  useEffect(() => {
    if (!room) {
      setIsPhaseLoading(false);
      return;
    }

    const checkPhaseLoading = () => {
      const LOADING_DURATION = 2500;
      if (room.phaseStartTime) {
        const elapsed = Date.now() - room.phaseStartTime;
        if (elapsed >= 0 && elapsed < LOADING_DURATION) {
          setPhaseLoadingState(room.state);
          setIsPhaseLoading(true);
          return;
        }
      }
      setIsPhaseLoading(false);
    };

    checkPhaseLoading();
    const interval = setInterval(checkPhaseLoading, 200);
    return () => clearInterval(interval);
  }, [room?.phaseStartTime, room?.state, room?.currentRound]);

  // Helper to show error toast
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Poll room state from Database REST API
  const pollActiveRoom = useCallback(async () => {
    if (!room?.code || !myPlayerId) return;

    try {
      const res = await apiPollRoom(room.code, myPlayerId);
      if (res.success && res.room) {
        setRoom(res.room);
        setRoundTimeLeft(res.timeLeft ?? 0);
        setShowcaseTimeLeft(res.showcaseTimeLeft ?? 0);
        setIsConnected(true);
      }
    } catch (err: any) {
      console.warn('[Poll Error]:', err.message);
      if (err.message && err.message.includes('Room not found')) {
        setRoom(null);
        setMyPlayerId(null);
        localStorage.removeItem('meme_battle_room_code');
        localStorage.removeItem('meme_battle_player_id');
        showError('Room was closed due to 5 minutes of inactivity.');
      } else {
        setIsConnected(false);
      }
    }
  }, [room?.code, myPlayerId]);

  // Setup 1-second polling loop when inside a room
  useEffect(() => {
    if (!room?.code || !myPlayerId) return;

    // Initial poll immediately
    pollActiveRoom();

    const interval = setInterval(() => {
      pollActiveRoom();
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.code, myPlayerId, pollActiveRoom]);

  // Initial Health Check & Session Restoration from LocalStorage
  useEffect(() => {
    const checkServerAndRestoreSession = async () => {
      try {
        const base = getServerUrl();
        const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) setIsConnected(true);
        else setIsConnected(false);
      } catch {
        setIsConnected(false);
      }

      // Restore active game session if page was reloaded
      const savedCode = localStorage.getItem('meme_battle_room_code');
      const savedPlayerId = localStorage.getItem('meme_battle_player_id');
      if (savedCode && savedPlayerId) {
        try {
          const pollRes = await apiPollRoom(savedCode, savedPlayerId);
          if (pollRes.success && pollRes.room && pollRes.room.players[savedPlayerId]) {
            setMyPlayerId(savedPlayerId);
            setRoom(pollRes.room);
            setRoundTimeLeft(pollRes.timeLeft ?? 0);
            setShowcaseTimeLeft(pollRes.showcaseTimeLeft ?? 0);
          } else {
            localStorage.removeItem('meme_battle_room_code');
            localStorage.removeItem('meme_battle_player_id');
          }
        } catch {
          localStorage.removeItem('meme_battle_room_code');
          localStorage.removeItem('meme_battle_player_id');
        }
      }
    };

    checkServerAndRestoreSession();
  }, []);

  // Handlers
  const handleCreateRoom = async (hostName: string, settings: GameSettings) => {
    try {
      const data = await apiCreateRoom(hostName, settings);
      setMyPlayerId(data.playerId);
      setRoom(data.room);
      localStorage.setItem('meme_battle_room_code', data.room.code);
      localStorage.setItem('meme_battle_player_id', data.playerId);
      setIsConnected(true);
      setErrorMsg(null);
    } catch (err: any) {
      showError(err.message || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    try {
      const data = await apiJoinRoom(roomCode, playerName);
      setMyPlayerId(data.playerId);
      setRoom(data.room);
      localStorage.setItem('meme_battle_room_code', data.room.code);
      localStorage.setItem('meme_battle_player_id', data.playerId);
      setIsConnected(true);
      setErrorMsg(null);
    } catch (err: any) {
      showError(err.message || 'Failed to join room');
    }
  };

  const handleUpdateSettings = async (settings: GameSettings) => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiUpdateSettings(room.code, myPlayerId, settings);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleStartGame = async () => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiStartGame(room.code, myPlayerId);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSubmitMeme = async (templateId: string, templateName: string, imageDataUrl: string) => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiSubmitMeme(room.code, myPlayerId, templateId, templateName, imageDataUrl);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleCastVote = async (submissionId: string, points: 200 | 0 | -200) => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiCastVote(room.code, myPlayerId, submissionId, points);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleNextRound = async () => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiNextRound(room.code, myPlayerId);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleRestartGame = async () => {
    if (!room || !myPlayerId) return;
    try {
      const data = await apiRestartGame(room.code, myPlayerId);
      if (data.room) setRoom(data.room);
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    if (room && myPlayerId) {
      try {
        await apiLeaveRoom(room.code, myPlayerId);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('meme_battle_room_code');
    localStorage.removeItem('meme_battle_player_id');
    setRoom(null);
    setMyPlayerId(null);
  };

  // Find active player object
  const currentPlayer: Player | null =
    room && myPlayerId && room.players[myPlayerId]
      ? room.players[myPlayerId]
      : null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        room={room}
        currentPlayer={currentPlayer}
        onLeaveRoom={handleLeaveRoom}
        lang={lang}
        onLanguageChange={setLang}
        t={t}
        socketConnected={isConnected}
        onOpenServerSettings={() => setIsServerModalOpen(true)}
      />

      {/* Server Settings Modal for Capacitor / Custom server URL */}
      <ServerSettingsModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        isConnected={isConnected}
        onReconnect={pollActiveRoom}
        t={t}
      />

      {/* Main Content Arena */}
      <main className="flex-1 flex flex-col items-center justify-start pb-12">
        {!room || !currentPlayer ? (
          <HomeView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            errorMsg={errorMsg}
            t={t}
          />
        ) : isPhaseLoading ? (
          <PhaseLoadingView
            toState={phaseLoadingState}
            currentRound={room.currentRound}
            totalRounds={room.settings.totalRounds}
            roomCode={room.code}
            t={t}
          />
        ) : room.state === 'LOBBY' ? (
          <LobbyView
            room={room}
            currentPlayer={currentPlayer}
            onStartGame={handleStartGame}
            onUpdateSettings={handleUpdateSettings}
            t={t}
          />
        ) : room.state === 'MEME_CREATION' ? (
          <CreationView
            room={room}
            currentPlayer={currentPlayer}
            timeLeft={roundTimeLeft}
            onSubmitMeme={handleSubmitMeme}
            t={t}
          />
        ) : room.state === 'SHOWCASE_VOTING' ? (
          <ShowcaseVotingView
            room={room}
            currentPlayer={currentPlayer}
            showcaseTimeLeft={showcaseTimeLeft}
            onCastVote={handleCastVote}
            t={t}
          />
        ) : room.state === 'ROUND_RESULTS' ? (
          <RoundResultsView
            room={room}
            currentPlayer={currentPlayer}
            onNextRound={handleNextRound}
            t={t}
          />
        ) : room.state === 'FINAL_LEADERBOARD' ? (
          <FinalLeaderboardView
            room={room}
            currentPlayer={currentPlayer}
            onRestartGame={handleRestartGame}
            onReturnHome={handleLeaveRoom}
            t={t}
          />
        ) : null}
      </main>
    </div>
  );
}
