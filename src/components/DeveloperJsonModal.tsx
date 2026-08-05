import React, { useState, useEffect } from 'react';
import { X, Code, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles, FileText } from 'lucide-react';
import { UserAccount } from '../types';

interface DeveloperJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const DeveloperJsonModal: React.FC<DeveloperJsonModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBuiltinJson();
    }
  }, [isOpen]);

  const fetchBuiltinJson = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/developer/builtin-json');
      const data = await res.json();
      if (data.success && data.jsonContent) {
        setJsonText(data.jsonContent);
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to load built-in JSON' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error connecting to server' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setStatusMsg({ type: 'success', text: 'JSON formatted successfully' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Invalid JSON syntax: ' + err.message });
    }
  };

  const handleSave = async () => {
    setStatusMsg(null);
    if (!currentUser || currentUser.email.toLowerCase() !== 'itai.vacht@gmail.com') {
      setStatusMsg({
        type: 'error',
        text: 'Unauthorized: Only developer account (itai.vacht@gmail.com) can edit this file.'
      });
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Invalid JSON syntax. Please format JSON before saving: ' + err.message });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/developer/builtin-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: currentUser.email,
          jsonContent: jsonText
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Built-in JSON saved successfully on server!' });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to save JSON' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Server connection error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl flex flex-col h-[85vh] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">Built-in Library JSON Editor</h3>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Developer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Editing server file <span className="font-mono text-purple-300">.data/builtin_libraries.json</span> as <span className="text-emerald-400 font-bold">itai.vacht@gmail.com</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div
            className={`mb-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* Code Editor Body */}
        <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl p-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>builtin_libraries.json</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {jsonText.length} characters
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
              <span>Loading JSON file from server...</span>
            </div>
          ) : (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="flex-1 w-full bg-slate-950 text-purple-200 font-mono text-xs sm:text-sm p-2 outline-none resize-none leading-relaxed"
              placeholder="// Paste or edit MemeTemplate[] JSON here..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchBuiltinJson}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
            <button
              type="button"
              onClick={handleFormat}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Format JSON</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving to Server...' : 'Save JSON to Server'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
