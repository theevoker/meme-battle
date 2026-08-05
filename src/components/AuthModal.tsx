import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, Sparkles, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLoggedIn: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onUserLoggedIn }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() })
      });

      const data = await res.json();
      if (data.success && data.user) {
        onUserLoggedIn(data.user);
        onClose();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err: any) {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setError(null);
    setUnconfiguredMsg(null);
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();

      if (data.success && data.url) {
        // Open Google OAuth Provider URL in popup window
        const popup = window.open(
          data.url,
          'google_oauth_popup',
          'width=550,height=650,top=100,left=200'
        );

        if (!popup) {
          setError('Popup blocked by browser. Please allow popups for this site to sign in with Google.');
        }
      } else if (data.configured === false) {
        // GOOGLE_CLIENT_ID is not configured in .env yet
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
      setError('Please enter a Google account email');
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Account Login</h3>
              <p className="text-[11px] text-slate-400">Saved securely to server database</p>
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
            <span>{error}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTON & OAUTH HANDLER */}
        <div className="mb-5 space-y-2">
          {!showGoogleInput ? (
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full min-h-[48px] py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all cursor-pointer shadow-lg active:scale-98 disabled:opacity-50"
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
            <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30 space-y-2">
              {unconfiguredMsg && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <p className="font-bold">OAuth Config Notice:</p>
                  <p>{unconfiguredMsg}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Add <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">GOOGLE_CLIENT_ID</code> in AI Studio settings to enable live OAuth popups. In the meantime, sign in with your Google email below:
                  </p>
                </div>
              )}
              <label className="block text-[11px] font-bold text-slate-300 uppercase">
                Google Account Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="e.g. itai.vacht@gmail.com"
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
              <div className="flex justify-between items-center pt-1">
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
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            OR WITH EMAIL
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Tab Switchers */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              tab === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              tab === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In to Account' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
