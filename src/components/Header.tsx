import React from 'react';
import { Trophy, Users, Copy, Check, LogOut, Globe, Flame } from 'lucide-react';
import { Player, Room } from '../types';
import { Language, Translations } from '../i18n';

interface HeaderProps {
  room: Room | null;
  currentPlayer: Player | null;
  onLeaveRoom: () => void;
  lang: Language;
  onLanguageChange: (newLang: Language) => void;
  t: Translations;
  socketConnected: boolean;
  onOpenServerSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
  lang,
  onLanguageChange,
  t
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 py-2.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

        {/* Header Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse">
          {/* Language Selector Toggle */}
          <button
            type="button"
            onClick={() => onLanguageChange(lang === 'en' ? 'he' : 'en')}
            className="min-h-[36px] sm:min-h-[38px] px-2 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-indigo-300 flex items-center space-x-1 rtl:space-x-reverse transition-all cursor-pointer touch-manipulation active:scale-95"
            title="Switch Language / החלף שפה"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] sm:text-xs">{lang === 'en' ? 'עברית 🇮🇱' : 'English 🇺🇸'}</span>
          </button>

          {/* Room Info & Player Badge if in Room */}
          {room && currentPlayer && (
            <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
              {/* Room Code Badge - Prominent on Top Right for all devices */}
              <button
                type="button"
                onClick={copyCode}
                title="Click to copy room code"
                className="flex items-center space-x-1 sm:space-x-1.5 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/50 text-xs font-mono py-1 px-2 sm:px-2.5 rounded-xl text-slate-200 transition-all cursor-pointer group min-h-[36px] sm:min-h-[38px] touch-manipulation active:scale-95 shadow-md"
              >
                <span className="text-slate-400 font-sans text-[10px]">{t.code}:</span>
                <span className="font-black text-indigo-300 text-xs sm:text-sm tracking-wider">{room.code}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </button>

              {/* Players Count */}
              <div className="flex items-center space-x-1 bg-slate-800/60 border border-slate-700/50 py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-medium text-slate-300 min-h-[36px] sm:min-h-[38px]">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{(Object.values(room.players) as Player[]).filter(p => p.isConnected).length}</span>
              </div>

              {/* Score */}
              <div className="flex items-center space-x-1 bg-indigo-950/60 border border-indigo-800/50 py-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold text-indigo-300 min-h-[36px] sm:min-h-[38px]">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentPlayer.score}</span>
              </div>

              {/* Leave Room Button */}
              <button
                type="button"
                onClick={onLeaveRoom}
                title={t.leave}
                className="p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center touch-manipulation active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
