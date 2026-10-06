import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff, Lock, User, Loader2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, settings } = useApp();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError('Please enter your User ID and Password.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const res = await login(userId, password, remember);
    setIsSubmitting(false);
    if (!res.ok) setError(res.message || 'Login failed');
  };

  const inputClass =
    'w-full h-11 pl-10 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition';

  return (
    <div className="h-dvh w-full overflow-y-auto app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/icons.png"
            alt="Pasmin"
            className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-200 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] object-contain"
          />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">Pasmin MIS Ranking</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.18)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4" method="post" autoComplete="on">
            <div>
              <label htmlFor="userId" className="block text-xs font-semibold text-slate-700 mb-1.5">
                User ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="userId"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="Enter your User ID"
                  className={`${inputClass} pr-4`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">Keep me signed in</span>
              <span className="ml-auto text-[11px] text-slate-400">Untick on shared devices</span>
            </label>

            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !settings.scriptUrl}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] shadow-md shadow-indigo-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className={`w-2 h-2 rounded-full ${settings.scriptUrl ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {settings.scriptUrl ? '' : 'Server not configured'}
        </div>
      </div>
    </div>
  );
};
