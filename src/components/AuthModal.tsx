import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLoggedIn: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onUserLoggedIn }) => {
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [unconfiguredMsg, setUnconfiguredMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for postMessage from Google OAuth popup callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.user) {
        onUserLoggedIn(event.data.user);
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUserLoggedIn, onClose]);

  if (!isOpen) return null;

  const handleGoogleOAuth = async () => {
    setError(null);
    setUnconfiguredMsg(null);
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();

      if (data.success && data.url) {
        const popup = window.open(
          data.url,
          'google_oauth_popup',
          'width=550,height=650,top=100,left=200'
        );

        if (!popup) {
          setError('Popup blocked by browser. Please allow popups for this site to sign in with Google.');
        }
      } else if (data.configured === false) {
        setUnconfiguredMsg(data.message || 'GOOGLE_CLIENT_ID environment variable is not configured.');
        setShowGoogleInput(true);
      } else {
        setError(data.message || 'Failed to start Google Sign In');
      }
    } catch (err: any) {
      setError('Server connection error when starting Google OAuth.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthSimulated = async (emailToUse: string) => {
    setError(null);
    if (!emailToUse.trim()) {
      setError('Please enter a Google account email.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = emailToUse.trim().toLowerCase();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        onUserLoggedIn(data.user);
        onClose();
      } else {
        setError(data.message || 'Google sign in failed');
      }
    } catch (err: any) {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Sign In to Meme Battle</h3>
              <p className="text-[11px] text-slate-400">Quick & secure authentication</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN CONTAINER */}
        <div className="space-y-4">
          {!showGoogleInput ? (
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all cursor-pointer shadow-lg active:scale-98 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.09-6.68-4.91H1.28v3.15C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.56H1.28C.46 8.19 0 10.03 0 12c0 1.97.46 3.81 1.28 5.44l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.56l4.04 3.15c.94-2.82 3.58-4.96 6.68-4.96z"
                />
              </svg>
              <span>{loading ? 'Opening Google OAuth...' : 'Continue with Google'}</span>
            </button>
          ) : (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/30 space-y-3">
              {unconfiguredMsg && (
                <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                  <p className="font-bold">OAuth Configuration Note:</p>
                  <p className="mt-0.5">{unconfiguredMsg}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Set <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-200">GOOGLE_CLIENT_ID</code> in AI Studio settings for live popups. You can also sign in directly with your Google email address below:
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Google Account Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="e.g. user@gmail.com"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleGoogleAuthSimulated(googleEmail)}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Sign In
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleGoogleAuthSimulated('itai.vacht@gmail.com')}
                  className="text-[10px] text-purple-400 hover:underline cursor-pointer font-semibold"
                >
                  ⚡ Quick Login as Developer (itai.vacht@gmail.com)
                </button>
                <button
                  type="button"
                  onClick={() => { setShowGoogleInput(false); setUnconfiguredMsg(null); }}
                  className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Google Authentication Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
