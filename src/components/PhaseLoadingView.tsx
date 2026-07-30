import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Flame, Award, Vote, Palette } from 'lucide-react';
import { GameState } from '../types';
import { Translations } from '../i18n';

interface PhaseLoadingViewProps {
  toState: GameState;
  currentRound: number;
  totalRounds: number;
  roomCode: string;
  t: Translations;
}

export const PhaseLoadingView: React.FC<PhaseLoadingViewProps> = ({
  toState,
  currentRound,
  totalRounds,
  roomCode,
  t
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Determine title, subtitle, icon, and colors based on target phase
  let title = t.phaseLoadingStarting;
  let subtitle = '';
  let icon = <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />;
  let gradientBg = 'from-indigo-600/20 via-purple-600/20 to-slate-900';
  let badgeColor = 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300';

  if (toState === 'MEME_CREATION') {
    title = t.phaseLoadingCreationTitle.replace('{round}', String(currentRound));
    subtitle = t.phaseLoadingCreationSub;
    icon = <Palette className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400 animate-bounce" />;
    gradientBg = 'from-purple-900/40 via-indigo-900/40 to-slate-950';
    badgeColor = 'bg-purple-500/20 border-purple-500/40 text-purple-300';
  } else if (toState === 'SHOWCASE_VOTING') {
    title = t.phaseLoadingVotingTitle;
    subtitle = t.phaseLoadingVotingSub;
    icon = <Vote className="w-8 h-8 sm:w-12 sm:h-12 text-amber-400 animate-pulse" />;
    gradientBg = 'from-amber-900/40 via-orange-900/40 to-slate-950';
    badgeColor = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
  } else if (toState === 'ROUND_RESULTS') {
    title = t.phaseLoadingResultsTitle;
    subtitle = t.phaseLoadingResultsSub;
    icon = <Flame className="w-8 h-8 sm:w-12 sm:h-12 text-rose-400 animate-bounce" />;
    gradientBg = 'from-rose-900/40 via-purple-900/40 to-slate-950';
    badgeColor = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
  } else if (toState === 'FINAL_LEADERBOARD') {
    title = t.phaseLoadingFinalTitle;
    subtitle = t.phaseLoadingFinalSub;
    icon = <Award className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-400 animate-pulse" />;
    gradientBg = 'from-yellow-900/40 via-amber-900/40 to-slate-950';
    badgeColor = 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-16 min-h-[65vh] sm:min-h-[75vh] flex flex-col items-center justify-center text-center">
      <div className={`w-full bg-gradient-to-b ${gradientBg} border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-12 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-5 sm:space-y-8 my-auto`}>
        
        {/* Decorative background glow circle */}
        <div className="absolute -top-20 -left-20 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 sm:w-64 sm:h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Room & Round Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-black uppercase tracking-widest flex items-center space-x-1.5 rtl:space-x-reverse ${badgeColor}`}>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.round} {currentRound} {t.of} {totalRounds}</span>
          </span>
          <span className="bg-slate-950/80 border border-slate-800 text-slate-400 text-[11px] sm:text-xs font-mono font-bold px-3 py-1 sm:py-1.5 rounded-full">
            {t.code}: {roomCode}
          </span>
        </div>

        {/* Bouncing Animated Icon */}
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mx-auto shadow-2xl ring-4 ring-indigo-500/10">
          {icon}
        </div>

        {/* Phase Header & Subtitle */}
        <div className="space-y-2 sm:space-y-3 max-w-xl mx-auto">
          <h2 className="text-xl sm:text-4xl font-black text-white tracking-tight animate-pulse leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-slate-300 text-xs sm:text-base font-medium leading-relaxed px-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Progress Bar & Loader Indicator */}
        <div className="w-full max-w-md mx-auto space-y-1.5 sm:space-y-2">
          <div className="w-full bg-slate-950 h-2.5 sm:h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono text-slate-400 font-bold px-1">
            <span>{t.phaseLoadingStarting}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
