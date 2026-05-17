'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shirt, Mail } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';

type Tab = 'password' | 'magic';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const { signIn } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('password');

  // Password tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Magic link tab
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');

  // Google OAuth
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.push('/dashboard');
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicError('');
    setMagicLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setMagicLoading(false);
    if (error) { setMagicError(error.message); return; }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Mail className="text-gray-900" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 mb-1">We sent a magic link to</p>
        <p className="font-semibold text-gray-900 mb-6">{magicEmail}</p>
        <p className="text-sm text-gray-400">Click the link to sign in — no password needed.</p>
        <button
          onClick={() => { setMagicSent(false); setMagicEmail(''); }}
          className="mt-8 text-sm text-brand-700 font-semibold"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-16 pb-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Shirt className="text-gray-900" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ClosetShare</h1>
        <p className="text-gray-500 text-sm mt-1">Borrow from your besties</p>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 mb-4"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Password / Magic link tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-5">
        {(['password', 'magic'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); setMagicError(''); }}
            className={clsx(
              'flex-1 py-2 text-sm font-semibold rounded-xl transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            {t === 'password' ? 'Password' : 'Magic link'}
          </button>
        ))}
      </div>

      {tab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-orange-600 text-sm text-center">{error}</p>}

          <div className="flex justify-end">
            <Link href="/change-password" className="text-sm text-brand-700 hover:text-brand-800 font-medium">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {tab === 'magic' && (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={magicEmail}
              onChange={e => setMagicEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {magicError && <p className="text-orange-600 text-sm text-center">{magicError}</p>}

          <button type="submit" className="btn-primary" disabled={magicLoading}>
            <Mail size={16} className="inline mr-1.5" />
            {magicLoading ? 'Sending…' : 'Send magic link'}
          </button>
          <p className="text-center text-xs text-gray-400">We'll email you a link — no password needed.</p>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        No account?{' '}
        <Link href="/signup" className="text-brand-700 font-semibold hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
