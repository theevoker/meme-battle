import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Sparkles, RefreshCw, Home, Flame, Download } from 'lucide-react';
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

  const sortedPlayers = (Object.values(room.players) as Player[]).sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  const allSubmissions = Object.values(room.submissions) as MemeSubmission[];

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Champion Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 shadow">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>GAME OVER • GRAND CHAMPION</span>
        </div>

        <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight mb-2">
          {winner ? `${winner.name.toUpperCase()} WINS!` : 'GAME COMPLETE!'}
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          Congratulations to the ultimate Meme Architect of the match!
        </p>
      </div>

      {/* Podium Display (1st, 2nd, 3rd) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
        
        {/* 2nd Place */}
        {second && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 text-center shadow-xl order-2 md:order-1 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-300 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center mx-auto shadow-lg">
              2
            </div>
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white mx-auto shadow-md"
              style={{ backgroundColor: second.avatarColor }}
            >
              {second.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base truncate">{second.name}</h3>
            <span className="inline-block bg-slate-800 text-slate-300 font-mono font-bold text-xs px-3 py-1 rounded-full">
              {second.score} pts
            </span>
          </div>
        )}

        {/* 1st Place (Center / Tallest) */}
        {winner && (
          <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 text-center shadow-2xl order-1 md:order-2 space-y-4 md:scale-105 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center space-x-1 rtl:space-x-reverse">
              <Crown className="w-4 h-4 fill-current" />
              <span>1ST PLACE</span>
            </div>

            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl text-white mx-auto shadow-xl ring-4 ring-amber-400/50"
              style={{ backgroundColor: winner.avatarColor }}
            >
              {winner.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="font-black text-white text-lg sm:text-xl truncate">{winner.name}</h3>
            <span className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow">
              {winner.score} POINTS
            </span>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 text-center shadow-xl order-3 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-800 text-amber-100 font-black text-base sm:text-lg flex items-center justify-center mx-auto shadow-lg">
              3
            </div>
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white mx-auto shadow-md"
              style={{ backgroundColor: third.avatarColor }}
            >
              {third.name.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="font-extrabold text-white text-sm sm:text-base truncate">{third.name}</h3>
            <span className="inline-block bg-slate-800 text-slate-300 font-mono font-bold text-xs px-3 py-1 rounded-full">
              {third.score} pts
            </span>
          </div>
        )}

      </div>

      {/* Meme Hall of Fame Gallery */}
      {allSubmissions.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-800 pb-3">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider">
              MEME GALLERY OF THE MATCH ({allSubmissions.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {allSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between space-y-3 shadow-lg"
              >
                <img
                  src={sub.imageDataUrl}
                  alt={sub.templateName}
                  className="w-full max-h-[220px] object-contain rounded-xl bg-slate-900"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white"
                      style={{ backgroundColor: sub.authorColor }}
                    >
                      {sub.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-200">{sub.authorName}</span>
                  </div>

                  <a
                    href={sub.imageDataUrl}
                    download={`meme_${sub.authorName}.png`}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors min-h-[36px] flex items-center justify-center"
                    title="Download Meme"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
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
