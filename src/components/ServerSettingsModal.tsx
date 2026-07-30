import React, { useState } from 'react';
import { Server, Wifi, WifiOff, CheckCircle2, AlertCircle, RefreshCw, X, Globe, Smartphone } from 'lucide-react';
import { Translations } from '../i18n';
import { getServerUrl, setCustomServerUrl, resetCustomServerUrl, getDefaultServerUrl, isCapacitorOrNative } from '../lib/serverConfig';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onReconnect: () => void;
  t: Translations;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onReconnect,
  t
}) => {
  const [urlInput, setUrlInput] = useState<string>(getServerUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const cleanUrl = urlInput.trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        setTestStatus('error');
        setTestMessage('Please enter a valid URL');
        return;
      }

      const res = await fetch(`${cleanUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        setTestStatus('success');
        setTestMessage(`Server connected! Active rooms: ${data.activeRoomsCount ?? 0}`);
      } else {
        setTestStatus('error');
        setTestMessage(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Failed to reach server');
    }
  };

  const handleSave = () => {
    setCustomServerUrl(urlInput);
    onReconnect();
    onClose();
  };

  const handleReset = () => {
    resetCustomServerUrl();
    const defaultUrl = getDefaultServerUrl();
    setUrlInput(defaultUrl);
    setTestStatus('idle');
  };

  const handleUseCurrentDevServer = () => {
    setUrlInput(window.location.origin);
    setTestStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t.serverSettings}</h3>
            <p className="text-xs text-slate-400">{t.serverSettingsDesc}</p>
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">{t.connectionStatus}:</span>
          <div className="flex items-center space-x-2 rtl:space-x-reverse font-bold">
            {isConnected ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400">{t.connected}</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                <span className="text-rose-400">{t.disconnected}</span>
              </>
            )}
          </div>
        </div>

        {/* APK / Capacitor Info Note */}
        {isCapacitorOrNative() && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-1">
            <div className="flex items-center space-x-2 rtl:space-x-reverse font-bold">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Android APK Mode Detected</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              {t.capacitorNotice}
            </p>
          </div>
        )}

        {/* URL Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            {t.serverUrl}
          </label>
          <div className="relative">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://your-meme-game.run.app"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all min-h-[48px] dir-ltr font-mono"
            />
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <button
              type="button"
              onClick={handleUseCurrentDevServer}
              className="hover:text-indigo-400 transition-colors cursor-pointer underline"
            >
              Use Web App Origin
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="hover:text-slate-200 transition-colors cursor-pointer underline"
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Test Result Banner */}
        {testStatus !== 'idle' && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-2.5 rtl:space-x-reverse ${
              testStatus === 'testing'
                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                : testStatus === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
            {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>
              {testStatus === 'testing' ? 'Testing connection to server...' : testMessage}
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer min-h-[48px] touch-manipulation active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
            <span>{t.testConnection}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse cursor-pointer min-h-[48px] touch-manipulation active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.saveAndReconnect}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
