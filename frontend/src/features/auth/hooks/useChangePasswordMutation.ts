import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { apiClient } from "@/services/api/client";

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc: string[] }>;
  message?: string;
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as ApiErrorResponse;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail[0].msg;
    }
    if (data.message) return data.message;
  }
  return fallback;
};

export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const { data } = await apiClient.post<{ message: string }>("/auth/change-password", payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Password updated successfully.");
    },
    onError: (error) => {
      const message = extractErrorMessage(error, "Failed to change password. Verify your current password.");
      toast.error(message);
    },
  });
};