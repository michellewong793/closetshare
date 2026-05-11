'use client';

import { useState } from 'react';
import { UserPlus, CheckCircle2, Copy, Users, RefreshCw, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Closet } from '@/types';
import clsx from 'clsx';

export default function InvitePage() {
  const { closets, pendingInvites, createCloset, sendInvite, acceptInvite, declineInvite, refreshClosets, currentUser } = useApp();

  const [refreshing, setRefreshing] = useState(false);

  // Create closet
  const [newClosetName, setNewClosetName] = useState('');
  const [creatingCloset, setCreatingCloset] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Invite by username
  const [selectedClosetId, setSelectedClosetId] = useState<string>('');
  const [username, setUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [justInvited, setJustInvited] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Share link
  const [copiedClosetId, setCopiedClosetId] = useState<string | null>(null);

  // Expanded closet
  const [expandedClosetId, setExpandedClosetId] = useState<string | null>(null);

  const myClosets = closets.filter(c => c.owner_id === currentUser?.id);
  const joinedClosets = closets.filter(c => c.owner_id !== currentUser?.id);

  async function handleCreateCloset(e: React.FormEvent) {
    e.preventDefault();
    if (!newClosetName.trim()) return;
    setCreatingCloset(true);
    const closet = await createCloset(newClosetName.trim());
    setCreatingCloset(false);
    if (closet) {
      setNewClosetName('');
      setShowCreateForm(false);
      setSelectedClosetId(closet.id);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !selectedClosetId) return;
    setInviteError('');
    setInviting(true);
    const { error } = await sendInvite(username.trim(), selectedClosetId);
    setInviting(false);
    if (error) {
      setInviteError(error);
    } else {
      setJustInvited(username.trim());
      setUsername('');
      setTimeout(() => setJustInvited(null), 3000);
    }
  }

  function copyInviteLink(closet: Closet) {
    const link = `https://closetshare-beta.vercel.app/signup?closet_id=${closet.id}`;
    navigator.clipboard.writeText(link);
    setCopiedClosetId(closet.id);
    setTimeout(() => setCopiedClosetId(null), 2000);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refreshClosets();
    setRefreshing(false);
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900">Closets</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-brand-700 transition-colors"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-5">Create closets and invite friends to share</p>

      {/* ── Pending invites ─────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <div className="mb-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Invites to accept</h3>
          <div className="flex flex-col gap-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="card flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{invite.closet?.name ?? 'A closet'}</p>
                  <p className="text-xs text-gray-500">Invited to join</p>
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

      {/* ── My closets ──────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700 text-sm">My closets ({myClosets.length})</h3>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            <Plus size={14} /> New closet
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateCloset} className="card p-3 mb-3 flex gap-2">
            <input
              className="input-field flex-1 text-sm py-2"
              placeholder="Closet name (e.g. Spring fits)"
              value={newClosetName}
              onChange={e => setNewClosetName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={creatingCloset}>
              {creatingCloset ? '…' : 'Create'}
            </button>
          </form>
        )}

        {myClosets.length === 0 && !showCreateForm ? (
          <div className="text-center py-6 text-gray-400">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No closets yet — create one above</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myClosets.map(closet => (
              <ClosetCard
                key={closet.id}
                closet={closet}
                isOwner
                expanded={expandedClosetId === closet.id}
                onToggle={() => setExpandedClosetId(prev => prev === closet.id ? null : closet.id)}
                copied={copiedClosetId === closet.id}
                onCopyLink={() => copyInviteLink(closet)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Closets I've joined ──────────────────────────────────── */}
      {joinedClosets.length > 0 && (
        <div className="mb-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-2">Joined closets ({joinedClosets.length})</h3>
          <div className="flex flex-col gap-2">
            {joinedClosets.map(closet => (
              <ClosetCard
                key={closet.id}
                closet={closet}
                isOwner={false}
                expanded={expandedClosetId === closet.id}
                onToggle={() => setExpandedClosetId(prev => prev === closet.id ? null : closet.id)}
                copied={false}
                onCopyLink={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Invite by username ───────────────────────────────────── */}
      {myClosets.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-brand-700" /> Invite by username
          </h3>
          <form onSubmit={handleInvite} className="flex flex-col gap-3">
            <select
              className="input-field"
              value={selectedClosetId}
              onChange={e => { setSelectedClosetId(e.target.value); setInviteError(''); }}
              required
            >
              <option value="">Select a closet…</option>
              {myClosets.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              className="input-field"
              placeholder="their_username"
              value={username}
              onChange={e => { setUsername(e.target.value); setInviteError(''); }}
              required
            />
            {inviteError && <p className="text-orange-600 text-sm">{inviteError}</p>}
            <button type="submit" className="btn-primary" disabled={inviting || !selectedClosetId}>
              <UserPlus size={16} className="inline mr-1.5" />
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {justInvited && (
            <div className="mt-3 flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 rounded-xl p-3">
              <CheckCircle2 size={16} /> Invite sent to @{justInvited}!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClosetCard({ closet, isOwner, expanded, onToggle, copied, onCopyLink }: {
  closet: Closet;
  isOwner: boolean;
  expanded: boolean;
  onToggle: () => void;
  copied: boolean;
  onCopyLink: () => void;
}) {
  const memberCount = closet.members?.length ?? 0;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-brand-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{closet.name}</p>
          <p className="text-xs text-gray-500">{memberCount} member{memberCount !== 1 ? 's' : ''} · {isOwner ? 'Owner' : 'Member'}</p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3">
          {/* Members list */}
          <div className="flex flex-col gap-1.5 mt-2 mb-3">
            {(closet.members ?? []).map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-gray-900 text-xs font-bold flex-shrink-0', m.profile?.avatar_color ?? 'bg-gray-200')}>
                  {m.profile?.full_name?.charAt(0) ?? '?'}
                </div>
                <span className="text-sm text-gray-700">{m.profile?.full_name}</span>
                <span className="text-xs text-gray-400">@{m.profile?.username}</span>
              </div>
            ))}
          </div>

          {/* Share invite link (owners only) */}
          {isOwner && (
            <button
              onClick={onCopyLink}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
                copied ? 'bg-green-600 text-white' : 'bg-brand-400 text-gray-900 hover:bg-brand-500'
              )}
            >
              <Copy size={14} />
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
