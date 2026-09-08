// src/features/auth/hooks/useGoogleAuth.ts
import { useQuery } from "@tanstack/react-query";
import { googleAuthApi } from "@/services/api/auth.api";
import { GoogleConnectionStatusResponse } from "@/types/auth";

export const googleAuthKeys = {
  all: ["googleAuth"] as const,
  status: () => [...googleAuthKeys.all, "status"] as const,
};

/**
 * Hook to retrieve Google OAuth connection status.
 */
export const useGoogleConnectionStatus = () => {
  return useQuery<GoogleConnectionStatusResponse>({
    queryKey: googleAuthKeys.status(),
    queryFn: () => googleAuthApi.getStatus(),
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
};