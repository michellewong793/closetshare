'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Step = 'email' | 'reset' | 'done';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If the user arrived via a recovery link, Supabase fires PASSWORD_RECOVERY
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStep('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleEmailStep(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/change-password`,
    });
    // Always show success to avoid email enumeration
    setLoading(false);
    setStep('reset');
  }

  async function handleResetStep(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <CheckCircle2 className="text-green-500 mb-4" size={56} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h2>
        <p className="text-gray-500 mb-8">You can now sign in with your new password.</p>
        <button className="btn-primary max-w-xs mx-auto" onClick={() => router.push('/login')}>
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
      <Link href="/login" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-8 w-fit">
        <ArrowLeft size={18} /> Back
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {step === 'email' ? 'Reset password' : 'Set new password'}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        {step === 'email'
          ? "Enter your email and we'll send you a reset link."
          : 'Enter a new password for your account.'}
      </p>

      {step === 'email' ? (
        <form onSubmit={handleEmailStep} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetStep} className="flex flex-col gap-4">
          <div className="card p-4 text-sm text-brand-700 bg-brand-50 border-brand-100">
            📬 Check your email and click the reset link to activate this form, then set a new password.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
