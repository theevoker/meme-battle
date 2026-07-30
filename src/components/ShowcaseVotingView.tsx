import React from 'react';
import { ThumbsUp, ThumbsDown, Minus, Download, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { MemeSubmission, Player, Room, Vote } from '../types';
import { Translations } from '../i18n';

interface ShowcaseVotingViewProps {
  room: Room;
  currentPlayer: Player;
  showcaseTimeLeft: number;
  onCastVote: (submissionId: string, points: 200 | 0 | -200) => void;
  t: Translations;
}

export const ShowcaseVotingView: React.FC<ShowcaseVotingViewProps> = ({
  room,
  currentPlayer,
  showcaseTimeLeft,
  onCastVote,
  t
}) => {
  const submissionsList: MemeSubmission[] = room.submissionOrder && room.submissionOrder.length > 0
    ? room.submissionOrder.map((id) => room.submissions[id]).filter(Boolean)
    : (Object.values(room.submissions) as MemeSubmission[]);
  const currentIndex = room.currentShowcaseIndex || 0;
  const currentSubmission = submissionsList[currentIndex];

  if (!currentSubmission) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
        <p>Preparing meme showcase presentation...</p>
      </div>
    );
  }

  const isSelfMeme = currentSubmission.authorId === currentPlayer.id;

  // Check current vote for this submission in current round
  const currentRoundVotes = room.votes[room.currentRound] || {};
  const voteKey = `${currentSubmission.id}:${currentPlayer.id}`;
  const myVote = currentRoundVotes[voteKey];

  // Count votes cast for current submission
  const subVotes = (Object.values(currentRoundVotes) as Vote[]).filter((v) => v.submissionId === currentSubmission.id);
  const connectedCount = (Object.values(room.players) as Player[]).filter((p) => p.isConnected).length;
  const eligibleVotersCount = Math.max(0, connectedCount - 1); // excluding author

  // Download Meme function
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentSubmission.imageDataUrl;
    link.download = `meme_battle_round${room.currentRound}_${currentSubmission.authorName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Presentation Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black text-xs px-3 py-1.5 rounded-xl tracking-wider uppercase flex items-center space-x-1 rtl:space-x-reverse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.meme} {currentIndex + 1} {t.of} {submissionsList.length}</span>
          </span>
          <h2 className="text-base sm:text-lg font-black text-white">{t.votingPhase}</h2>
        </div>

        {/* Presentation Timer */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 font-mono font-black text-indigo-300 text-base sm:text-lg shadow">
          <Clock className="w-5 h-5 text-indigo-400" />
          <span>{showcaseTimeLeft}s</span>
        </div>
      </div>

      {/* Main Showcase Stage */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center space-y-5 sm:space-y-6">
        
        {/* Author Badge & Download Bar */}
        <div className="w-full max-w-xl flex items-center justify-between border-b border-slate-800 pb-3">
          {/* Author Badge */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow"
              style={{ backgroundColor: currentSubmission.authorColor }}
            >
              {currentSubmission.authorName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.createdBy}</span>
              {isSelfMeme ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-2.5 py-0.5 rounded-full inline-block">
                  {t.yourMeme}
                </span>
              ) : (
                <span className="text-sm font-black text-white">{currentSubmission.authorName}</span>
              )}
            </div>
          </div>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center space-x-1.5 rtl:space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow hover:text-white min-h-[44px] touch-manipulation active:scale-95"
            title={t.downloadMeme}
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">{t.downloadMeme}</span>
          </button>
        </div>

        {/* Meme Image Render */}
        <div className="relative group max-w-xl w-full flex justify-center bg-slate-950 rounded-2xl p-2 border border-slate-800 shadow-xl overflow-hidden">
          <img
            src={currentSubmission.imageDataUrl}
            alt={`Meme by ${currentSubmission.authorName}`}
            className="max-h-[320px] sm:max-h-[480px] w-auto object-contain rounded-xl"
          />
        </div>

        {/* VOTING BUTTONS SECTION */}
        <div className="w-full max-w-xl space-y-4">
          
          {/* If it's own meme, self-voting is silently disabled without annoying banner */}
          {!isSelfMeme && (
            /* Eligible Voting Controls */
            <div className="space-y-3">
              <div className="text-center text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t.castYourVote}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* LIKE BUTTON (+200 pts) */}
                <button
                  type="button"
                  onClick={() => onCastVote(currentSubmission.id, 200)}
                  className={`min-h-[52px] py-3 px-2 sm:px-4 rounded-2xl border font-black text-xs sm:text-sm tracking-wide transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer shadow-lg touch-manipulation active:scale-95 ${
                    myVote?.points === 200
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/40 scale-105'
                      : 'bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span>{t.like} (+200)</span>
                </button>

                {/* MEH BUTTON (0 pts) */}
                <button
                  type="button"
                  onClick={() => onCastVote(currentSubmission.id, 0)}
                  className={`min-h-[52px] py-3 px-2 sm:px-4 rounded-2xl border font-black text-xs sm:text-sm tracking-wide transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer shadow-lg touch-manipulation active:scale-95 ${
                    myVote?.points === 0
                      ? 'bg-slate-600 text-white border-slate-400 shadow-slate-600/40 scale-105'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Minus className="w-5 h-5" />
                  <span>{t.meh} (0)</span>
                </button>

                {/* DISLIKE BUTTON (-200 pts) */}
                <button
                  type="button"
                  onClick={() => onCastVote(currentSubmission.id, -200)}
                  className={`min-h-[52px] py-3 px-2 sm:px-4 rounded-2xl border font-black text-xs sm:text-sm tracking-wide transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer shadow-lg touch-manipulation active:scale-95 ${
                    myVote?.points === -200
                      ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/40 scale-105'
                      : 'bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border-rose-500/40 hover:border-rose-400'
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span>{t.dislike} (-200)</span>
                </button>
              </div>

              {/* Vote Status Feedback */}
              {myVote && (
                <div className="text-center text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5 rtl:space-x-reverse pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.voteRecorded}</span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Votes tally bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span>{t.votesCast}:</span>
            <span className="font-bold text-indigo-400">
              {subVotes.length} / {eligibleVotersCount} {t.voted}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
