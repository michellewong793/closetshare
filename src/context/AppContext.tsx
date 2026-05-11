'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppUser, Profile, Closet, ClosetMember, ClothingItem, ClothingRequest, FriendWithItems } from '@/types';

interface AppContextType {
  currentUser: AppUser | null;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<string | null>;

  // Closets
  closets: Closet[];
  pendingInvites: ClosetMember[];
  createCloset: (name: string) => Promise<Closet | null>;
  sendInvite: (username: string, closetId: string) => Promise<{ error: string | null }>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  refreshClosets: () => Promise<void>;

  // Derived from closets — unique friends across all shared closets
  friends: FriendWithItems[];

  myItems: ClothingItem[];
  addItem: (item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at'>) => Promise<string | null>;
  updateItem: (id: string, updates: Partial<ClothingItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  requests: ClothingRequest[];
  createRequest: (itemId: string, ownerId: string, message: string) => Promise<void>;
  updateRequestStatus: (id: string, status: ClothingRequest['status']) => Promise<void>;
  refreshRequests: () => Promise<void>;

  updateProfile: (updates: { full_name?: string; phone_number?: string }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [closets, setClosets] = useState<Closet[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ClosetMember[]>([]);
  const [friends, setFriends] = useState<FriendWithItems[]>([]);
  const [myItems, setMyItems] = useState<ClothingItem[]>([]);
  const [requests, setRequests] = useState<ClothingRequest[]>([]);

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
      .select(`*, item:clothing_items(*), requester:profiles!requester_id(*), owner:profiles!owner_id(*)`)
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    setRequests((data as ClothingRequest[]) ?? []);
  }, [supabase]);

  const loadClosetsAndFriends = useCallback(async (userId: string) => {
    // Load all closets where user is an accepted member (includes closets they own)
    const { data: memberRows, error } = await supabase
      .from('closet_members')
      .select('*, closet:closets(*)')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('[loadClosetsAndFriends] member query failed:', error.message);
      return;
    }

    // Load pending invites for the user
    const { data: pendingRows } = await supabase
      .from('closet_members')
      .select('*, closet:closets(*)')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const pendingWithProfiles: ClosetMember[] = await Promise.all(
      (pendingRows ?? []).map(async m => {
        const { data: closet } = await supabase
          .from('closets')
          .select('*, owner:profiles!owner_id(*)')
          .eq('id', m.closet_id)
          .single();
        return { ...m, closet: closet ?? m.closet };
      })
    );
    setPendingInvites(pendingWithProfiles);

    if (!memberRows || memberRows.length === 0) {
      setClosets([]);
      setFriends([]);
      return;
    }

    const closetIds = memberRows.map(m => m.closet_id);

    // For each closet the user is in, load all accepted members
    const { data: allMembers } = await supabase
      .from('closet_members')
      .select('*, profile:profiles(*)')
      .in('closet_id', closetIds)
      .eq('status', 'accepted');

    // Build closets with their members attached
    const closetMap = new Map<string, Closet>();
    for (const m of memberRows) {
      if (m.closet) {
        closetMap.set(m.closet_id, { ...m.closet, members: [] });
      }
    }
    for (const m of (allMembers ?? [])) {
      const closet = closetMap.get(m.closet_id);
      if (closet) {
        closet.members = [...(closet.members ?? []), m as ClosetMember];
      }
    }
    setClosets(Array.from(closetMap.values()));

    // Derive unique friends (accepted members sharing a closet, excluding self)
    const friendMap = new Map<string, FriendWithItems>();
    for (const m of (allMembers ?? [])) {
      if (m.user_id === userId || !m.profile) continue;
      if (!friendMap.has(m.user_id)) {
        friendMap.set(m.user_id, {
          id: m.user_id,
          profile: m.profile as Profile,
          items: [],
        });
      }
    }

    // Load items for each unique friend
    const friendList = await Promise.all(
      Array.from(friendMap.values()).map(async f => {
        const { data: items } = await supabase
          .from('clothing_items')
          .select('*')
          .eq('user_id', f.id)
          .order('created_at', { ascending: false });
        return { ...f, items: (items as ClothingItem[]) ?? [] };
      })
    );
    setFriends(friendList);
  }, [supabase]);

  const loadAllData = useCallback(async (userId: string) => {
    await Promise.all([
      loadMyItems(userId),
      loadRequests(userId),
      loadClosetsAndFriends(userId),
    ]);
  }, [loadMyItems, loadRequests, loadClosetsAndFriends]);

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

  // ─── Closet mutations ─────────────────────────────────────────────────────

  async function createCloset(name: string): Promise<Closet | null> {
    if (!currentUser) return null;

    const { data: closet, error } = await supabase
      .from('closets')
      .insert({ owner_id: currentUser.id, name })
      .select()
      .single();

    if (error || !closet) {
      console.error('[createCloset] failed:', error?.message);
      return null;
    }

    // Add owner as accepted member of their own closet
    await supabase.from('closet_members').insert({
      closet_id: closet.id,
      user_id: currentUser.id,
      status: 'accepted',
    });

    await loadClosetsAndFriends(currentUser.id);
    return closet as Closet;
  }

  async function sendInvite(username: string, closetId: string): Promise<{ error: string | null }> {
    if (!currentUser) return { error: 'Not logged in' };

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (lookupError || !profile) return { error: 'User not found. Ask them to sign up first.' };
    if (profile.id === currentUser.id) return { error: "You can't invite yourself." };

    // Check if already a member or invited
    const { data: existing } = await supabase
      .from('closet_members')
      .select('id, status')
      .eq('closet_id', closetId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      return { error: existing.status === 'accepted' ? 'Already a member of this closet.' : 'Invite already pending.' };
    }

    const { error: insertError } = await supabase
      .from('closet_members')
      .insert({ closet_id: closetId, user_id: profile.id, status: 'pending' });

    if (insertError) return { error: insertError.message };

    await loadClosetsAndFriends(currentUser.id);
    return { error: null };
  }

  async function acceptInvite(inviteId: string) {
    await supabase
      .from('closet_members')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
    if (currentUser) await loadClosetsAndFriends(currentUser.id);
  }

  async function declineInvite(inviteId: string) {
    await supabase.from('closet_members').delete().eq('id', inviteId);
    if (currentUser) await loadClosetsAndFriends(currentUser.id);
  }

  async function refreshClosets() {
    if (currentUser) await loadClosetsAndFriends(currentUser.id);
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
      console.error('[updateProfile] failed:', error.message, error.code);
      return error.message;
    }
    if (data) setCurrentUser(prev => prev ? { ...prev, profile: data as Profile } : prev);
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMyItems([]);
    setRequests([]);
    setClosets([]);
    setFriends([]);
    setPendingInvites([]);
  }

  return (
    <AppContext.Provider value={{
      currentUser, loading,
      signIn,
      closets, pendingInvites, createCloset, sendInvite, acceptInvite, declineInvite, refreshClosets,
      friends,
      myItems, addItem, updateItem, deleteItem,
      requests, createRequest, updateRequestStatus, refreshRequests,
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
