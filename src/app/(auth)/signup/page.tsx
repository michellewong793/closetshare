'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Shirt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  const inviterUsername = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('inviter')
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Ensure profile row exists (trigger may have failed silently)
      if (data.user) {
        const fallbackUsername = data.user.email!.split('@')[0];
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: fallbackUsername,
            full_name: fullName || fallbackUsername,
            ...(phone ? { phone_number: phone } : {}),
          }, { onConflict: 'id', ignoreDuplicates: false });
        if (upsertError) console.error('[signup] profile upsert failed:', upsertError.message);
      }

      // Auto-connect to inviter if signup came from a personal invite link
      // Works regardless of whether email confirmation is required (data.session may be null)
      if (data.user && inviterUsername) {
        const { data: inviterProfile, error: inviterError } = await supabase
          .from('profiles')
          .select('id, phone_number, full_name')
          .eq('username', inviterUsername)
          .single();

        if (inviterError) {
          console.error('[invite] inviter lookup failed:', inviterError.message);
        }

        if (inviterProfile && inviterProfile.id !== data.user.id) {
          const { error: connectError } = await supabase.from('closet_members').insert({
            owner_id: data.user.id,
            member_id: inviterProfile.id,
            status: 'accepted',
          });

          if (connectError) {
            console.error('[invite] closet_members insert failed:', connectError.message);
          }

          // SMS the inviter — fire-and-forget, don't block navigation
          if (inviterProfile.phone_number) {
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: inviterProfile.phone_number,
                message: `👗 ClosetShare: ${fullName.split(' ')[0]} just signed up and joined your closet!`,
              }),
            }).then(async res => {
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                console.error('[invite] SMS API error:', res.status, body);
              }
            }).catch(err => console.error('[invite] SMS fetch failed:', err));
          } else {
            console.warn('[invite] inviter has no phone number, skipping SMS');
          }
        }
      }

      if (data.session) {
        // Session exists — hard redirect so AppContext reinitializes and picks up the new session
        window.location.href = '/dashboard';
      } else {
        // Email confirmation required — show check-email screen
        setCheckEmail(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('[signup] unexpected error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Shirt className="text-gray-900" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 mb-2">We sent a confirmation link to</p>
        <p className="font-semibold text-gray-900 mb-6">{email}</p>
        <p className="text-sm text-gray-400">Click the link to activate your account, then sign in.</p>
        <Link href="/login" className="mt-8 btn-primary max-w-xs mx-auto block">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <Shirt className="text-gray-900" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
        <p className="text-gray-500 text-sm mt-1">Join your friends' closets</p>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input
            type="text"
            className="input-field"
            placeholder="Your name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone number <span className="text-gray-400 font-normal">(for SMS notifications)</span>
          </label>
          <input
            type="tel"
            className="input-field"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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

        <button type="submit" className="btn-primary mt-2" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
