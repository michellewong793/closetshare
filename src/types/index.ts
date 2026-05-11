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

export interface Closet {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  // joined
  members?: ClosetMember[];
}

export interface ClosetMember {
  id: string;
  closet_id: string;
  user_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  // joined
  profile?: Profile;
  closet?: Closet;
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
  profile: Profile;
  items: ClothingItem[];
}
