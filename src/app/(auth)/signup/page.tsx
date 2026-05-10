'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shirt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

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

      // Update phone number on the auto-created profile
      if (data.user && phone) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone_number: phone })
          .eq('id', data.user.id);
        if (phoneError) console.error('[signup] phone save failed:', phoneError.message, phoneError.code);
      }

      // Auto-connect to inviter if signup came from a personal invite link
      if (data.user && data.session && inviterUsername) {
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
        router.push('/dashboard');
        router.refresh();
      } else {
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
