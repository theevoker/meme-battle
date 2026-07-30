import React, { useState } from 'react';
import { Clock, Image as ImageIcon, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { CLASSIC_MEME_TEMPLATES } from '../data/templates';
import { MemeTemplate, Player, Room } from '../types';
import { MemeCanvas } from './MemeCanvas';
import { Translations } from '../i18n';

interface CreationViewProps {
  room: Room;
  currentPlayer: Player;
  timeLeft: number;
  onSubmitMeme: (templateId: string, templateName: string, imageDataUrl: string) => void;
  t: Translations;
}

// Deterministically assign a distinct meme template per player & round so everyone in the room plays with a different meme
function getPlayerTemplate(
  templates: MemeTemplate[],
  roomCode: string,
  round: number,
  playerIds: string[],
  currentPlayerId: string
): MemeTemplate {
  if (!templates || templates.length === 0) return CLASSIC_MEME_TEMPLATES[0];

  let seed = 0;
  const str = `${roomCode}_R${round}`;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) >>> 0;
  }

  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const shuffled = [...templates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Find player index (sorted alphabetically so client ordering is identical on all devices)
  const sortedPlayerIds = [...playerIds].sort();
  const playerIndex = sortedPlayerIds.indexOf(currentPlayerId);
  const index = (playerIndex >= 0 ? playerIndex : 0) % shuffled.length;

  return shuffled[index] || templates[0];
}

export const CreationView: React.FC<CreationViewProps> = ({
  room,
  currentPlayer,
  timeLeft,
  onSubmitMeme,
  t
}) => {
  // Determine available templates: either exclusive uploaded templates or combined
  const customList = room.settings.customTemplates || [];
  const allTemplates: MemeTemplate[] =
    room.settings.useOnlyCustomTemplates && customList.length > 0
      ? customList
      : [...CLASSIC_MEME_TEMPLATES, ...customList];

  // Everyone in the room gets a DIFFERENT assigned template for this round
  const playerIds = Object.keys(room.players);
  const assignedTemplate = getPlayerTemplate(
    allTemplates,
    room.code,
    room.currentRound,
    playerIds,
    currentPlayer.id
  );

  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Calculate timer progress percentage
  const totalDuration = room.settings.roundDuration || 45;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));

  // Timer color indicator
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 20 && !isUrgent;

  const handleMemeSubmit = (imageDataUrl: string) => {
    setHasSubmitted(true);
    onSubmitMeme(assignedTemplate.id, assignedTemplate.name, imageDataUrl);
  };

  // Check how many players submitted in current round
  const submissionCount = Object.keys(room.submissions).length;
  const totalConnected = (Object.values(room.players) as Player[]).filter((p) => p.isConnected).length;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Round & Countdown Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-extrabold text-xs px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center space-x-1 rtl:space-x-reverse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.round} {room.currentRound} {t.of} {room.settings.totalRounds}</span>
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">{t.memeCreationPhase}</h2>
          </div>

          {/* Countdown Display */}
          <div
            className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-1.5 rounded-xl border font-mono font-black text-base sm:text-lg transition-all ${
              isUrgent
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : isWarning
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-indigo-950/60 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : isWarning
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Has Submitted Lock-in Banner */}
      {hasSubmitted ? (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 sm:p-10 text-center shadow-2xl space-y-4 my-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">{t.memeLockedIn}</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {t.waitingForArchitects}
          </p>

          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs text-indigo-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{submissionCount} {t.of} {totalConnected} {t.submittedCount}</span>
          </div>
        </div>
      ) : (
        /* Active Meme Editor Layout */
        <div className="space-y-5 sm:space-y-6">
          {/* Assigned Meme Template Banner (No Manual Selection) */}
          <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="relative">
                <img
                  src={assignedTemplate.url}
                  alt={assignedTemplate.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-purple-400/40 shadow-md"
                />
                <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white p-1 rounded-full shadow border border-purple-400">
                  <Lock className="w-3 h-3" />
                </span>
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-widest flex items-center space-x-1 rtl:space-x-reverse">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t.assignedMemeTemplate}</span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {assignedTemplate.name}
                </h3>
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Round {room.currentRound} Meme</span>
            </div>
          </div>

          {/* Meme Canvas Editor */}
          <MemeCanvas
            template={assignedTemplate}
            onSubmitMeme={handleMemeSubmit}
            isSubmitting={hasSubmitted}
          />
        </div>
      )}
    </div>
  );
};
