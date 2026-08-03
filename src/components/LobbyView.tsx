import React, { useState } from 'react';
import { Copy, Check, Users, Play, Crown, Upload, Clock, Layers, Sparkles, Share2 } from 'lucide-react';
import { GameSettings, MemeTemplate, Player, Room } from '../types';
import { Translations } from '../i18n';
import { compressImageDataUrl } from '../utils/imageCompressor';

interface LobbyViewProps {
  room: Room;
  currentPlayer: Player;
  onStartGame: () => void;
  onUpdateSettings: (settings: GameSettings) => void;
  t: Translations;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentPlayer,
  onStartGame,
  onUpdateSettings,
  t
}) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const playersList = Object.values(room.players) as Player[];
  const connectedPlayersCount = playersList.filter(p => p.isConnected).length;
  const canStart = connectedPlayersCount >= 2;
  const isHost = currentPlayer.isHost;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${room.code}` : '';

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    const fullLink = `${window.location.origin}/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meme Battle Arena',
          text: `Join my Meme Battle room #${room.code}!`,
          url: fullLink,
        });
        return;
      } catch {
        // Fallback to copying URL if native share is dismissed or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(fullLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Host template upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    let processed = 0;
    const addedTemplates: MemeTemplate[] = [];

    const checkDone = () => {
      processed++;
      if (processed === fileList.length && addedTemplates.length > 0) {
        onUpdateSettings({
          ...room.settings,
          customTemplates: [...room.settings.customTemplates, ...addedTemplates]
        });
      }
    };

    fileList.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        checkDone();
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            if (event.target?.result) {
              const rawUrl = event.target.result as string;
              const compressedUrl = await compressImageDataUrl(rawUrl);
              addedTemplates.push({
                id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: file.name.replace(/\.[^/.]+$/, ''),
                url: compressedUrl,
                isCustom: true
              });
            }
          } catch (err) {
            console.warn('Skipping problematic image file:', file.name, err);
          } finally {
            checkDone();
          }
        };
        reader.onerror = () => {
          console.warn('FileReader error for file:', file.name);
          checkDone();
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.warn('Failed to read file:', file.name, err);
        checkDone();
      }
    });
    e.target.value = '';
  };

  const removeCustomTemplate = (id: string) => {
    const filtered = room.settings.customTemplates.filter((t) => t.id !== id);
    onUpdateSettings({ ...room.settings, customTemplates: filtered });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Lobby Hero Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 mb-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GAME LOBBY</span>
        </div>

        <h2 className="text-xl sm:text-4xl font-black text-white tracking-tight mb-2">
          JOIN THE MEME ARENA
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-5">
          Share the 4-digit code with your friends to join in real time.
        </p>

        {/* Room Code & Share Link Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="inline-flex items-center justify-center space-x-3 rtl:space-x-reverse bg-slate-950/90 border-2 border-indigo-500/50 p-3 sm:p-4 rounded-2xl shadow-inner">
            <span className="text-xs font-bold text-slate-400 tracking-wider">{t.roomCode}:</span>
            <span className="font-mono text-2xl sm:text-4xl font-black text-indigo-400 tracking-widest">
              {room.code}
            </span>
            <button
              type="button"
              onClick={copyRoomCode}
              className="ml-2 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1 min-h-[44px] touch-manipulation active:scale-95"
              title="Copy room code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareLink}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white px-5 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer min-h-[52px] touch-manipulation active:scale-95"
          >
            {linkCopied ? (
              <>
                <Check className="w-5 h-5 text-emerald-300" />
                <span>{t.linkCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                <span>{t.shareLink}</span>
              </>
            )}
          </button>
        </div>

        {shareUrl && (
          <div className="mt-3 text-[11px] font-mono text-indigo-300/80 bg-slate-950/50 border border-slate-800/80 px-3 py-1.5 rounded-xl inline-block">
            {shareUrl}
          </div>
        )}
      </div>

      {/* Main Grid: Players List & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Players List Card (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Users className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                {t.players} ({playersList.filter(p => p.isConnected).length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Live Synced</span>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {playersList.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  player.id === currentPlayer.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="font-bold text-slate-100 text-sm">{player.name}</span>
                      {player.isHost && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 rtl:space-x-reverse">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>HOST</span>
                        </span>
                      )}
                      {player.id === currentPlayer.id && (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {player.isConnected ? 'Ready for battle' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className={`w-2.5 h-2.5 rounded-full ${player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings & Launch Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">
              {t.gameSettings}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300 font-medium flex items-center space-x-2 rtl:space-x-reverse">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>{t.rounds}</span>
                </span>
                <span className="font-black text-indigo-400 text-base">{room.settings.totalRounds}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-300 font-medium flex items-center space-x-2 rtl:space-x-reverse">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>{t.roundDuration}</span>
                </span>
                <span className="font-black text-cyan-400 text-base">{room.settings.roundDuration}s</span>
              </div>

              {/* Host Custom Template Upload */}
              {isHost && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium flex items-center space-x-2 rtl:space-x-reverse">
                      <Upload className="w-4 h-4 text-purple-400" />
                      <span>{t.customTemplatePack}</span>
                    </span>
                    <span className="text-purple-400 font-bold">
                      {room.settings.customTemplates.length}
                    </span>
                  </div>

                  <label className="block w-full border border-dashed border-slate-700 hover:border-purple-500 rounded-lg py-2.5 px-3 text-center cursor-pointer text-slate-400 hover:text-white transition-all bg-slate-900/50 min-h-[44px]">
                    <span className="text-xs font-semibold">+ Add Custom Template</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  </label>

                  {room.settings.customTemplates.length > 0 && (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto mt-3 pb-1">
                      {room.settings.customTemplates.map((item) => (
                        <div key={item.id} className="relative flex-shrink-0 group">
                          <img src={item.url} alt={item.name} className="w-12 h-12 rounded object-cover border border-purple-500/50" />
                          <button
                            type="button"
                            onClick={() => removeCustomTemplate(item.id)}
                            className="absolute -top-1 -right-1 bg-rose-500 text-white w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Launch / Waiting Section */}
          <div>
            {isHost ? (
              <div className="space-y-2">
                {!canStart && (
                  <div className="text-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                    <span>{t.needMorePlayers}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStart}
                  className={`w-full min-h-[52px] py-4 rounded-xl text-white font-black text-sm sm:text-base tracking-wide transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse touch-manipulation ${
                    canStart
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 shadow-xl shadow-indigo-500/25 cursor-pointer active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{t.startGame}</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 font-medium text-xs flex items-center justify-center space-x-2 rtl:space-x-reverse">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>{t.waitingForHost}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
