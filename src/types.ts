export type UserRole = 'admin' | 'user';

export interface UserTheme {
  primaryColor: string;
  secondaryColor: string;
  glassmorphism: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  role: UserRole;
  createdAt: number;
  theme?: UserTheme;
}

export interface CalendarPin {
  id: string;
  userId: string;
  title: string;
  date: string; // ISO string
  time?: string;
  imageUrl?: string;
  originalUrl?: string;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  createdAt: number;
}

export interface ResetRequest {
  id: string;
  username: string;
  email: string;
  status: 'pending' | 'completed';
  createdAt: number;
}

export interface ContactMessage {
  id: string;
  userId: string;
  username: string;
  email: string;
  message: string;
  createdAt: number;
}

export interface AdminSettings {
  contactRecipientEmail: string;
  appBannerUrl?: string;
}

export type ViewMode = 'calendar' | 'timeline' | 'sketch' | 'board';
