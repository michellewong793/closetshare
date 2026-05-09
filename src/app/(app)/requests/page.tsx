'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClothingRequest } from '@/types';
import { CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react';
import clsx from 'clsx';

type Tab = 'incoming' | 'outgoing';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-orange-100 text-orange-700', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-600',  icon: RotateCcw },
};

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
  const avatarColor = person?.avatar_color ?? 'bg-gray-400';

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-gray-900 font-bold flex-shrink-0', avatarColor)}>
          {person?.full_name?.charAt(0) ?? '?'}
        </div>
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
          <button className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700" onClick={onApprove}>
            Approve
          </button>
          <button className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50" onClick={onDecline}>
            Decline
          </button>
        </div>
      )}
      {isIncoming && req.status === 'approved' && (
        <button className="mt-3 w-full py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50" onClick={onReturn}>
          Mark as returned
        </button>
      )}
    </div>
  );
}

export default function RequestsPage() {
  const { requests, updateRequestStatus, currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('incoming');

  const incoming = requests.filter(r => r.owner_id === currentUser?.id);
  const outgoing = requests.filter(r => r.requester_id === currentUser?.id);
  const shown = tab === 'incoming' ? incoming : outgoing;

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

  return (
    <div className="px-4 pt-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Requests</h2>

      <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-2xl">
        {(['incoming', 'outgoing'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 py-2 text-sm font-semibold rounded-xl transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'incoming' && incoming.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 bg-brand-400 text-gray-900 text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {incoming.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
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
      )}
    </div>
  );
}
