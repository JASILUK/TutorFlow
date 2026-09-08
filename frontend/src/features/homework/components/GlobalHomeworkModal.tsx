// src/features/homework/components/GlobalHomeworkModal.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle, Calendar, Video } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { useCreateHomework, useUpdateHomework } from "@/features/homework/hooks/useHomework";
import { useSessions } from "@/features/sessions/hooks/useSessions";
import { Button } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { parseApiError } from "@/services/api/error-handler";
import { HomeworkTaskResponse } from "@/types/homework";

const homeworkFormSchema = z.object({
  session_id: z.string().min(1, "Please select an associated lesson session."),
  title: z.string().min(1, "Title is required.").max(200, "Title must not exceed 200 characters."),
  description: z.string().min(1, "Instructions and task details are required."),
});

type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

interface GlobalHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: HomeworkTaskResponse | null;
}

export const GlobalHomeworkModal: React.FC<GlobalHomeworkModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
}) => {
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(taskToEdit);
  const createMutation = useCreateHomework();
  const updateMutation = useUpdateHomework();

  // Load available sessions for association during creation
  const { data: sessions = [], isPending: isLoadingSessions } = useSessions(
    !isEditing ? { limit: 100 } : undefined
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkFormSchema),
    defaultValues: {
      session_id: "",
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (taskToEdit) {
      reset({
        session_id: taskToEdit.session_id,
        title: taskToEdit.title,
        description: taskToEdit.description,
      });
    } else {
      reset({
        session_id: "",
        title: "",
        description: "",
      });
    }
    setFormError(null);
  }, [taskToEdit, reset, isOpen]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    if (isSubmitting) return;
    setFormError(null);
    onClose();
  };

  const onSubmit = async (values: HomeworkFormValues) => {
    setFormError(null);
    try {
      if (isEditing && taskToEdit) {
        await updateMutation.mutateAsync({
          homeworkId: taskToEdit.id,
          sessionId: taskToEdit.session_id,
          payload: {
            title: values.title.trim(),
            description: values.description.trim(),
          },
        });
        toast.success("Assignment updated.");
      } else {
        await createMutation.mutateAsync({
          session_id: values.session_id,
          title: values.title.trim(),
          description: values.description.trim(),
        });
        toast.success("Assignment created and assigned.");
      }
      handleClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.message || "Failed to save homework assignment.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-homework-title"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 id="global-homework-title" className="text-base font-semibold text-[#0F172A]">
              {isEditing ? "Edit Homework Assignment" : "Assign Homework"}
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isEditing
                ? "Update instructions or title for this assignment."
                : "Create a follow-up assignment tied directly to an existing lesson."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto" noValidate>
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Session Selector (Disabled if editing) */}
          <div className="space-y-1.5">
            <label
              htmlFor="hw-session"
              className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
            >
              Session <span className="text-[#DC2626]">*</span>
            </label>
            {isEditing ? (
              <div className="h-10 px-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A] truncate">
                  {taskToEdit?.session?.topic || "Assigned Session"}
                </span>
                <span className="font-mono text-[10px] text-[#94A3B8]">Bound to session</span>
              </div>
            ) : (
              <div>
                <select
                  id="hw-session"
                  disabled={isSubmitting || isLoadingSessions}
                  className={`w-full h-10 px-3 text-xs sm:text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 cursor-pointer ${
                    errors.session_id
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("session_id")}
                >
                  <option value="">Choose a session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_name || "Student"} — {s.topic} (
                      {format(parseISO(s.scheduled_start), "MMM d")})
                    </option>
                  ))}
                </select>
                {errors.session_id && (
                  <p className="text-xs text-[#DC2626] font-medium mt-1">
                    {errors.session_id.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="hw-title"
              className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
            >
              Assignment Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="hw-title"
              type="text"
              placeholder="e.g. Differentiation Problem Set & Chapter Review"
              disabled={isSubmitting}
              className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                errors.title
                  ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                  : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
              }`}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-[#DC2626] font-medium">{errors.title.message}</p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label
              htmlFor="hw-description"
              className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
            >
              Task Instructions & Exercises <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              id="hw-description"
              rows={4}
              placeholder="Specify the exercises, page numbers, links, or questions to complete before the next session..."
              disabled={isSubmitting}
              className={`w-full p-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors resize-none ${
                errors.description
                  ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                  : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
              }`}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-[#DC2626] font-medium">{errors.description.message}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[130px] gap-2 text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Assign Homework"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};