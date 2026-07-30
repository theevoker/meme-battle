import React, { useState } from 'react';
import { Play, PlusCircle, Users, Upload, Sparkles, Clock, Layers, ShieldCheck, Flame, FileArchive, Check } from 'lucide-react';
import JSZip from 'jszip';
import { GameSettings, MemeTemplate } from '../types';
import { Translations } from '../i18n';
import { compressImageDataUrl } from '../utils/imageCompressor';

interface HomeViewProps {
  onCreateRoom: (hostName: string, settings: GameSettings) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  errorMsg: string | null;
  t: Translations;
}

export const HomeView: React.FC<HomeViewProps> = ({ onCreateRoom, onJoinRoom, errorMsg, t }) => {
  const [activeTab, setActiveTab] = useState<'JOIN' | 'CREATE'>('CREATE');

  // Player input
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Create Settings
  const [totalRounds, setTotalRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(45);
  const [customTemplates, setCustomTemplates] = useState<MemeTemplate[]>([]);
  const [useOnlyCustomTemplates, setUseOnlyCustomTemplates] = useState(false);
  const [isExtractingZip, setIsExtractingZip] = useState(false);

  // Handle single/multiple image uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    let processed = 0;
    const addedTemplates: MemeTemplate[] = [];

    fileList.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
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
        processed++;
        if (processed === fileList.length && addedTemplates.length > 0) {
          setCustomTemplates((prev) => [...prev, ...addedTemplates]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Handle ZIP Template Pack upload & extraction
  const handleZipFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExtractingZip(true);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const extractedTemplates: MemeTemplate[] = [];

      const fileEntries = Object.keys(zipContent.files);
      for (const filename of fileEntries) {
        const entry = zipContent.files[filename];
        if (entry.dir) continue;
        const lower = filename.toLowerCase();
        if (
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.gif')
        ) {
          const blob = await entry.async('blob');
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(blob);
          });
          const compressedUrl = await compressImageDataUrl(base64);
          const cleanName = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Template';
          extractedTemplates.push({
            id: `zip_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: cleanName,
            url: compressedUrl,
            isCustom: true
          });
        }
      }

      if (extractedTemplates.length > 0) {
        setCustomTemplates((prev) => [...prev, ...extractedTemplates]);
        setUseOnlyCustomTemplates(true); // Automatically toggle exclusive ZIP mode
      }
    } catch (err) {
      console.error('Failed to extract ZIP templates:', err);
    } finally {
      setIsExtractingZip(false);
    }
  };

  const removeCustomTemplate = (id: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || 'Meme Master';
    onCreateRoom(finalName, {
      totalRounds,
      roundDuration,
      customTemplates,
      useOnlyCustomTemplates
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
                    {[15, 30, 45, 60, 90, 120].map((dur) => (
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

              {/* Upload Custom Meme Templates / ZIP Pack */}
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <FileArchive className="w-4 h-4 text-purple-400" />
                    <span>{t.customTemplatePack}</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-400">
                    {customTemplates.length} {t.zipTemplatesCount}
                  </span>
                </div>

                {/* ZIP Upload Prompt */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-xl py-3 px-3 text-center cursor-pointer bg-purple-950/20 hover:bg-purple-900/30 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse min-h-[44px]">
                    <FileArchive className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-purple-300">
                      {isExtractingZip ? t.uploadingZip : t.uploadZipPack}
                    </span>
                    <input
                      type="file"
                      accept=".zip,application/zip,application/x-zip-compressed"
                      onChange={handleZipFileUpload}
                      className="hidden"
                      disabled={isExtractingZip}
                    />
                  </label>

                  {/* Individual Images Upload */}
                  <label className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl py-3 px-3 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse min-h-[44px]">
                    <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-300">
                      Upload Images
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Use Exclusively ZIP Templates Checkbox */}
                {customTemplates.length > 0 && (
                  <div className="pt-2 flex items-center space-x-2.5 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => setUseOnlyCustomTemplates((prev) => !prev)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        useOnlyCustomTemplates
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-900 border-slate-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-purple-300">
                      {t.useOnlyCustomTemplates}
                    </span>
                  </div>
                )}

                {/* Previews of uploaded custom templates */}
                {customTemplates.length > 0 && (
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin pt-2">
                    {customTemplates.map((tmpl) => (
                      <div key={tmpl.id} className="relative group flex-shrink-0">
                        <img
                          src={tmpl.url}
                          alt={tmpl.name}
                          className="w-14 h-14 object-cover rounded-lg border border-purple-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomTemplate(tmpl.id)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow opacity-90 group-hover:opacity-100 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Card 2: Strict Voting Rule Highlight */}
          <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <ShieldCheck className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-rose-300 uppercase tracking-wider">STRICT FAIR VOTING GUARANTEE</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Self-voting is strictly forbidden on the server! You cannot vote on your own meme submission.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Live Stats Banner */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-medium text-slate-300">Live Socket Sync Active</span>
            </div>
            <span className="font-mono text-indigo-400 font-bold">PORT 3000</span>
          </div>

        </div>
      </div>
    </div>
  );
};
