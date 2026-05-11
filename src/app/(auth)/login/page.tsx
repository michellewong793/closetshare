'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shirt } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const { signIn } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const err = await signIn(email, password);

    setLoading(false);
    if (err) { setError(err); return; }

    router.push('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-16 pb-8">
      <div className="flex flex-col items-center mb-10">
        <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Shirt className="text-gray-900" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ClosetShare</h1>
        <p className="text-gray-500 text-sm mt-1">Borrow from your besties</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {error && (
          <p className="text-orange-600 text-sm text-center">{error}</p>
        )}

        <div className="flex justify-end">
          <Link href="/change-password" className="text-sm text-brand-700 hover:text-brand-800 font-medium">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-2">
          No account?{' '}
          <Link href="/signup" className="text-brand-700 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
