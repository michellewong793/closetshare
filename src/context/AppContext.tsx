'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AppUser, Profile, ClothingItem, ClothingRequest, FriendWithItems, ClosetMember } from '@/types';

interface AppContextType {
  currentUser: AppUser | null;
  loading: boolean;

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
  refreshFriends: () => Promise<void>;

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

  const loadAllData = useCallback(async (userId: string) => {
    await Promise.all([
      loadMyItems(userId),
      loadRequests(userId),
      loadFriendsAndInvites(userId),
    ]);
  }, [loadMyItems, loadRequests, loadFriendsAndInvites]);

  // ─── Auth listener ─────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setCurrentUser({ id: session.user.id, email: session.user.email!, profile: profile as Profile });
          await loadAllData(session.user.id);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setCurrentUser({ id: session.user.id, email: session.user.email!, profile: profile as Profile });
          await loadAllData(session.user.id);
        }
      } else {
        setCurrentUser(null);
        setMyItems([]);
        setRequests([]);
        setFriends([]);
        setPendingInvites([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Item mutations ────────────────────────────────────────────────────────

  async function addItem(item: Omit<ClothingItem, 'id' | 'user_id' | 'created_at'>): Promise<string | null> {
    if (!currentUser) return null;
    const { data, error } = await supabase
      .from('clothing_items')
      .insert({ ...item, user_id: currentUser.id })
      .select()
      .single();
    if (error || !data) return null;
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

    const { error: insertError } = await supabase
      .from('closet_members')
      .insert({ owner_id: currentUser.id, member_id: profile.id });

    if (insertError) {
      if (insertError.code === '23505') return { error: 'Already invited or connected.' };
      return { error: insertError.message };
    }

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
  }

  return (
    <AppContext.Provider value={{
      currentUser, loading,
      myItems, addItem, updateItem, deleteItem,
      requests, createRequest, updateRequestStatus, refreshRequests,
      friends, pendingInvites, sendInvite, acceptInvite, refreshFriends,
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
