// src/features/students/components/StudentProfileTab.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Target,
  AlertTriangle,
  Edit3,
  Check,
  X,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  RotateCcw,
  Shield,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import {
  useStudent,
  useUpdateStudent,
  useSetStudentStatus,
  useDeleteStudent,
} from "@/features/students/hooks";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { parseApiError } from "@/services/api/error-handler";
import { StudentUpdateRequest } from "@/types/students";

interface StudentProfileTabProps {
  profileId: string;
}

const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required.").max(120, "Name is too long."),
  subject: z.string().min(1, "Subject is required.").max(80, "Subject is too long."),
  current_level: z.string().min(1, "Curriculum level is required.").max(80, "Level is too long."),
  learning_goals: z.string().optional(),
  weak_areas: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({ profileId }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Queries & Mutations
  const { data: student, isPending, isError, error, refetch } = useStudent(profileId);
  const updateMutation = useUpdateStudent();
  const setStatusMutation = useSetStudentStatus();
  const deleteMutation = useDeleteStudent();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  // Populate form with current values
  useEffect(() => {
    if (student) {
      reset({
        full_name: student.student_user?.full_name || "",
        subject: student.subject || "",
        current_level: student.current_level || "",
        learning_goals: student.learning_goals || "",
        weak_areas: student.weak_areas || "",
      });
    }
  }, [student, reset]);

  const handleCancelEdit = () => {
    if (student) {
      reset({
        full_name: student.student_user?.full_name || "",
        subject: student.subject || "",
        current_level: student.current_level || "",
        learning_goals: student.learning_goals || "",
        weak_areas: student.weak_areas || "",
      });
    }
    setIsEditing(false);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const payload: StudentUpdateRequest = {
        full_name: values.full_name.trim(),
        subject: values.subject.trim(),
        current_level: values.current_level.trim(),
        learning_goals: values.learning_goals?.trim() || "",
        weak_areas: values.weak_areas?.trim() || "",
      };

      await updateMutation.mutateAsync({
        profileId,
        payload,
      });

      toast.success("Academic profile updated.");
      setIsEditing(false);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to update profile.");
    }
  };

  const handleToggleStatus = async () => {
    if (!student) return;
    const currentStatus = student.student_user?.is_active ?? true;
    const targetStatus = !currentStatus;

    try {
      await setStatusMutation.mutateAsync({
        profileId,
        payload: { is_active: targetStatus },
      });
      toast.success(
        targetStatus
          ? "Student account activated."
          : "Student account deactivated."
      );
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Unable to update account status.");
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await deleteMutation.mutateAsync(profileId);
      toast.success("Student permanently deleted.");
      setIsDeleteDialogOpen(false);
      navigate("/dashboard/students", { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to delete student.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton                                                   */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error State                                                        */
  /* ------------------------------------------------------------------ */
  if (isError || !student) {
    return (
      <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
          <AlertTriangle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Unable to load academic profile
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
          {error instanceof Error ? error.message : "Profile details could not be retrieved."}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4 gap-1.5 text-xs">
          <RotateCcw size={13} />
          <span>Try again</span>
        </Button>
      </Card>
    );
  }

  const isActive = student.student_user?.is_active ?? true;

  return (
    <div className="space-y-6 select-none max-w-5xl">
      {/* 1. Academic Details Form & Section */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="p-6 space-y-6">
          {/* Header & Mode Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A] tracking-tight">
                Academic Profile & Curriculum
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Structured learning goals, level placement, and focus areas.
              </p>
            </div>

            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 text-xs font-semibold self-start sm:self-auto"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  className="text-xs"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={updateMutation.isPending || !isDirty}
                  className="gap-1.5 text-xs font-semibold min-w-[100px]"
                >
                  {updateMutation.isPending ? (
                    <>
                      <BrandLoader size="sm" variant="white" speed="fast" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Identity & Core Curriculum Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Student Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <User size={13} className="text-[#94A3B8]" />
                <span>Student Full Name</span>
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    disabled={updateMutation.isPending}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                      errors.full_name
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA]"
                    }`}
                    {...register("full_name")}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-[#DC2626] mt-1">{errors.full_name.message}</p>
                  )}
                </div>
              ) : (
                <div className="h-10 px-3 flex items-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-medium text-[#0F172A]">
                  {student.student_user?.full_name || "Unassigned"}
                </div>
              )}
            </div>

            {/* Registered Account Email (Immutable here) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <Mail size={13} className="text-[#94A3B8]" />
                <span>Account Email</span>
              </label>
              <div className="h-10 px-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#64748B]">
                <span className="truncate">{student.student_user?.email || "No email available"}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#E2E8F0] text-[#475569]">
                  Read only
                </span>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#94A3B8]" />
                <span>Primary Subject</span>
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    disabled={updateMutation.isPending}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                      errors.subject
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA]"
                    }`}
                    {...register("subject")}
                  />
                  {errors.subject && (
                    <p className="text-xs text-[#DC2626] mt-1">{errors.subject.message}</p>
                  )}
                </div>
              ) : (
                <div className="h-10 px-3 flex items-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-medium text-[#0F172A]">
                  {student.subject}
                </div>
              )}
            </div>

            {/* Current Curriculum Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <GraduationCap size={13} className="text-[#94A3B8]" />
                <span>Curriculum Level</span>
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    disabled={updateMutation.isPending}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                      errors.current_level
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA]"
                    }`}
                    {...register("current_level")}
                  />
                  {errors.current_level && (
                    <p className="text-xs text-[#DC2626] mt-1">{errors.current_level.message}</p>
                  )}
                </div>
              ) : (
                <div className="h-10 px-3 flex items-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-medium text-[#0F172A]">
                  {student.current_level}
                </div>
              )}
            </div>
          </div>

          {/* Qualitative Goals & Needs */}
          <div className="space-y-5 pt-3 border-t border-[#F1F5F9]">
            {/* Learning Goals */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <Target size={13} className="text-[#315FEA]" />
                <span>Long-term Learning Goals</span>
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  disabled={updateMutation.isPending}
                  placeholder="e.g. Master quadratic equations and prepare for mid-term board examinations."
                  className="w-full p-3 text-sm text-[#0F172A] bg-white rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] outline-none transition-colors resize-none"
                  {...register("learning_goals")}
                />
              ) : (
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
                  {student.learning_goals?.trim() || "No specific learning goals defined."}
                </div>
              )}
            </div>

            {/* Weak Areas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-[#D97706]" />
                <span>Identified Priority Focus & Weak Areas</span>
              </label>
              {isEditing ? (
                <textarea
                  rows={3}
                  disabled={updateMutation.isPending}
                  placeholder="e.g. Word problems, factoring polynomials, and algebraic fractions."
                  className="w-full p-3 text-sm text-[#0F172A] bg-white rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] outline-none transition-colors resize-none"
                  {...register("weak_areas")}
                />
              ) : (
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
                  {student.weak_areas?.trim() || "No priority focus areas identified."}
                </div>
              )}
            </div>
          </div>
        </Card>
      </form>

      {/* 2. Account Status & Governance */}
      <Card className="p-6 space-y-4">
        <div className="border-b border-[#F1F5F9] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#315FEA]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Account Status & Access</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isActive
                ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
            {isActive ? "Active Account" : "Deactivated"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-[#475569] max-w-xl leading-relaxed">
            {isActive
              ? "This student has full access to the student portal, scheduled sessions, and homework exercises."
              : "This account is deactivated. The student cannot log in to the portal or attend upcoming sessions."}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={setStatusMutation.isPending}
            className="gap-2 shrink-0 self-start sm:self-center"
          >
            {isActive ? (
              <>
                <UserX size={15} className="text-[#94A3B8]" />
                <span>Deactivate Account</span>
              </>
            ) : (
              <>
                <UserCheck size={15} className="text-[#16A34A]" />
                <span>Activate Account</span>
              </>
            )}
          </Button>
        </div>

        <div className="pt-3 border-t border-[#F8FAFC] flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span>Enrolled {format(parseISO(student.created_at), "MMM d, yyyy")}</span>
          </span>
          <span>Last modified {format(parseISO(student.updated_at), "MMM d, yyyy")}</span>
        </div>
      </Card>

      {/* 3. Danger Zone */}
      <Card className="p-6 border-red-200 bg-red-50/20 space-y-4">
        <div className="flex items-center gap-2 text-[#DC2626]">
          <Trash2 size={16} />
          <h3 className="text-sm font-semibold">Danger Zone</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed max-w-xl">
            Permanently delete this student profile, historical notes, session debriefs, and homework assignments. This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="gap-2 shrink-0 self-start sm:self-center"
          >
            <Trash2 size={14} />
            <span>Delete Student</span>
          </Button>
        </div>
      </Card>

      {/* 4. Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center border border-red-100">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h4 className="text-base font-semibold text-[#0F172A]">Delete student account permanently?</h4>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                You are about to permanently remove{" "}
                <strong className="text-[#0F172A]">{student.student_user?.full_name || "this student"}</strong>.
                All linked records, past sessions, live notes, and assigned tasks will be evicted.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteStudent}
                disabled={deleteMutation.isPending}
                className="gap-1.5"
              >
                {deleteMutation.isPending ? "Deleting…" : "Yes, Delete Student"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileTab;