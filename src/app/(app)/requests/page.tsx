'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/Avatar';
import { ClothingRequest, ItemRequest } from '@/types';
import { CheckCircle2, XCircle, RotateCcw, Clock, Plus, X, Link as LinkIcon, ImageIcon } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';
import clsx from 'clsx';

type Tab = 'incoming' | 'outgoing' | 'looking-for';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-orange-100 text-orange-700', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-600',  icon: RotateCcw },
};

const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'] as const;

function RequestCard({ req, isIncoming, onApprove, onDecline, onReturn }: {
  req: ClothingRequest;
  isIncoming: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
  onReturn?: () => void;
}) {
  const status = STATUS_CONFIG[req.status];
  const StatusIcon = status.icon;
  const person = isIncoming ? req.requester : req.owner;
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar
          profile={{ full_name: person?.full_name ?? '?', avatar_color: person?.avatar_color ?? 'bg-gray-400', avatar_url: person?.avatar_url }}
          className="w-10 h-10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">
              {isIncoming ? `${person?.full_name} wants to borrow` : `You requested from ${person?.full_name}`}
            </p>
            <span className={clsx('tag flex items-center gap-1', status.color)}>
              <StatusIcon size={12} /> {status.label}
            </span>
          </div>
          <p className="text-brand-700 font-medium text-sm mt-0.5">{req.item?.name}</p>
          {req.message && (
            <p className="text-sm text-gray-500 mt-1 italic">"{req.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {isIncoming && req.status === 'pending' && (
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold" onClick={onApprove}>
            Approve
          </button>
          <button className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold" onClick={onDecline}>
            Decline
          </button>
        </div>
      )}
      {isIncoming && req.status === 'approved' && (
        <button className="mt-3 w-full py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold" onClick={onReturn}>
          Mark as returned
        </button>
      )}
    </div>
  );
}

