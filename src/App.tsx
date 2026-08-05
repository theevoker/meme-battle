import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GameSettings, GameState, Player, Room, UserAccount } from './types';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { LobbyView } from './components/LobbyView';
import { CreationView } from './components/CreationView';
import { ShowcaseVotingView } from './components/ShowcaseVotingView';
import { RoundResultsView } from './components/RoundResultsView';
import { FinalLeaderboardView } from './components/FinalLeaderboardView';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { PhaseLoadingView } from './components/PhaseLoadingView';
import { AuthModal } from './components/AuthModal';
import { DeveloperJsonModal } from './components/DeveloperJsonModal';
import { Language, getTranslations } from './i18n';
import { isAiStudioEnvironment } from './utils/envUtils';
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

const getInitialUrlRoomCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (/^[a-zA-Z0-9]{4}$/.test(path)) {
    return path.toUpperCase();
  }
  return null;
};

export default function App() {
  const [isConnected, setIsConnected] = useState(true);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDevJsonModalOpen, setIsDevJsonModalOpen] = useState(false);

  // Load account from localStorage if present, or auto-login in AI Studio developer mode
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const isStudio = isAiStudioEnvironment();
    const devAccount: UserAccount = {
      id: 'usr_dev_aistudio',
      email: 'itai.vacht@gmail.com',
      name: 'Itai Vacht (Dev)',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=itai.vacht@gmail.com',
      provider: 'google',
      isDeveloper: true,
      createdAt: new Date().toISOString()
    };

    try {
      const saved = localStorage.getItem('mb_user_account');
      if (saved) {
        const parsed: UserAccount = JSON.parse(saved);
        if (isStudio) {
          const updated = { ...parsed, isDeveloper: true };
          localStorage.setItem('mb_user_account', JSON.stringify(updated));
          return updated;
        }
        return parsed;
      }
    } catch (e) {}

    // When entering through AI Studio, default to Developer Account
    if (isStudio) {
      try {
        localStorage.setItem('mb_user_account', JSON.stringify(devAccount));
      } catch (e) {}
      return devAccount;
    }

    return null;
  });

  const handleUserLoggedIn = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('mb_user_account', JSON.stringify(user));
    } catch (e) {}
  };

  const handleLogoutAccount = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('mb_user_account');
    } catch (e) {}
  };
  
  const [lang, setLang] = useState<Language>('en');
  const t = getTranslations(lang);

  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [urlRoomCode, setUrlRoomCode] = useState<string | null>(getInitialUrlRoomCode());

  // Current timestamp tick to keep time-dependent phase loading derived state fresh
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Synchronously derived phase transition loading state (prevents UI flashing next screen before loading screen)
  const PHASE_LOADING_DURATION = 2400;
  const elapsedPhaseTime = room?.phaseStartTime ? now - room.phaseStartTime : Infinity;
  const isPhaseLoading = Boolean(
    room &&
    room.state !== 'LOBBY' &&
    room.phaseStartTime &&
    elapsedPhaseTime < PHASE_LOADING_DURATION &&
    elapsedPhaseTime > -10000
  );

  // Timers
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(45);
  const [showcaseTimeLeft, setShowcaseTimeLeft] = useState<number>(20);

  useEffect(() => {
    // Set html dir attribute for Hebrew RTL support
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

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

  // Keep window URL path synchronized with active room code
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (room?.code) {
      if (window.location.pathname !== `/${room.code}`) {
        window.history.replaceState(null, '', `/${room.code}`);
      }
    }
  }, [room?.code]);
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
      const data = await apiStartGame(
        room.code,
        myPlayerId,
        currentUser?.email,
        Boolean(currentUser?.isDeveloper)
      );
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
    setUrlRoomCode(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
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
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDeveloperJsonModal={() => setIsDevJsonModalOpen(true)}
        onLogoutAccount={handleLogoutAccount}
      />

      {/* Server Settings Modal for Capacitor / Custom server URL */}
      <ServerSettingsModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        isConnected={isConnected}
        onReconnect={pollActiveRoom}
        t={t}
      />

      {/* Account Authentication Modal (Email & Google) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onUserLoggedIn={handleUserLoggedIn}
      />

      {/* Developer Built-in JSON Editor Modal (itai.vacht@gmail.com) */}
      <DeveloperJsonModal
        isOpen={isDevJsonModalOpen}
        onClose={() => setIsDevJsonModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Main Content Arena */}
      <main className="flex-1 flex flex-col items-center justify-start pb-12">
        {!room || !currentPlayer ? (
          <HomeView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            errorMsg={errorMsg}
            initialRoomCode={urlRoomCode}
            t={t}
          />
        ) : isPhaseLoading ? (
          <PhaseLoadingView
            toState={room.state}
            currentRound={room.currentRound}
            totalRounds={room.settings.totalRounds}
            roomCode={room.code}
            phaseStartTime={room.phaseStartTime}
            t={t}
          />
        ) : room.state === 'LOBBY' ? (
          <LobbyView
            room={room}
            currentPlayer={currentPlayer}
            currentUser={currentUser}
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
