import React, { useState } from 'react';
import { Play, PlusCircle, Users, Sparkles, Clock, Layers, Flame } from 'lucide-react';
import { GameSettings, MemeTemplate, PhotoLibrary } from '../types';
import { Translations } from '../i18n';
import { LibrarySelectionView } from './LibrarySelectionView';

interface HomeViewProps {
  onCreateRoom: (hostName: string, settings: GameSettings) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  errorMsg: string | null;
  initialRoomCode?: string | null;
  t: Translations;
}

export const HomeView: React.FC<HomeViewProps> = ({ onCreateRoom, onJoinRoom, errorMsg, initialRoomCode, t }) => {
  const [activeTab, setActiveTab] = useState<'JOIN' | 'CREATE'>(initialRoomCode ? 'JOIN' : 'CREATE');

  // Player input
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');

  React.useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      setActiveTab('JOIN');
    }
  }, [initialRoomCode]);

  // Create Settings
  const [totalRounds, setTotalRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(45);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(['classic_memes']);
  const [allLibraries, setAllLibraries] = useState<PhotoLibrary[]>([]);

  const handleToggleLibrary = (libraryId: string) => {
    setSelectedLibraryIds((prev) => {
      if (prev.includes(libraryId)) {
        if (prev.length === 1) return prev; // At least one library must be selected
        return prev.filter((id) => id !== libraryId);
      } else {
        return [...prev, libraryId];
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'Meme Master';

    // Collect all templates from selected photo libraries
    const selectedLibs = allLibraries.filter(
      (lib) => selectedLibraryIds.includes(lib.id) || selectedLibraryIds.includes(lib.folderName)
    );

    const aggregatedTemplates: MemeTemplate[] = [];
    selectedLibs.forEach((lib) => {
      if (lib.images && Array.isArray(lib.images)) {
        lib.images.forEach((img) => {
          // Attach library text positions if present
          const pos = lib.textPositionsMap?.[img.name] || lib.textPositionsMap?.[img.id] || img.textPositions;
          aggregatedTemplates.push({
            ...img,
            libraryId: lib.id,
            textPositions: pos || img.textPositions
          });
        });
      }
    });

    onCreateRoom(finalName, {
      totalRounds,
      roundDuration,
      selectedLibraryIds,
      customTemplates: aggregatedTemplates,
      useOnlyCustomTemplates: !selectedLibraryIds.includes('classic_memes')
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const finalName = playerName.trim() || 'Meme Player';
    onJoinRoom(roomCode.trim(), finalName);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Error Alert if any */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-medium flex items-center justify-between shadow-lg shadow-rose-950/20 animate-shake">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column: Game Action Card (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Glow background effect */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Navigation Toggle Tabs */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('CREATE')}
              className={`flex-1 min-h-[44px] py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'CREATE'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.createGame}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('JOIN')}
              className={`flex-1 min-h-[44px] py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'JOIN'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t.joinGame}</span>
            </button>
          </div>

          {/* CREATE GAME FORM */}
          {activeTab === 'CREATE' && (
            <form onSubmit={handleCreateSubmit} className="space-y-5 sm:space-y-6">
              {/* Player Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {t.nickname}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t.enterNickname}
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 px-4 text-white placeholder-slate-500 outline-none transition-all font-medium min-h-[44px]"
                  required
                />
              </div>

              {/* Rounds Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>{t.rounds}</span>
                    </span>
                    <span className="text-lg font-black text-indigo-400">{totalRounds}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-8"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Round Duration */}
                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{t.roundDuration}</span>
                    </span>
                    <span className="text-lg font-black text-cyan-400">{roundDuration}s</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[30, 45, 60, 90, 120, 150].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setRoundDuration(dur)}
                        className={`min-h-[38px] py-1 rounded text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                          roundDuration === dur
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo Library Chooser Tab / Selector */}
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                <LibrarySelectionView
                  selectedLibraryIds={selectedLibraryIds}
                  onToggleLibrary={handleToggleLibrary}
                  onLibrariesUpdated={(libs) => setAllLibraries(libs)}
                />
              </div>

              {/* Create Submit Button */}
              <button
                type="submit"
                className="w-full min-h-[52px] py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-[0.98]"
              >
                <Sparkles className="w-5 h-5" />
                <span>{t.createLobby}</span>
              </button>
            </form>
          )}

          {/* JOIN GAME FORM */}
          {activeTab === 'JOIN' && (
            <form onSubmit={handleJoinSubmit} className="space-y-5 sm:space-y-6">
              {roomCode.length === 4 && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-bold flex items-center space-x-2.5 rtl:space-x-reverse shadow-lg shadow-indigo-950/20">
                  <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>{t.invitedToRoom ? t.invitedToRoom.replace('{code}', roomCode) : `Invited to join Room #${roomCode}! Pick your nickname to enter.`}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {t.nickname}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  autoFocus={Boolean(initialRoomCode)}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t.enterNickname}
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 px-4 text-white placeholder-slate-500 outline-none transition-all font-medium min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {t.roomCode}
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4821"
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 rounded-xl py-3 px-4 text-center font-mono text-3xl font-black tracking-widest text-indigo-400 placeholder-slate-600 outline-none transition-all min-h-[52px]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={roomCode.length !== 4}
                className="w-full min-h-[52px] py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{t.joinLobby}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Bento Features & Rules Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          {/* Card 1: Game Rules & Voting Rules */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">{t.appName} Rules</h3>
                <p className="text-xs text-slate-400">How to play & win points</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start space-x-2.5 rtl:space-x-reverse">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Select a classic or host ZIP-uploaded meme template and design your caption canvas before timer runs out.</span>
              </li>
              <li className="flex items-start space-x-2.5 rtl:space-x-reverse">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Memes are showcased one by one to all players in real time.</span>
              </li>
              <li className="flex items-start space-x-2.5 rtl:space-x-reverse">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Vote on opponents' memes: <strong>Like (+200 pts)</strong>, <strong>Meh (0 pts)</strong>, <strong>Dislike (-200 pts)</strong>.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
