'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, CheckCircle2, ZoomIn } from 'lucide-react';
import { ClothingItem, FriendWithItems } from '@/types';
import { useApp } from '@/context/AppContext';
import Avatar from '@/components/Avatar';
import PhotoLightbox from '@/components/PhotoLightbox';
import clsx from 'clsx';

interface Props {
  item: ClothingItem;
  owner: FriendWithItems;
  onClose: () => void;
}

export default function RequestModal({ item, owner, onClose }: Props) {
  const { currentUser, createRequest } = useApp();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  async function handleRequest() {
    if (!currentUser) return;
    setLoading(true);

    await createRequest(item.id, owner.id, message);

    // Fire SMS notification
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: owner.profile.phone_number,
        message: `👗 ClosetShare: ${currentUser.profile.full_name} wants to borrow your "${item.name}"! Message: "${message || 'No message'}". Open the app to respond.`,
      }),
    }).catch(() => {});

    setLoading(false);
    setSent(true);
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-10 pb-safe">

        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4" />

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>

        {sent ? (
          <div className="flex flex-col items-center py-10 px-6 text-center">
            <CheckCircle2 className="text-green-500 mb-3" size={52} />
            <h3 className="text-xl font-bold text-gray-900 mb-1">Request sent!</h3>
            <p className="text-gray-500 text-sm">
              {owner.profile.full_name.split(' ')[0]} has been notified via text message.
            </p>
            <button className="btn-primary mt-6 max-w-xs" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="pb-6">
            {/* Full-width photo */}
            {item.image_url && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden group block mb-4"
              >
                <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="100vw" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                    <ZoomIn size={20} className="text-white" />
                  </div>
                </div>
              </button>
            )}

            <div className="px-5">
              {/* Item details */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Size {item.size}</p>
                  {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                  <Avatar profile={owner.profile} className="w-5 h-5" textClassName="text-[10px]" />
                  <span className="text-xs text-gray-500">{owner.profile.full_name.split(' ')[0]}</span>
                </div>
              </div>

            {!item.available && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 text-sm text-amber-700">
                This item is currently on loan — you can still send a request for when it's back.
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Add a note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder={`Hey ${owner.profile.full_name.split(' ')[0]}, can I borrow this for…`}
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
              />
            </div>

              <button className="btn-primary" onClick={handleRequest} disabled={loading}>
                {loading ? 'Sending request…' : `Request from ${owner.profile.full_name.split(' ')[0]}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    {lightbox && item.image_url && (
      <PhotoLightbox url={item.image_url} alt={item.name} onClose={() => setLightbox(false)} />
    )}
    </>
  );
}
