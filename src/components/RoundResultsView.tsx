import React from 'react';
import { Trophy, Flame, Play, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { Player, Room, Vote } from '../types';
import { Translations } from '../i18n';

interface RoundResultsViewProps {
  room: Room;
  currentPlayer: Player;
  onNextRound: () => void;
  t: Translations;
}

export const RoundResultsView: React.FC<RoundResultsViewProps> = ({
  room,
  currentPlayer,
  onNextRound,
  t
}) => {
  const isHost = currentPlayer.isHost;
  const isFinalRound = room.currentRound >= room.settings.totalRounds;

  // Calculate points gained in this round
  const roundScores = room.roundScores[room.currentRound] || {};

  // Sort players by total score
  const sortedPlayers = (Object.values(room.players) as Player[]).sort((a, b) => b.score - a.score);

  // Find round top voted meme
  let topSubmissionId = '';
  let maxPoints = -Infinity;

  const currentRoundVotes = room.votes[room.currentRound] || {};
  const subPointSums: Record<string, number> = {};

  (Object.values(currentRoundVotes) as Vote[]).forEach((v) => {
    subPointSums[v.submissionId] = (subPointSums[v.submissionId] || 0) + v.points;
  });

  Object.entries(subPointSums).forEach(([subId, pts]) => {
    if (pts > maxPoints) {
      maxPoints = pts;
      topSubmissionId = subId;
    }
  });

  const topMeme = room.submissions[topSubmissionId];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider mb-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{t.round} {room.currentRound} {t.results}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white">{t.roundStandings}</h2>
      </div>

      {/* Top Voted Meme Highlight (if any) */}
      {topMeme && (
        <div className="bg-gradient-to-tr from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-400 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
            <Flame className="w-5 h-5 animate-bounce text-amber-400" />
            <span>{t.topMemeOfRound} {room.currentRound}</span>
          </div>

          <div className="max-w-md w-full bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-xl">
            <img
              src={topMeme.imageDataUrl}
              alt="Top Meme"
              className="w-full max-h-[300px] sm:max-h-[360px] object-contain rounded-xl"
            />
          </div>

          <div className="flex items-center space-x-3 rtl:space-x-reverse bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: topMeme.authorColor }}
            >
              {topMeme.authorName.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-bold text-white text-xs sm:text-sm">BY: {topMeme.authorName}</span>
            <span className="bg-amber-500/20 text-amber-300 font-black text-xs px-2.5 py-1 rounded-full border border-amber-500/30">
              +{maxPoints} PTS
            </span>
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider flex items-center space-x-2 rtl:space-x-reverse">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>{t.leaderboard}</span>
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Ranked by Total Points</span>
        </div>

        <div className="space-y-2.5">
          {sortedPlayers.map((player, rank) => {
            const gainedThisRound = roundScores[player.id] || 0;
            const isMe = player.id === currentPlayer.id;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3 sm:space-x-4 rtl:space-x-reverse">
                  {/* Rank Badge */}
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center ${
                      rank === 0
                        ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                        : rank === 1
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rank === 0 ? <Crown className="w-4 h-4 fill-current" /> : rank + 1}
                  </span>

                  {/* Avatar & Name */}
                  <div className="flex items-center space-x-2.5 sm:space-x-3 rtl:space-x-reverse">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">{player.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Round Gain: {gainedThisRound >= 0 ? `+${gainedThisRound}` : gainedThisRound} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Score */}
                <div className="text-right">
                  <span className="font-mono font-black text-indigo-400 text-base sm:text-lg block">
                    {player.score}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Total Points</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Host Action Button */}
      <div className="pt-2">
        {isHost ? (
          <button
            type="button"
            onClick={onNextRound}
            className="w-full min-h-[52px] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            {isFinalRound ? (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{t.viewFinalPodium}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>{t.nextRound} {room.currentRound + 1}</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 font-medium text-xs flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{t.waitingForHost}</span>
          </div>
        )}
      </div>
    </div>
  );
};
