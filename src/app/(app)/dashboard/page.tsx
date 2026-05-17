'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ClothingItem, FriendWithItems } from '@/types';
import RequestModal from '@/components/RequestModal';
import Avatar from '@/components/Avatar';
import clsx from 'clsx';

const CATEGORIES = ['All', 'Outerwear', 'Dresses', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

export default function DashboardPage() {
  const { currentUser, friends } = useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<{ item: ClothingItem; owner: FriendWithItems } | null>(null);

  const allItems = friends.flatMap(f => f.items.map(item => ({ item, owner: f })));

  const filtered = allItems.filter(({ item }) => {
    const matchSearch = search === '' || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || item.category === activeCategory.toLowerCase();
    return matchSearch && matchCat;
  });

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">
          Hey, {currentUser?.profile.full_name.split(' ')[0]} 👋
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Browse your friends' closets</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          className="input-field pl-11"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'flex-shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-all',
              activeCategory === cat
                ? 'bg-brand-400 text-gray-900 border-brand-400'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {friends.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-5 -mx-4 px-4">
          {friends.map(f => (
            <div key={f.id} className="flex-shrink-0 flex flex-col items-center gap-1">
              <Avatar profile={f.profile} className="w-12 h-12" textClassName="text-lg font-bold" />
              <span className="text-xs text-gray-500 max-w-[50px] truncate">{f.profile.full_name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}

      {friends.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No friends yet</p>
          <p className="text-sm mt-1">Invite friends so you can browse their closets</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p>No items match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(({ item, owner }) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem({ item, owner })}
              className="card overflow-hidden text-left active:scale-95 transition-transform"
            >
              <div className="relative w-full aspect-[4/5] bg-gray-100">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="50vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">👗</div>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-full">On loan</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Avatar profile={owner.profile} className="w-4 h-4" textClassName="text-[9px] font-bold" />
                  <span className="text-xs text-gray-500">{owner.profile.full_name.split(' ')[0]}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{item.size}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedItem && (
        <RequestModal
          item={selectedItem.item}
          owner={selectedItem.owner}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
