export type Role = 'admin' | 'manager' | 'employee';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number | string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  department?: string;
  status: UserStatus;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  user: Omit<User, 'password'>;
  expiresAt: number;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  identifier?: string;
  role?: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phone?: string;
  department?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordPayload {
  email: string;
  newPassword: string;
}
