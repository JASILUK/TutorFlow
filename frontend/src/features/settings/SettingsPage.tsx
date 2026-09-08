// src/pages/SettingsPage.tsx
import React, { useEffect, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Mail,
  Shield,
  Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { useChangePasswordMutation } from "@/features/auth/hooks/useChangePasswordMutation";
import { useGoogleConnectionStatus } from "@/features/settings/hooks/useGoogleAuth"; // adjust path if needed
import { googleAuthApi } from "@/services/api/auth.api";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required."),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    confirm_password: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const changePasswordMutation = useChangePasswordMutation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  // 1. Fetch live Google OAuth status from backend
  const {
    data: googleStatus,
    isPending: isGoogleStatusPending,
    refetch: refetchGoogleStatus,
  } = useGoogleConnectionStatus();

  // 2. Handle ?google=connected callback from backend redirect
  useEffect(() => {
    if (searchParams.get("google") === "connected") {
      toast.success("Google account successfully connected.");
      refetchGoogleStatus();

      // Clean the query param from URL without page reload
      startTransition(() => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("google");
          return next;
        }, { replace: true });
      });
    }
  }, [searchParams, refetchGoogleStatus, setSearchParams]);

  // 3. Form handling for password update
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitPassword = async (values: PasswordFormValues) => {
    try {
      await changePasswordMutation.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      reset();
    } catch {
      // Handled by toast in mutation
    }
  };

  // 4. Trigger OAuth consent flow (Updated to call without arguments)
  const handleConnectGoogle = async () => {
    try {
      // Fetch the authorization URL securely from the backend
      const response = await googleAuthApi.getAuthorizeUrl();
      
      if (response && response.url) {
        // Redirect the browser to Google securely
        window.location.href = response.url;
      } else {
        toast.error("Invalid response from server.");
      }
    } catch (error) {
      toast.error("Failed to initialize Google connection.");
      console.error("Google Auth Init Error:", error);
    }
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TF";

  const isSubmittingPassword = changePasswordMutation.isPending;
  const isGoogleConnected = Boolean(googleStatus?.connected);

  return (
    <PageContainer>
      <PageHeader
        title="Account & Settings"
        description="Manage your credentials, connected services, and account session."
      />

      <div className="max-w-4xl space-y-6 select-none">
        {/* 1. Profile Identity Summary */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center font-bold text-lg">
                {initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#0F172A] truncate">
                    {user?.full_name || "User"}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] uppercase border border-[#E2E8F0]">
                    <Shield size={11} className="text-[#315FEA]" />
                    {user?.role || "Tutor"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <Mail size={13} className="text-[#94A3B8]" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>
            </div>

            {user?.created_at && (
              <div className="text-left sm:text-right text-xs text-[#94A3B8] flex items-center sm:justify-end gap-1.5">
                <Calendar size={13} />
                <span>Member since {format(parseISO(user.created_at), "MMM yyyy")}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Security: Change Password */}
        <Card className="p-6 space-y-5">
          <div className="border-b border-[#F1F5F9] pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#315FEA] flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Change Password</h3>
                <p className="text-xs text-[#64748B]">
                  Ensure your account uses a secure password of at least 8 characters.
                </p>
              </div>
            </div>
            <Lock size={15} className="text-[#94A3B8]" />
          </div>

          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4 max-w-lg" noValidate>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Current Password <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                disabled={isSubmittingPassword}
                className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                  errors.current_password
                    ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                }`}
                {...register("current_password")}
              />
              {errors.current_password && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.current_password.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  New Password <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  disabled={isSubmittingPassword}
                  className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                    errors.new_password
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("new_password")}
                />
                {errors.new_password && (
                  <p className="text-xs text-[#DC2626] font-medium">
                    {errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Confirm Password <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  disabled={isSubmittingPassword}
                  className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                    errors.confirm_password
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-xs text-[#DC2626] font-medium">
                    {errors.confirm_password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingPassword}
                className="gap-2 text-xs font-semibold min-w-[140px] h-9"
              >
                {isSubmittingPassword ? (
                  <>
                    <BrandLoader size="sm" variant="white" speed="fast" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* 3. Connected Services: Google OAuth Integration */}
        <Card className="p-6 space-y-4">
          <div className="border-b border-[#F1F5F9] pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Connected Services</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Connect your Google account to automatically sync Google Meet links and calendar schedules.
              </p>
            </div>
            <span className="text-[11px] font-mono uppercase bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] px-2 py-0.5 rounded">
              OAuth 2.0
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#0F172A]">Google Workspace</h4>

                  {isGoogleStatusPending ? (
                    <Skeleton className="h-4 w-20 rounded" />
                  ) : isGoogleConnected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.2 rounded">
                      <CheckCircle2 size={10} /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.2 rounded">
                      Not connected
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#64748B]">
                  {isGoogleConnected && googleStatus?.email ? (
                    <span className="font-mono text-[#0F172A]">{googleStatus.email}</span>
                  ) : (
                    "Google Calendar & Google Meet synchronization"
                  )}
                </p>
              </div>
            </div>

            {/* Action button */}
            {isGoogleStatusPending ? (
              <Skeleton className="h-8 w-28 rounded-lg shrink-0" />
            ) : isGoogleConnected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConnectGoogle}
                className="gap-1.5 text-xs font-semibold shrink-0 text-[#64748B] hover:text-[#0F172A]"
              >
                <span>Reconnect</span>
                <ExternalLink size={12} />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConnectGoogle}
                className="gap-1.5 text-xs font-semibold shrink-0 shadow-xs"
              >
                <span>Connect Google</span>
                <ExternalLink size={12} />
              </Button>
            )}
          </div>

          <p className="text-[11px] text-[#94A3B8]">
            Authorizing Google allows TutorFlow to create Google Meet links and sync session schedules to your Google Calendar.
          </p>
        </Card>

        {/* 4. Session & Logout */}
        <Card className="p-6 border-red-100 bg-red-50/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[#0F172A]">Sign Out</h3>
              <p className="text-xs text-[#64748B]">
                Log out of your current session on this device.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              className="gap-2 text-xs font-semibold text-[#DC2626] border-red-200 hover:bg-red-50 shrink-0 self-start sm:self-auto"
            >
              <LogOut size={14} />
              <span>{logoutMutation.isPending ? "Signing out…" : "Sign Out"}</span>
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;