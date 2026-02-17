export interface User {
  id: string;
  email: string;
  nickname: string;
  name: string;
  timezone: string;
  location?: string;
  language: string;
  theme?: 'light' | 'dark';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  twoFactorEnabled?: boolean;
  avatarUrl?: string;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}
