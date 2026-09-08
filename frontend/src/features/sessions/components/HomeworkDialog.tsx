import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { parseApiError } from "@/services/api/error-handler";
import { useCreateHomework, useUpdateHomework } from "@/features/homework/hooks/useHomework";
import { HomeworkTaskResponse } from "@/types/homework";

const homeworkSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must not exceed 200 characters"),
  description: z.string().min(1, "Instructions are required"),
});

type HomeworkFormValues = z.infer<typeof homeworkSchema>;

interface HomeworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  initialTask?: HomeworkTaskResponse | null;
}

export const HomeworkDialog: React.FC<HomeworkDialogProps> = ({
  isOpen,
  onClose,
  sessionId,
  initialTask,
}) => {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateHomework();
  const updateMutation = useUpdateHomework();

  const isEditing = Boolean(initialTask);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (initialTask) {
      reset({
        title: initialTask.title,
        description: initialTask.description,
      });
    } else {
      reset({
        title: "",
        description: "",
      });
    }
    setFormError(null);
  }, [initialTask, reset, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setFormError(null);
    onClose();
  };

  const onSubmit = async (values: HomeworkFormValues) => {
    setFormError(null);
    try {
      if (isEditing && initialTask) {
        await updateMutation.mutateAsync({
          homeworkId: initialTask.id,
          sessionId,
          payload: {
            title: values.title.trim(),
            description: values.description.trim(),
          },
        });
        toast.success("Homework updated.");
      } else {
        await createMutation.mutateAsync({
          session_id: sessionId,
          title: values.title.trim(),
          description: values.description.trim(),
        });
        toast.success("Homework assigned.");
      }
      handleClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setFormError(parsed.message || "Failed to save homework. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homework-dialog-title"
    >
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 id="homework-dialog-title" className="text-base font-semibold text-[#0F172A]">
            {isEditing ? "Edit Homework" : "Assign Homework"}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto" noValidate>
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="hw-title" className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="hw-title"
              type="text"
              placeholder="e.g. Differentiation Problem Set 3"
              disabled={isSubmitting}
              className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors ${
                errors.title
                  ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                  : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
              }`}
              {...register("title")}
            />
            {errors.title && <p className="text-xs text-[#DC2626] font-medium">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="hw-desc" className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Instructions <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              id="hw-desc"
              rows={4}
              placeholder="Provide exact questions, page numbers, or guidelines..."
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

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[110px] gap-2">
              {isSubmitting ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Assign"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};