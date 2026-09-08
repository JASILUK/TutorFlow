// src/features/students/components/CreateStudentModal.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useCreateStudent } from "../hooks";
import { parseApiError, applyFieldErrors } from "@/services/api/error-handler";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Button } from "@/components/ui/core-primitives";
import { StudentCreateRequest } from "@/types/students";

const createStudentSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must not exceed 100 characters."),
  email: z
    .string()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must not exceed 128 characters."),
  subject: z
    .string()
    .min(2, "Subject must be at least 2 characters.")
    .max(100, "Subject must not exceed 100 characters."),
  current_level: z
    .string()
    .min(1, "Current level is required.")
    .max(50, "Current level must not exceed 50 characters."),
  learning_goals: z
    .string()
    .max(2000, "Learning goals must not exceed 2000 characters.")
    .optional(),
  weak_areas: z
    .string()
    .max(2000, "Weak areas must not exceed 2000 characters.")
    .optional(),
});

type CreateStudentFormValues = z.infer<typeof createStudentSchema>;

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const createStudentMutation = useCreateStudent();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      subject: "",
      current_level: "",
      learning_goals: "",
      weak_areas: "",
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (createStudentMutation.isPending) return;
    setFormError(null);
    reset();
    onClose();
  };

  const onSubmit = async (values: CreateStudentFormValues) => {
    setFormError(null);
    try {
      const payload: StudentCreateRequest = {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        subject: values.subject.trim(),
        current_level: values.current_level.trim(),
        learning_goals: values.learning_goals?.trim() || "",
        weak_areas: values.weak_areas?.trim() || "",
      };

      await createStudentMutation.mutateAsync(payload);
      toast.success("Student created successfully.");
      reset();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        applyFieldErrors(parsed.fieldErrors, setError);
      } else {
        setFormError(
          parsed.message || "Failed to create student. Please verify your details."
        );
      }
    }
  };

  const isSubmitting = createStudentMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-student-title"
    >
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h3
              id="create-student-title"
              className="text-lg font-semibold text-[#0F172A] leading-tight"
            >
              Create student
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Add a student account and their learning profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
          noValidate
        >
          <div className="px-6 py-5 overflow-y-auto space-y-4">
            {formError && (
              <div
                className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium"
                role="alert"
              >
                {formError}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="full_name"
                className="text-xs font-medium text-[#0F172A]"
              >
                Full name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                placeholder="e.g. Alex Johnson"
                disabled={isSubmitting}
                className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 ${
                  errors.full_name
                    ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                }`}
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-[#0F172A]"
              >
                Email address <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="alex@example.com"
                disabled={isSubmitting}
                className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 ${
                  errors.email
                    ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                }`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-[#0F172A]"
              >
                Initial password <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  disabled={isSubmitting}
                  className={`w-full h-10 pl-3 pr-10 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 ${
                    errors.password
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 p-1 text-[#94A3B8] hover:text-[#475569] rounded"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Subject & Level Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="subject"
                  className="text-xs font-medium text-[#0F172A]"
                >
                  Subject <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="subject"
                  type="text"
                  placeholder="e.g. Mathematics"
                  disabled={isSubmitting}
                  className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 ${
                    errors.subject
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("subject")}
                />
                {errors.subject && (
                  <p className="text-xs text-[#DC2626] font-medium">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="current_level"
                  className="text-xs font-medium text-[#0F172A]"
                >
                  Current level <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="current_level"
                  type="text"
                  placeholder="e.g. Grade 10 / Intermediate"
                  disabled={isSubmitting}
                  className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 ${
                    errors.current_level
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("current_level")}
                />
                {errors.current_level && (
                  <p className="text-xs text-[#DC2626] font-medium">
                    {errors.current_level.message}
                  </p>
                )}
              </div>
            </div>

            {/* Learning Goals */}
            <div className="space-y-1.5">
              <label
                htmlFor="learning_goals"
                className="text-xs font-medium text-[#0F172A]"
              >
                Learning goals <span className="text-[#94A3B8]">(Optional)</span>
              </label>
              <textarea
                id="learning_goals"
                rows={2}
                placeholder="Core target milestones, exam preparations, or syllabus focus..."
                disabled={isSubmitting}
                className="w-full p-2.5 text-sm text-[#0F172A] bg-white rounded-lg border border-[#E2E8F0] outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 resize-none"
                {...register("learning_goals")}
              />
              {errors.learning_goals && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.learning_goals.message}
                </p>
              )}
            </div>

            {/* Weak Areas */}
            <div className="space-y-1.5">
              <label
                htmlFor="weak_areas"
                className="text-xs font-medium text-[#0F172A]"
              >
                Areas for improvement <span className="text-[#94A3B8]">(Optional)</span>
              </label>
              <textarea
                id="weak_areas"
                rows={2}
                placeholder="Topics requiring foundational revision or recurring friction points..."
                disabled={isSubmitting}
                className="w-full p-2.5 text-sm text-[#0F172A] bg-white rounded-lg border border-[#E2E8F0] outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors placeholder:text-[#94A3B8] disabled:opacity-65 resize-none"
                {...register("weak_areas")}
              />
              {errors.weak_areas && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.weak_areas.message}
                </p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="gap-2 min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Creating…</span>
                </>
              ) : (
                <span>Create student</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};