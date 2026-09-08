  import { useMutation, useQueryClient } from "@tanstack/react-query";
  import { useNavigate, useLocation } from "react-router-dom";
  import { toast } from "sonner";
  import { AxiosError } from "axios";
  import { useAuth } from "@/contexts/AuthContext";
  import { LoginPayload, RegisterPayload } from "@/types/auth";

  interface ApiErrorResponse {
    detail?: string | Array<{ msg: string; loc: string[] }>;
    message?: string;
  }

  // Helper to extract clean error messages from FastAPI responses
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

  export const useLoginMutation = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return useMutation({
      mutationFn: (credentials: LoginPayload) => login(credentials),
      onSuccess: (user) => {
        toast.success(`Welcome back, ${user.full_name}!`);
        
        // Redirect to the page they tried visiting before being bounced, or fallback to dashboard
        const origin = (location.state as { from?: { pathname: string } })?.from?.pathname;
        const target = origin || (user.role === "student" ? "/portal" : "/dashboard");
        navigate(target, { replace: true });
      },
      onError: (error) => {
        const message = extractErrorMessage(error, "Invalid email or password. Please try again.");
        toast.error(message);
      },
    });
  };

  export const useRegisterMutation = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    return useMutation({
      mutationFn: (payload: RegisterPayload) => register(payload),
      onSuccess: (user) => {
        toast.success("Account created successfully!");
        const target = user.role === "student" ? "/portal" : "/dashboard";
        navigate(target, { replace: true });
      },
      onError: (error) => {
        const message = extractErrorMessage(error, "Registration failed. Please check your details.");
        toast.error(message);
      },
    });
  };

  export const useLogoutMutation = () => {
    const { logout } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
      mutationFn: () => logout(),
      onSuccess: () => {
        // Clear entire TanStack Query cache so subsequent users don't see previous cache
        queryClient.clear();
        toast.info("You have been signed out.");
        navigate("/login", { replace: true });
      },
      onError: () => {
        // Even if network fails, logout cleans up frontend auth context
        queryClient.clear();
        navigate("/login", { replace: true });
      },
    });
  };