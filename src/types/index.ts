export interface Profile {
  id: string;
  username: string;
  full_name: string;
  phone_number: string;
  avatar_color: string;
  created_at: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories';
  size: string;
  available: boolean;
  image_url?: string;
  created_at: string;
}

export interface ClosetMember {
  id: string;
  owner_id: string;
  member_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  // joined
  profile?: Profile;
}

export interface ClothingRequest {
  id: string;
  requester_id: string;
  item_id: string;
  owner_id: string;
  message: string;
  status: 'pending' | 'approved' | 'declined' | 'returned';
  created_at: string;
  // joined fields
  item?: ClothingItem;
  requester?: Profile;
  owner?: Profile;
}

export interface AppUser {
  id: string;
  email: string;
  profile: Profile;
}

export interface FriendWithItems {
  id: string;
  email?: string;
  profile: Profile;
  items: ClothingItem[];
  connectedAt: string; // closet_members.created_at
}

export interface ItemRequest {
  id: string;
  requester_id: string;
  description: string;
  category?: string;
  size?: string;
  status: 'open' | 'fulfilled' | 'closed';
  created_at: string;
  // joined
  requester?: Profile;
}

/** @deprecated use AppUser */
export type MockUser = AppUser;
