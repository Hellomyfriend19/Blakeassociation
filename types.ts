
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  balance: number;
  reputation: number;
  createdAt: string;
  lastLogin: string;
  vip_until?: string; // ISO Date
  is_banned?: number; // 0 or 1
  cosmetics?: {
    nameColor?: string;
    title?: string;
    frame?: string;
  };
  // Exposed for Admin Panel visibility as requested
  password?: string;
  pin?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string; // Denormalized for simpler display
  receiverName: string; // Denormalized for simpler display
  amount: number;
  type: 'transfer' | 'system_reward' | 'admin_adjustment' | 'marketplace_purchase' | 'burn_shop_vip' | 'burn_shop_cosmetic' | 'burn_fee' | 'burn_boost';
  timestamp: string;
  note?: string;
}

export interface Listing {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description?: string; // Optional because it might be locked
  price: number;
  created_at: string;
  isLocked: boolean; // Computed by backend
  isAuthor: boolean; // Computed by backend
  isBoosted: boolean; // Computed by backend
  boost_until?: string;
}

export interface Question {
  id: string;
  author_id: string; // Hidden if anonymous
  author_name?: string; // Null if anonymous
  title: string;
  description: string;
  reward_points: number;
  is_anonymous: number; // 0 or 1
  created_at: string;
  accepted_answer_id?: string;
  answer_count: number;
  score: number;
  user_vote?: number; // 1, -1, or undefined
}

export interface Answer {
  id: string;
  question_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  is_anonymous: number;
  created_at: string;
  score: number;
  user_vote?: number;
}

export interface SystemStats {
  totalUsers: number;
  totalVolume: number;
  activeUsers24h: number;
  systemBalance: number;
}