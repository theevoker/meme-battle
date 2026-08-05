import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Sparkles, RefreshCw, Home, Flame, Download, Medal, Award, Layers, X } from 'lucide-react';
import { MemeSubmission, Player, Room } from '../types';
import { Translations } from '../i18n';

interface FinalLeaderboardViewProps {
  room: Room;
  currentPlayer: Player;
  onRestartGame: () => void;
  onReturnHome: () => void;
  t: Translations;
}

export const FinalLeaderboardView: React.FC<FinalLeaderboardViewProps> = ({
  room,
  currentPlayer,
  onRestartGame,
  onReturnHome,
  t
}) => {
  const [selectedMemeForModal, setSelectedMemeForModal] = useState<{
    sub: MemeSubmission;
    score: number;
    roundNum: number;
  } | null>(null);

  // Fire confetti upon mounting
  useEffect(() => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  // --- PODIUM TIE HANDLING LOGIC ---
  const allPlayers = Object.values(room.players) as Player[];
  // Extract distinct scores sorted descending
  const distinctScores = Array.from(new Set(allPlayers.map((p) => p.score))).sort((a, b) => b - a);

  const rank1Score = distinctScores[0];
  const rank2Score = distinctScores[1];
  const rank3Score = distinctScores[2];

  const rank1Players = rank1Score !== undefined ? allPlayers.filter((p) => p.score === rank1Score) : [];
  const rank2Players = rank2Score !== undefined ? allPlayers.filter((p) => p.score === rank2Score) : [];
  const rank3Players = rank3Score !== undefined ? allPlayers.filter((p) => p.score === rank3Score) : [];

  const isTieForFirst = rank1Players.length > 1;

  // --- MEME SUBMISSIONS & SCORE CALCULATION ---
  // Combine allSubmissions and submissions to catch all memes
  const rawSubmissionsMap = {
    ...(room.allSubmissions || {}),
    ...(room.submissions || {})
  };
  const allSubmissionsList = Object.values(rawSubmissionsMap) as MemeSubmission[];

  // Helper to calculate total score for a submission
  const getMemeScore = (subId: string): number => {
    if (!room.votes) return 0;
    let total = 0;
    Object.values(room.votes).forEach((roundVotes) => {
      if (roundVotes) {
        Object.values(roundVotes).forEach((vote) => {
          if (vote.submissionId === subId) {
            total += vote.points || 0;
          }
        });
      }
    });
    return total;
  };

  // Helper to determine round number for a submission
  const getSubmissionRound = (sub: MemeSubmission): number => {
    if (sub.round && sub.round > 0) return sub.round;
    const parts = sub.id.split('_');
    const parsed = parseInt(parts[0], 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  };

  // 1. TOP 3 MEMES (by score)
  const memesWithScores = allSubmissionsList
    .map((sub) => ({
      submission: sub,
      score: getMemeScore(sub.id),
      roundNum: getSubmissionRound(sub)
    }))
    .sort((a, b) => b.score - a.score || b.submission.createdAt - a.submission.createdAt);

  const top3Memes = memesWithScores.slice(0, 3);

  // 2. ALL MEMES GROUPED BY ROUND
  const submissionsByRound: Record<number, { submission: MemeSubmission; score: number }[]> = {};
  memesWithScores.forEach((item) => {
    const r = item.roundNum;
    if (!submissionsByRound[r]) {
      submissionsByRound[r] = [];
    }
    submissionsByRound[r].push({
      submission: item.submission,
      score: item.score
    });
  });

  const sortedRoundNumbers = Object.keys(submissionsByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Download handler helper
  const handleDownload = (imageDataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Champion Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 shadow">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{isTieForFirst ? 'GAME OVER • SHARED CHAMPIONS' : 'GAME OVER • GRAND CHAMPION'}</span>
        </div>

        <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight mb-2">
          {isTieForFirst ? (
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              TIE! {rank1Players.map((p) => p.name.toUpperCase()).join(' & ')} WIN!
            </span>
          ) : rank1Players[0] ? (
            `${rank1Players[0].name.toUpperCase()} WINS!`
          ) : (
            'GAME COMPLETE!'
          )}
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          {isTieForFirst
            ? 'An incredible tie on the podium! Shared glory for the top meme architects!'
            : 'Congratulations to the ultimate Meme Architect of the match!'}
        </p>
      </div>

      {/* --- TIE-AWARE PODIUM DISPLAY (1st, 2nd, 3rd) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
        {/* 2nd Place Step */}
        {rank2Players.length > 0 ? (
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 sm:p-6 text-center shadow-xl order-2 md:order-1 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-300 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center mx-auto shadow-lg">
              2
            </div>
            {rank2Players.length > 1 && (
              <span className="inline-block bg-slate-800 text-slate-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Tied for 2nd
              </span>
            )}

            <div className="flex flex-wrap justify-center gap-3 py-1">
              {rank2Players.map((p) => (
                <div key={p.id} className="flex flex-col items-center space-y-1">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base text-white shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[100px]">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            <span className="inline-block bg-slate-800 text-slate-300 font-mono font-bold text-xs px-3 py-1 rounded-full">
              {rank2Score} pts
            </span>
          </div>
        ) : (
          <div className="hidden md:block order-1" />
        )}

        {/* 1st Place Step (Center / Tallest) */}
        {rank1Players.length > 0 && (
          <div className="bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-950 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl order-1 md:order-2 space-y-4 md:scale-105 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center space-x-1 rtl:space-x-reverse whitespace-nowrap">
              <Crown className="w-4 h-4 fill-current text-slate-950" />
              <span>{isTieForFirst ? '1ST PLACE (TIED)' : '1ST PLACE'}</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              {rank1Players.map((p) => (
                <div key={p.id} className="flex flex-col items-center space-y-1.5">
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-xl ring-4 ring-amber-400/50"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="font-black text-white text-sm sm:text-base truncate max-w-[120px]">
                    {p.name}
                  </h3>
                </div>
              ))}
            </div>

            <span className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow">
              {rank1Score} POINTS
            </span>
          </div>
        )}

        {/* 3rd Place Step */}
        {rank3Players.length > 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 text-center shadow-xl order-3 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-900/80 text-amber-200 font-black text-base sm:text-lg flex items-center justify-center mx-auto shadow-lg">
              3
            </div>
            {rank3Players.length > 1 && (
              <span className="inline-block bg-slate-800 text-slate-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Tied for 3rd
              </span>
            )}

            <div className="flex flex-wrap justify-center gap-3 py-1">
              {rank3Players.map((p) => (
                <div key={p.id} className="flex flex-col items-center space-y-1">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base text-white shadow-md"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[100px]">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            <span className="inline-block bg-slate-800 text-slate-300 font-mono font-bold text-xs px-3 py-1 rounded-full">
              {rank3Score} pts
            </span>
          </div>
        ) : (
          <div className="hidden md:block order-3" />
        )}
      </div>

      {/* --- REQUIREMENT 1: TOP 3 MEMES (BY SCORE) --- */}
      {top3Memes.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                <Crown className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base uppercase tracking-wider flex items-center space-x-2 rtl:space-x-reverse">
                  <span>TOP 3 MEMES OF THE GAME</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400">Highest rated creations overall by player votes</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {top3Memes.map((item, index) => {
              const sub = item.submission;
              const rankStyles = [
                {
                  badge: '1ST PLACE MEME',
                  badgeBg: 'bg-amber-500 text-slate-950',
                  border: 'border-amber-500/60 shadow-amber-500/10',
                  icon: Crown
                },
                {
                  badge: '2ND PLACE MEME',
                  badgeBg: 'bg-slate-200 text-slate-950',
                  border: 'border-slate-400/50 shadow-slate-400/10',
                  icon: Medal
                },
                {
                  badge: '3RD PLACE MEME',
                  badgeBg: 'bg-amber-700 text-amber-100',
                  border: 'border-amber-700/50 shadow-amber-700/10',
                  icon: Award
                }
              ][index] || {
                badge: `#${index + 1} MEME`,
                badgeBg: 'bg-slate-800 text-slate-200',
                border: 'border-slate-800',
                icon: Flame
              };

              const IconComponent = rankStyles.icon;

              return (
                <div
                  key={`top_${sub.id}_${index}`}
                  className={`bg-slate-950 border ${rankStyles.border} rounded-2xl p-3.5 flex flex-col justify-between space-y-3 shadow-xl relative overflow-hidden group`}
                >
                  {/* Top Rank Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center space-x-1 rtl:space-x-reverse font-black text-[10px] uppercase px-2.5 py-1 rounded-lg shadow ${rankStyles.badgeBg}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{rankStyles.badge}</span>
                    </span>

                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                      R{item.roundNum}
                    </span>
                  </div>

                  {/* Meme Image (clickable for preview) */}
                  <div
                    onClick={() => setSelectedMemeForModal(item)}
                    className="relative cursor-pointer overflow-hidden rounded-xl bg-slate-900 border border-slate-800 group-hover:border-slate-700 transition-colors"
                  >
                    <img
                      src={sub.imageDataUrl}
                      alt={sub.templateName}
                      className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Details & Download Button */}
                  <div className="pt-1 border-t border-slate-900 flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow"
                        style={{ backgroundColor: sub.authorColor }}
                      >
                        {sub.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-white text-xs truncate">{sub.authorName}</p>
                        <p className="text-[10px] font-mono text-emerald-400 font-bold">
                          {item.score > 0 ? `+${item.score}` : item.score} pts
                        </p>
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      type="button"
                      onClick={() => handleDownload(sub.imageDataUrl, `top_${index + 1}_meme_${sub.authorName}.png`)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 rtl:space-x-reverse shadow min-h-[36px] touch-manipulation active:scale-95"
                      title="Download Meme"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- REQUIREMENT 2: ALL MEMES MADE IN THE GAME (GROUPED BY ROUND) --- */}
      {sortedRoundNumbers.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse border-b border-slate-800 pb-3">
            <div className="p-2 bg-slate-800 rounded-xl text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
                ALL MATCH MEMES ({allSubmissionsList.length})
              </h3>
              <p className="text-xs text-slate-400">Organized round-by-round with instant download buttons</p>
            </div>
          </div>

          <div className="space-y-8">
            {sortedRoundNumbers.map((roundNum) => {
              const roundSubmissions = submissionsByRound[roundNum] || [];

              return (
                <div key={`round_group_${roundNum}`} className="space-y-4">
                  {/* Round Header */}
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow uppercase tracking-wider">
                      ROUND {roundNum}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {roundSubmissions.length} {roundSubmissions.length === 1 ? 'Meme' : 'Memes'} Submitted
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>

                  {/* Grid of Round Memes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {roundSubmissions.map((item) => {
                      const sub = item.submission;

                      return (
                        <div
                          key={`sub_r${roundNum}_${sub.id}`}
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-col justify-between space-y-3 shadow-lg transition-colors group"
                        >
                          {/* Image Thumbnail */}
                          <div
                            onClick={() => setSelectedMemeForModal(item)}
                            className="relative cursor-pointer overflow-hidden rounded-xl bg-slate-900 border border-slate-900"
                          >
                            <img
                              src={sub.imageDataUrl}
                              alt={sub.templateName}
                              className="w-full h-44 object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          {/* Info Footer & Download Button */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                                style={{ backgroundColor: sub.authorColor }}
                              >
                                {sub.authorName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-200 truncate">{sub.authorName}</p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  Score: <span className="font-bold text-emerald-400">{item.score > 0 ? `+${item.score}` : item.score}</span>
                                </p>
                              </div>
                            </div>

                            {/* Download Button Next to Each Meme */}
                            <button
                              type="button"
                              onClick={() => handleDownload(sub.imageDataUrl, `round_${roundNum}_meme_${sub.authorName}.png`)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 rtl:space-x-reverse shadow min-h-[36px] touch-manipulation active:scale-95"
                              title="Download Meme"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- LIGHTBOX MODAL FOR MEME ENLARGEMENT & DOWNLOAD --- */}
      {selectedMemeForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-2xl w-full shadow-2xl relative space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                  style={{ backgroundColor: selectedMemeForModal.sub.authorColor }}
                >
                  {selectedMemeForModal.sub.authorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-white text-sm">{selectedMemeForModal.sub.authorName}'s Meme</h4>
                  <p className="text-xs text-slate-400">
                    Round {selectedMemeForModal.roundNum} • Score:{' '}
                    <span className="font-bold text-emerald-400">{selectedMemeForModal.score} pts</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMemeForModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image */}
            <div className="bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center">
              <img
                src={selectedMemeForModal.sub.imageDataUrl}
                alt={selectedMemeForModal.sub.templateName}
                className="max-h-[60vh] object-contain rounded-xl"
              />
            </div>

            {/* Modal Download Actions */}
            <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setSelectedMemeForModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDownload(
                    selectedMemeForModal.sub.imageDataUrl,
                    `meme_round_${selectedMemeForModal.roundNum}_${selectedMemeForModal.sub.authorName}.png`
                  )
                }
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-2 rtl:space-x-reverse"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res Meme</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart / Return Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
        {currentPlayer.isHost && (
          <button
            type="button"
            onClick={onRestartGame}
            className="flex-1 min-h-[52px] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <RefreshCw className="w-5 h-5" />
            <span>{t.playAgain}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReturnHome}
          className="flex-1 min-h-[52px] py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm sm:text-base tracking-wide border border-slate-700 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer touch-manipulation active:scale-[0.98]"
        >
          <Home className="w-5 h-5" />
          <span>{t.returnHome}</span>
        </button>
      </div>
    </div>
  );
};