function ItemRequestCard({ req, isOwn, onClose }: {
  req: ItemRequest;
  isOwn: boolean;
  onClose: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      {req.photo_url && (
        <div className="relative w-full aspect-video bg-gray-100">
          <Image src={req.photo_url} alt="Reference photo" fill className="object-cover" sizes="100vw" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar
            profile={{ full_name: req.requester?.full_name ?? '?', avatar_color: req.requester?.avatar_color ?? 'bg-gray-400', avatar_url: req.requester?.avatar_url }}
            className="w-10 h-10"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm">
                {isOwn ? 'You' : req.requester?.full_name} {isOwn ? 'are' : 'is'} looking for
              </p>
              {isOwn && (
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="text-gray-800 text-sm mt-0.5">"{req.description}"</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {req.category && (
                <span className="tag bg-gray-100 text-gray-600 capitalize">{req.category}</span>
              )}
              {req.size && (
                <span className="tag bg-gray-100 text-gray-600">Size {req.size}</span>
              )}
            </div>
            {req.reference_url && (
              <a
                href={req.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1.5 text-xs text-brand-700 font-medium hover:underline truncate"
              >
                <LinkIcon size={12} className="flex-shrink-0" />
                <span className="truncate">{req.reference_url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const { requests, updateRequestStatus, currentUser, itemRequests, createItemRequest, closeItemRequest, markItemRequestsRead, unreadItemRequestCount } = useApp();
  const [tab, setTab] = useState<Tab>('incoming');

  // New item request form state
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mark requests as read when this tab is active
  useEffect(() => {
    if (tab === 'looking-for' && unreadItemRequestCount > 0) {
      markItemRequestsRead();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const incoming = requests.filter(r => r.owner_id === currentUser?.id);
  const outgoing = requests.filter(r => r.requester_id === currentUser?.id);

  async function handleApprove(req: ClothingRequest) {
    await updateRequestStatus(req.id, 'approved');
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: req.requester?.phone_number,
        message: `✅ ClosetShare: Your request for "${req.item?.name}" was approved! Coordinate pickup with ${currentUser?.profile.full_name}.`,
      }),
    }).catch(() => {});
  }

  async function handleDecline(req: ClothingRequest) {
    await updateRequestStatus(req.id, 'declined');
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: req.requester?.phone_number,
        message: `❌ ClosetShare: Your request for "${req.item?.name}" was declined.`,
      }),
    }).catch(() => {});
  }

  async function handleSubmitItemRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    await createItemRequest(
      description.trim(),
      category || undefined,
      size.trim() || undefined,
      referenceUrl.trim() || undefined,
      photoUrl || undefined,
    );
    setSubmitting(false);
    setDescription('');
    setCategory('');
    setSize('');
    setReferenceUrl('');
    setPhotoUrl('');
    setShowPhotoUpload(false);
    setShowForm(false);
  }

  return (
    <div className="px-4 pt-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Requests</h2>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-2xl">
        {([
          { key: 'incoming', label: 'Incoming', badge: incoming.filter(r => r.status === 'pending').length },
          { key: 'outgoing', label: 'Outgoing', badge: 0 },
          { key: 'looking-for', label: 'Looking For', badge: unreadItemRequestCount },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
            {badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Incoming / Outgoing tabs ───────────────────────────────── */}
      {(tab === 'incoming' || tab === 'outgoing') && (() => {
        const shown = tab === 'incoming' ? incoming : outgoing;
        return shown.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📬</p>
            <p className="font-medium">No {tab} requests yet</p>
            <p className="text-sm mt-1">
              {tab === 'incoming'
                ? "When friends request your items, they'll show up here"
                : "Browse your friends' closets to make a request"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                isIncoming={tab === 'incoming'}
                onApprove={() => handleApprove(req)}
                onDecline={() => handleDecline(req)}
                onReturn={() => updateRequestStatus(req.id, 'returned')}
              />
            ))}
          </div>
        );
      })()}

      {/* ── Looking For tab ───────────────────────────────────────── */}
      {tab === 'looking-for' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Items your circle is looking to borrow</p>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              <Plus size={14} /> Post request
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmitItemRequest} className="card p-4 mb-4 border-brand-200 bg-brand-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">What are you looking for?</h3>
                <button type="button" onClick={() => { setShowForm(false); setShowPhotoUpload(false); }} className="text-gray-400"><X size={16} /></button>
              </div>
              <div className="flex flex-col gap-3">
                <textarea
                  className="input-field resize-none text-sm"
                  rows={2}
                  placeholder='e.g. "Green bomber jacket, size Small, no collar"'
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <select
                    className="input-field flex-1 text-sm"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="">Category (optional)</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    className="input-field w-24 text-sm"
                    placeholder="Size"
                    value={size}
                    onChange={e => setSize(e.target.value)}
                  />
                </div>

                {/* Reference link */}
                <div className="relative">
                  <LinkIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    className="input-field pl-9 text-sm"
                    placeholder="Reference link (optional)"
                    value={referenceUrl}
                    onChange={e => setReferenceUrl(e.target.value)}
                  />
                </div>

                {/* Photo toggle */}
                <button
                  type="button"
                  onClick={() => setShowPhotoUpload(v => !v)}
                  className={clsx(
                    'flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-2xl border transition-colors',
                    showPhotoUpload || photoUrl
                      ? 'border-brand-400 text-brand-700 bg-brand-50'
                      : 'border-gray-200 text-gray-600 bg-white'
                  )}
                >
                  <ImageIcon size={15} />
                  {photoUrl ? 'Photo added ✓' : 'Add reference photo'}
                </button>

                {showPhotoUpload && (
                  <CameraCapture
                    userId={currentUser!.id}
                    existingUrl={photoUrl}
                    onCapture={url => { setPhotoUrl(url); setShowPhotoUpload(false); }}
                  />
                )}

                <button type="submit" className="btn-primary text-sm" disabled={submitting || !description.trim()}>
                  {submitting ? 'Posting…' : 'Post request'}
                </button>
              </div>
            </form>
          )}

          {itemRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">No open requests</p>
              <p className="text-sm mt-1">Post what you're looking for and your friends will see it</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itemRequests.map(req => (
                <ItemRequestCard
                  key={req.id}
                  req={req}
                  isOwn={req.requester_id === currentUser?.id}
                  onClose={() => closeItemRequest(req.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
