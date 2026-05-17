'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Shirt, Check, X, Loader2, Copy, AtSign, Camera } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import Avatar from '@/components/Avatar';
import clsx from 'clsx';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function ProfilePage() {
  const { currentUser, updateProfile, checkUsernameAvailable, signOut } = useApp();
  const router = useRouter();

  // Profile fields
  const [fullName, setFullName] = useState(currentUser?.profile.full_name ?? '');
  const [phone, setPhone] = useState(currentUser?.profile.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    e.target.value = '';
    setAvatarUploading(true);
    setAvatarError('');
    const supabase = createClient();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
    const { data, error: uploadError } = await supabase.storage
      .from('item-photos')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { setAvatarError(uploadError.message); setAvatarUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('item-photos').getPublicUrl(data.path);
    const err = await updateProfile({ avatar_url: publicUrl });
    if (err) setAvatarError(err);
    setAvatarUploading(false);
  }

  // Username editing
  const [usernameInput, setUsernameInput] = useState(currentUser?.profile.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [copiedUsername, setCopiedUsername] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUsername = currentUser?.profile.username ?? '';
  const usernameChanged = usernameInput !== currentUsername;

  useEffect(() => {
    if (!usernameChanged) { setUsernameStatus('idle'); return; }

    if (!USERNAME_RE.test(usernameInput)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(usernameInput);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [usernameInput, usernameChanged, checkUsernameAvailable]);

  async function handleSaveUsername() {
    if (usernameStatus !== 'available' || !usernameChanged) return;
    setUsernameError('');
    setUsernameSaving(true);
    const err = await updateProfile({ username: usernameInput });
    setUsernameSaving(false);
    if (err) {
      setUsernameError(err);
    } else {
      setUsernameSaved(true);
      setUsernameStatus('idle');
      setTimeout(() => setUsernameSaved(false), 2000);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const err = await updateProfile({ full_name: fullName, phone_number: phone });
    setSaving(false);
    if (err) { setSaveError(err); }
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  function copyUsername() {
    navigator.clipboard.writeText(`@${currentUsername}`);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  }

  if (!currentUser) return null;

  return (
    <div className="px-4 pt-4 pb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative mb-3 group"
        >
          <Avatar profile={currentUser.profile} className="w-20 h-20" textClassName="text-3xl" />
          <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
            {avatarUploading
              ? <Loader2 size={22} className="text-white animate-spin" />
              : <Camera size={22} className="text-white" />}
          </div>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        {avatarError && <p className="text-xs text-orange-600 mb-1">{avatarError}</p>}
        <p className="font-semibold text-gray-900">{currentUser.profile.full_name}</p>
        <p className="text-sm text-gray-500 mt-0.5">{currentUser.email}</p>
        <p className="text-xs text-gray-400 mt-0.5">Tap photo to change</p>
      </div>

      {/* Username card */}
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <AtSign size={15} className="text-brand-700" />
          <h3 className="font-semibold text-gray-900 text-sm">Your username</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Friends use this to find and invite you.</p>

        {/* Current username + copy */}
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 rounded-xl">
          <span className="flex-1 text-sm font-mono font-medium text-gray-800">@{currentUsername}</span>
          <button
            onClick={copyUsername}
            className="flex items-center gap-1 text-xs text-brand-700 font-semibold"
          >
            {copiedUsername ? <Check size={13} /> : <Copy size={13} />}
            {copiedUsername ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Edit username */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
          <input
            type="text"
            className={clsx(
              'input-field pl-7 pr-9 text-sm font-mono',
              usernameStatus === 'available' && 'border-green-400 focus:border-green-500',
              (usernameStatus === 'taken' || usernameStatus === 'invalid') && 'border-orange-400 focus:border-orange-500',
            )}
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder={currentUsername}
            maxLength={20}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === 'checking' && <Loader2 size={15} className="text-gray-400 animate-spin" />}
            {usernameStatus === 'available' && <Check size={15} className="text-green-500" />}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X size={15} className="text-orange-500" />}
          </div>
        </div>

        {usernameStatus === 'invalid' && (
          <p className="text-xs text-orange-600 mt-1.5">3–20 characters, letters, numbers, and underscores only.</p>
        )}
        {usernameStatus === 'taken' && (
          <p className="text-xs text-orange-600 mt-1.5">That username is already taken.</p>
        )}
        {usernameStatus === 'available' && (
          <p className="text-xs text-green-600 mt-1.5">@{usernameInput} is available!</p>
        )}
        {usernameError && <p className="text-xs text-orange-600 mt-1.5">{usernameError}</p>}

        {usernameChanged && usernameStatus === 'available' && (
          <button
            onClick={handleSaveUsername}
            disabled={usernameSaving}
            className="mt-3 w-full btn-primary text-sm"
          >
            {usernameSaving ? 'Saving…' : usernameSaved ? 'Saved!' : 'Save username'}
          </button>
        )}
      </div>

      {/* Profile fields */}
      <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
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
        {saveError && <p className="text-orange-600 text-sm">{saveError}</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={16} className="inline mr-1.5" />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <button
          onClick={async () => { await signOut(); router.push('/login'); }}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs">
        <Shirt size={14} />
        <span>ClosetShare · Built with Next.js + Supabase</span>
      </div>
    </div>
  );
}
