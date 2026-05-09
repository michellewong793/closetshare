'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Shirt } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import clsx from 'clsx';

export default function ProfilePage() {
  const { currentUser, updateProfile, signOut } = useApp();
  const router = useRouter();
  const [fullName, setFullName] = useState(currentUser?.profile.full_name ?? '');
  const [phone, setPhone] = useState(currentUser?.profile.phone_number ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    await updateProfile({ full_name: fullName, phone_number: phone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  if (!currentUser) return null;

  return (
    <div className="px-4 pt-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>

      <div className="flex flex-col items-center mb-8">
        <div className={clsx('w-20 h-20 rounded-full flex items-center justify-center text-gray-900 text-3xl font-bold mb-3', currentUser.profile.avatar_color)}>
          {currentUser.profile.full_name.charAt(0)}
        </div>
        <p className="font-semibold text-gray-900">{currentUser.profile.full_name}</p>
        <p className="text-sm text-gray-500">{currentUser.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">@{currentUser.profile.username}</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input type="text" className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone number <span className="text-gray-400 font-normal">(for SMS alerts)</span>
          </label>
          <input type="tel" className="input-field" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={16} className="inline mr-1.5" />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs">
        <Shirt size={14} />
        <span>ClosetShare v0.1 · Built with Next.js + Supabase + Twilio</span>
      </div>
    </div>
  );
}
