'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppUser, Profile, ClothingItem, ClothingRequest, FriendWithItems, ClosetMember, ItemRequest } from '@/types';

interface AppContextType {
  currentUser: AppUser | null;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<string | null>;

  myItems: ClothingItem[];
  addItem: (item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at'>) => Promise<string | null>;
  updateItem: (id: string, updates: Partial<ClothingItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  requests: ClothingRequest[];
  createRequest: (itemId: string, ownerId: string, message: string) => Promise<void>;
  updateRequestStatus: (id: string, status: ClothingRequest['status']) => Promise<void>;
  refreshRequests: () => Promise<void>;

  friends: FriendWithItems[];
  pendingInvites: ClosetMember[];
  sendInvite: (username: string) => Promise<{ error: string | null }>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  refreshFriends: () => Promise<void>;

  itemRequests: ItemRequest[];
  unreadItemRequestCount: number;
  createItemRequest: (description: string, category?: string, size?: string, referenceUrl?: string, photoUrl?: string) => Promise<void>;
  closeItemRequest: (id: string) => Promise<void>;
  markItemRequestsRead: () => Promise<void>;

  updateProfile: (updates: { full_name?: string; phone_number?: string }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [myItems, setMyItems] = useState<ClothingItem[]>([]);
  const [requests, setRequests] = useState<ClothingRequest[]>([]);
  const [friends, setFriends] = useState<FriendWithItems[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ClosetMember[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [unreadItemRequestCount, setUnreadItemRequestCount] = useState(0);

  // ─── Data loaders ──────────────────────────────────────────────────────────

  const loadMyItems = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setMyItems((data as ClothingItem[]) ?? []);
  }, [supabase]);

  const loadRequests = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('clothing_requests')
      .select(`
        *,
        item:clothing_items(*),
        requester:profiles!requester_id(*),
        owner:profiles!owner_id(*)
      `)
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    setRequests((data as ClothingRequest[]) ?? []);
  }, [supabase]);

  const loadFriendsAndInvites = useCallback(async (userId: string) => {
    const { data: members, error } = await supabase
      .from('closet_members')
      .select('*')
      .or(`owner_id.eq.${userId},member_id.eq.${userId}`);

    if (error) {
      console.error('[loadFriendsAndInvites] query failed:', error.message, error.code);
      return;
    }
    if (!members) return;

    const accepted = members.filter(m => m.status === 'accepted');
    // All pending invites (both sent and received)
    const pending = members.filter(m => m.status === 'pending');

    // Build pending invites with the other person's profile
    const pendingWithProfiles: ClosetMember[] = await Promise.all(
      pending.map(async m => {
        const otherId = m.owner_id === userId ? m.member_id : m.owner_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();
        return { ...m, profile: profile as Profile };
      })
    );
    setPendingInvites(pendingWithProfiles);

    // Build friends list with items
    const friendProfiles: FriendWithItems[] = await Promise.all(
      accepted.map(async m => {
        const friendId = m.owner_id === userId ? m.member_id : m.owner_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', friendId)
          .single();
        const { data: items } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('user_id', friendId)
          .order('created_at', { ascending: false });
        return {
          id: friendId,
          profile: profile as Profile,
          items: (items as ClothingItem[]) ?? [],
          connectedAt: m.created_at,
        };
      })
    );
    setFriends(friendProfiles);
  }, [supabase]);

  const loadItemRequests = useCallback(async (userId: string) => {
    const [{ data: reqs }, { data: reads }] = await Promise.all([
      supabase
        .from('item_requests')
        .select('*, requester:profiles!requester_id(*)')
        .eq('status', 'open')
        .order('created_at', { ascending: false }),
      supabase
        .from('item_request_reads')
        .select('item_request_id')
        .eq('user_id', userId),
    ]);
    const readIds = new Set((reads ?? []).map((r: { item_request_id: string }) => r.item_request_id));
    const list = (reqs as ItemRequest[]) ?? [];
    setItemRequests(list);
    setUnreadItemRequestCount(list.filter(r => r.requester_id !== userId && !readIds.has(r.id)).length);
  }, [supabase]);

  const loadAllData = useCallback(async (userId: string) => {
    await Promise.all([
      loadMyItems(userId),
      loadRequests(userId),
      loadFriendsAndInvites(userId),
      loadItemRequests(userId),
    ]);
  }, [loadMyItems, loadRequests, loadFriendsAndInvites, loadItemRequests]);

  // ─── Auth init ────────────────────────────────────────────────────────────

  function applyUser(user: { id: string; email?: string; created_at: string; user_metadata?: Record<string, string> }) {
    const meta = user.user_metadata ?? {};
    const fallbackUsername = (user.email ?? '').split('@')[0];
    setCurrentUser({
      id: user.id,
      email: user.email ?? '',
      profile: {
        id: user.id,
        full_name: meta.full_name ?? fallbackUsername,
        username: meta.username ?? fallbackUsername,
        avatar_color: 'bg-yellow-300',
        phone_number: meta.phone_number ?? '',
        created_at: user.created_at,
      },
    });
    // Upsert profile in case the signup trigger didn't fire
    supabase.from('profiles')
      .upsert({
        id: user.id,
        username: meta.username ?? fallbackUsername,
        full_name: meta.full_name ?? fallbackUsername,
      }, { onConflict: 'id', ignoreDuplicates: true })
      .then(() =>
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data: p }) => { if (p) setCurrentUser(prev => prev ? { ...prev, profile: p as Profile } : prev); })
      );
    loadAllData(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) applyUser(session.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (data.user) applyUser(data.user);
    return null;
  }

  // ─── Item mutations ────────────────────────────────────────────────────────

  async function addItem(item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at'>): Promise<string | null> {
    if (!currentUser) return null;
    const { data, error } = await supabase
      .from('clothing_items')
      .insert({ ...item, user_id: currentUser.id })
      .select()
      .single();
    if (error) { console.error('[addItem] insert failed:', error.message, error.code, error.details); return null; }
    if (!data) return null;
    setMyItems(prev => [data as ClothingItem, ...prev]);
    return data.id;
  }

  async function updateItem(id: string, updates: Partial<ClothingItem>) {
    const { data } = await supabase
      .from('clothing_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data) setMyItems(prev => prev.map(i => i.id === id ? data as ClothingItem : i));
  }

  async function deleteItem(id: string) {
    await supabase.from('clothing_items').delete().eq('id', id);
    setMyItems(prev => prev.filter(i => i.id !== id));
  }

  // ─── Request mutations ─────────────────────────────────────────────────────

  async function createRequest(itemId: string, ownerId: string, message: string) {
    if (!currentUser) return;
    const { data } = await supabase
      .from('clothing_requests')
      .insert({ requester_id: currentUser.id, item_id: itemId, owner_id: ownerId, message })
      .select(`*, item:clothing_items(*), requester:profiles!requester_id(*), owner:profiles!owner_id(*)`)
      .single();
    if (data) setRequests(prev => [data as ClothingRequest, ...prev]);
  }

  async function updateRequestStatus(id: string, status: ClothingRequest['status']) {
    const { data } = await supabase
      .from('clothing_requests')
      .update({ status })
      .eq('id', id)
      .select(`*, item:clothing_items(*), requester:profiles!requester_id(*), owner:profiles!owner_id(*)`)
      .single();
    if (data) setRequests(prev => prev.map(r => r.id === id ? data as ClothingRequest : r));
  }

  async function refreshRequests() {
    if (currentUser) await loadRequests(currentUser.id);
  }

  async function refreshFriends() {
    if (currentUser) await loadFriendsAndInvites(currentUser.id);
  }

  // ─── Friend / invite mutations ─────────────────────────────────────────────

  async function sendInvite(username: string): Promise<{ error: string | null }> {
    if (!currentUser) return { error: 'Not logged in' };

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (lookupError || !profile) return { error: 'User not found. Ask them to sign up first.' };
    if (profile.id === currentUser.id) return { error: "You can't invite yourself." };

    // Check both directions to prevent duplicate connections
    const { data: existing } = await supabase
      .from('closet_members')
      .select('id, status')
      .or(
        `and(owner_id.eq.${currentUser.id},member_id.eq.${profile.id}),and(owner_id.eq.${profile.id},member_id.eq.${currentUser.id})`
      )
      .maybeSingle();

    if (existing) {
      return { error: existing.status === 'accepted' ? 'Already connected.' : 'Invite already sent or pending.' };
    }

    const { error: insertError } = await supabase
      .from('closet_members')
      .insert({ owner_id: currentUser.id, member_id: profile.id });

    if (insertError) return { error: insertError.message };

    await loadFriendsAndInvites(currentUser.id);
    return { error: null };
  }

  async function acceptInvite(inviteId: string) {
    await supabase
      .from('closet_members')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
    if (currentUser) await loadFriendsAndInvites(currentUser.id);
  }

  async function declineInvite(inviteId: string) {
    await supabase
      .from('closet_members')
      .delete()
      .eq('id', inviteId);
    if (currentUser) await loadFriendsAndInvites(currentUser.id);
  }

  // ─── Item request mutations ────────────────────────────────────────────────

  async function createItemRequest(description: string, category?: string, size?: string, referenceUrl?: string, photoUrl?: string) {
    if (!currentUser) return;
    const { data } = await supabase
      .from('item_requests')
      .insert({
        requester_id: currentUser.id,
        description,
        category: category || null,
        size: size || null,
        reference_url: referenceUrl || null,
        photo_url: photoUrl || null,
      })
      .select('*, requester:profiles!requester_id(*)')
      .single();
    if (data) setItemRequests(prev => [data as ItemRequest, ...prev]);
  }

  async function closeItemRequest(id: string) {
    await supabase.from('item_requests').update({ status: 'closed' }).eq('id', id);
    setItemRequests(prev => prev.filter(r => r.id !== id));
  }

  async function markItemRequestsRead() {
    if (!currentUser || itemRequests.length === 0) return;
    const toMark = itemRequests.filter(r => r.requester_id !== currentUser.id);
    if (toMark.length === 0) return;
    await supabase.from('item_request_reads').upsert(
      toMark.map(r => ({ item_request_id: r.id, user_id: currentUser.id })),
      { onConflict: 'item_request_id,user_id', ignoreDuplicates: true }
    );
    setUnreadItemRequestCount(0);
  }

  // ─── Profile mutations ─────────────────────────────────────────────────────

  async function updateProfile(updates: { full_name?: string; phone_number?: string }): Promise<string | null> {
    if (!currentUser) return 'Not logged in';
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();
    if (error) {
      console.error('[updateProfile] failed:', error.message, error.code, error.details);
      return error.message;
    }
    if (data) {
      setCurrentUser(prev => prev ? { ...prev, profile: data as Profile } : prev);
    }
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMyItems([]);
    setRequests([]);
    setFriends([]);
    setPendingInvites([]);
    setItemRequests([]);
    setUnreadItemRequestCount(0);
  }

  return (
    <AppContext.Provider value={{
      currentUser, loading,
      signIn,
      myItems, addItem, updateItem, deleteItem,
      requests, createRequest, updateRequestStatus, refreshRequests,
      friends, pendingInvites, sendInvite, acceptInvite, declineInvite, refreshFriends,
      itemRequests, unreadItemRequestCount, createItemRequest, closeItemRequest, markItemRequestsRead,
      updateProfile, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
