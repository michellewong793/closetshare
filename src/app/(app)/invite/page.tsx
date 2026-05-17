'use client';

import { useState } from 'react';
import { UserPlus, CheckCircle2, Copy, Users, RefreshCw, AtSign } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/Avatar';
import clsx from 'clsx';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(connectedAt: string) {
  return Date.now() - new Date(connectedAt).getTime() < SEVEN_DAYS_MS;
}

export default function InvitePage() {
  const { friends, pendingInvites, sendInvite, acceptInvite, declineInvite, refreshFriends, currentUser } = useApp();
  const [username, setUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [justInvited, setJustInvited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const inviteLink = `https://closetshare-beta.vercel.app/signup?inviter=${currentUser?.profile.username ?? ''}`;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setInviteError('');
    setLoading(true);

    const { error } = await sendInvite(username.trim());
    if (error) {
      setInviteError(error);
    } else {
      setJustInvited(username.trim());
      setUsername('');
      setTimeout(() => setJustInvited(null), 3000);
    }
    setLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshFriends();
    setRefreshing(false);
  }

  // Incoming invites (I'm the member, status = pending)
  const incomingInvites = pendingInvites.filter(i => i.member_id === currentUser?.id);
  // Outgoing invites I've sent
  const outgoingInvites = pendingInvites.filter(i => i.owner_id === currentUser?.id);

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900">Friends</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-brand-700 transition-colors"
          title="Refresh friends"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-4">Connect with friends to share closets</p>

      {/* Your username — share this so friends can find you */}
      <div className="card p-3 mb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
          <AtSign size={16} className="text-brand-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">Your username</p>
          <p className="font-mono font-semibold text-gray-900">@{currentUser?.profile.username}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`@${currentUser?.profile.username}`);
            setCopiedUsername(true);
            setTimeout(() => setCopiedUsername(false), 2000);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 flex-shrink-0"
        >
          {copiedUsername ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copiedUsername ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Incoming invites to accept */}
      {incomingInvites.length > 0 && (
        <div className="mb-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Invites to accept</h3>
          <div className="flex flex-col gap-2">
            {incomingInvites.map(invite => (
              <div key={invite.id} className="card flex items-center gap-3 p-3">
                <Avatar
                  profile={{ full_name: invite.profile?.full_name ?? '?', avatar_color: invite.profile?.avatar_color ?? 'bg-gray-200', avatar_url: invite.profile?.avatar_url }}
                  className="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{invite.profile?.full_name}</p>
                  <p className="text-xs text-gray-500">@{invite.profile?.username}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => declineInvite(invite.id)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => acceptInvite(invite.id)}
                    className="px-3 py-1.5 bg-brand-400 text-gray-900 text-xs font-semibold rounded-xl"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite by username */}
      <div className="card p-4 mb-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-brand-700" /> Add friend by username
        </h3>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <input
            type="text"
            className="input-field"
            placeholder="their_username"
            value={username}
            onChange={e => { setUsername(e.target.value); setInviteError(''); }}
            required
          />
          {inviteError && <p className="text-orange-600 text-sm">{inviteError}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            <UserPlus size={16} className="inline mr-1.5" />
            {loading ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {justInvited && (
          <div className="mt-3 flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 rounded-xl p-3">
            <CheckCircle2 size={16} /> Invite sent to @{justInvited}!
          </div>
        )}
      </div>

      {/* Share link */}
      <div className="card p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Copy size={16} className="text-brand-700" /> Share invite link
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 truncate">
            {inviteLink}
          </div>
          <button
            onClick={copyLink}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              copied ? 'bg-green-600 text-white' : 'bg-brand-400 text-gray-900 hover:bg-brand-500'
            )}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Pending invites I've sent */}
      {outgoingInvites.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Pending invites</h3>
          <div className="flex flex-col gap-2">
            {outgoingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between card px-4 py-3">
                <div className="flex items-center gap-2">
                  <Avatar
                    profile={{ full_name: invite.profile?.full_name ?? '?', avatar_color: invite.profile?.avatar_color ?? 'bg-gray-200', avatar_url: invite.profile?.avatar_url }}
                    className="w-8 h-8"
                    textClassName="text-sm"
                  />
                  <span className="text-sm text-gray-700">@{invite.profile?.username}</span>
                </div>
                <span className="tag bg-amber-100 text-amber-700">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends in closet */}
      <div>
        <h3 className="font-semibold text-gray-700 text-sm mb-2">In your Closet ({friends.length})</h3>
        {friends.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No friends yet — invite them above!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map(f => (
              <div key={f.id} className="card flex items-center gap-3 p-3">
                <Avatar profile={f.profile} className="w-11 h-11" textClassName="text-lg font-bold" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{f.profile.full_name}</p>
                    {isNew(f.connectedAt) && (
                      <span className="tag bg-brand-300 text-gray-900 text-[10px] font-bold">✨ New</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">@{f.profile.username} · {f.items.length} items</p>
                </div>
                <span className="tag bg-green-100 text-green-700 flex-shrink-0">✓ Joined</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
