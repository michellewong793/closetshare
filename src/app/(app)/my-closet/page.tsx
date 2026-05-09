'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ClothingItem } from '@/types';
import clsx from 'clsx';

const CATEGORIES: ClothingItem['category'][] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];

const CATEGORY_EMOJI: Record<ClothingItem['category'], string> = {
  tops: '👚', bottoms: '👖', dresses: '👗', outerwear: '🧥', shoes: '👟', accessories: '👜',
};

function blankDraft(): Partial<ClothingItem> {
  return { name: '', description: '', category: 'tops', size: '', available: true };
}

export default function MyClosetPage() {
  const { myItems, addItem, updateItem, deleteItem } = useApp();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<ClothingItem>>(blankDraft());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveItem() {
    if (!draft.name || !draft.size) return;
    setSaving(true);

    if (editId) {
      await updateItem(editId, draft);
      setEditId(null);
    } else {
      await addItem({
        name: draft.name!,
        description: draft.description ?? '',
        category: draft.category!,
        size: draft.size!,
        available: draft.available ?? true,
        image_url: draft.image_url,
      });
      setAdding(false);
    }

    setDraft(blankDraft());
    setSaving(false);
  }

  function startEdit(item: ClothingItem) {
    setEditId(item.id);
    setDraft({ ...item });
    setAdding(true);
  }

  async function handleDelete(id: string) {
    await deleteItem(id);
  }

  async function toggleAvailable(item: ClothingItem) {
    await updateItem(item.id, { available: !item.available });
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Closet</h2>
          <p className="text-sm text-gray-500 mt-0.5">{myItems.length} item{myItems.length !== 1 ? 's' : ''} shared</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); setDraft(blankDraft()); }}
          className="flex items-center gap-1.5 bg-brand-400 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-2xl"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {adding && (
        <div className="card p-4 mb-5 border-brand-200 bg-brand-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{editId ? 'Edit item' : 'New item'}</h3>
            <button onClick={() => { setAdding(false); setEditId(null); setDraft(blankDraft()); }} className="text-gray-400"><X size={18} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <input className="input-field" placeholder="Item name *" value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            <textarea className="input-field resize-none" rows={2} placeholder="Description" value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
            <div className="flex gap-2">
              <select className="input-field flex-1" value={draft.category || 'tops'} onChange={e => setDraft(d => ({ ...d, category: e.target.value as ClothingItem['category'] }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <input className="input-field w-24" placeholder="Size *" value={draft.size || ''} onChange={e => setDraft(d => ({ ...d, size: e.target.value }))} />
            </div>
            <input className="input-field" placeholder="Image URL (optional)" value={draft.image_url || ''} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} />
            <button className="btn-primary" onClick={saveItem} disabled={!draft.name || !draft.size || saving}>
              <Check size={16} className="inline mr-1" />{saving ? 'Saving…' : editId ? 'Save changes' : 'Add to closet'}
            </button>
          </div>
        </div>
      )}

      {myItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👗</p>
          <p className="font-medium">Your closet is empty</p>
          <p className="text-sm mt-1">Add items so friends can borrow them</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myItems.map(item => (
            <div key={item.id} className="card flex gap-3 p-3">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {item.image_url
                  ? <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">{CATEGORY_EMOJI[item.category]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Size {item.size} · {item.category}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => startEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-600"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-orange-500"><Trash2 size={15} /></button>
                  </div>
                </div>
                {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>}
                <button
                  onClick={() => toggleAvailable(item)}
                  className={clsx(
                    'mt-2 text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                    item.available
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  )}
                >
                  {item.available ? '✓ Available' : '⏸ On loan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
