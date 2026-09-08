export type UserRole = "admin" | "tutor" | "student";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User; // <-- Matched to backend
}

export interface MessageResponse {
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}



// src/types/googleAuth.ts
export interface GoogleConnectionStatusResponse {
  connected: boolean;
  email: string | null;
  expires_at: string | null; // ISO timestamp
}