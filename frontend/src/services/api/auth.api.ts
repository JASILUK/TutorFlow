import { apiClient } from "./client";
import {
  AuthResponse,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  TokenRefreshResponse,
  User,
  GoogleConnectionStatusResponse
} from "@/types/auth";

export const loginApi = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
};

export const registerApi = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
  return data;
};

export const refreshSessionApi = async (): Promise<TokenRefreshResponse> => {
  const { data } = await apiClient.post<TokenRefreshResponse>("/auth/refresh");
  return data;
};

export const getMeApi = async (): Promise<User> => {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
};

export const logoutApi = async (): Promise<MessageResponse> => {
  const { data } = await apiClient.post<MessageResponse>("/auth/logout");
  return data;
};

export const logoutAllApi = async (): Promise<MessageResponse> => {
  const { data } = await apiClient.post<MessageResponse>("/auth/logout-all");
  return data;
};


export const googleAuthApi = {
  /**
   * Retrieves connection status and linked email for the current user.
   * GET /auth/google/status
   */
  getStatus: async (): Promise<GoogleConnectionStatusResponse> => {
    const { data } = await apiClient.get<GoogleConnectionStatusResponse>(
      "/auth/google/status"
    );
    return data;
  },

  /**
   * Generates the backend authorization URL to redirect the window to Google's consent screen.
   * GET /auth/google/authorize
   */
  getAuthorizeUrl: async (): Promise<{ url: string }> => {
    // No redirectUri parameter needed anymore as the backend handles it via settings
    const { data } = await apiClient.get<{ url: string }>(
      "/auth/google/authorize"
    );
    return data;
  },
};