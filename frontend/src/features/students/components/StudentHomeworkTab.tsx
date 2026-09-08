// src/features/students/components/StudentHomeworkTab.tsx
import React, { useState, useMemo ,useEffect} from "react";
import { Link } from "react-router-dom";

import {
  Plus,
  BookOpen,
  CheckCircle2,
  Clock,
  Video,
  MoreVertical,
  Edit3,
  Trash2,
  AlertCircle,
  RotateCcw,
  Check,
  ChevronRight,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  useHomework,
  useCreateHomework,
  useUpdateHomework,
  useCompleteHomework,
  useDeleteHomework,
} from "@/features/homework/hooks/useHomework";
import { useSessions } from "@/features/sessions/hooks/useSessions";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { HomeworkTaskResponse } from "@/types/homework";
import { parseApiError } from "@/services/api/error-handler";

type StatusFilter = "all" | "pending" | "completed";

interface StudentHomeworkTabProps {
  profileId: string;
}

const homeworkFormSchema = z.object({
  session_id: z.string().min(1, "Please select an associated lesson session."),
  title: z.string().min(1, "Title is required.").max(200, "Title must not exceed 200 characters."),
  description: z.string().min(1, "Instructions and task details are required."),
});

type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;

export const StudentHomeworkTab: React.FC<StudentHomeworkTabProps> = ({ profileId }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<HomeworkTaskResponse | null>(null);
  const [deletingTask, setDeletingTask] = useState<HomeworkTaskResponse | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Scoped query for this student
  const queryParams = useMemo(() => {
    return {
      student_profile_id: profileId,
      is_completed: statusFilter === "all" ? undefined : statusFilter === "completed",
      limit: 50,
    };
  }, [profileId, statusFilter]);

  const { data: dashboardData, isPending, isError, error, refetch } = useHomework(queryParams);

  const completeMutation = useCompleteHomework();
  const deleteMutation = useDeleteHomework();

  const homeworkItems = dashboardData?.items ?? [];
  const counts = dashboardData?.counts ?? {
    total: 0,
    pending_count: 0,
    completed_count: 0,
  };

  const handleToggleComplete = async (task: HomeworkTaskResponse) => {
    try {
      await completeMutation.mutateAsync({
        homeworkId: task.id,
        sessionId: task.session_id,
        payload: { is_completed: !task.is_completed },
      });
      toast.success(task.is_completed ? "Task marked as pending." : "Task marked as complete.");
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to update completion status.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    try {
      await deleteMutation.mutateAsync({
        homeworkId: deletingTask.id,
        sessionId: deletingTask.session_id,
      });
      toast.success("Homework deleted.");
      setDeletingTask(null);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to delete assignment.");
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. Summary Strip & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-3 flex-1 max-w-xl">
          <Card className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">Total</span>
              <p className="text-lg font-semibold text-[#0F172A] leading-tight">{counts.total}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center shrink-0">
              <BookOpen size={16} />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-[#D97706]">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">Pending</span>
              <p className="text-lg font-semibold text-[#0F172A] leading-tight">{counts.pending_count}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-[#16A34A]">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">Completed</span>
              <p className="text-lg font-semibold text-[#0F172A] leading-tight">{counts.completed_count}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </Card>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setTaskToEdit(null);
            setIsDialogOpen(true);
          }}
          className="gap-2 shrink-0 self-start sm:self-auto text-xs font-semibold h-10 px-4"
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Assign homework</span>
        </Button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === "all"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === "pending"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Pending ({counts.pending_count})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              statusFilter === "completed"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Completed ({counts.completed_count})
          </button>
        </div>

        <span className="text-xs text-[#94A3B8] font-medium hidden sm:block">
          Showing {homeworkItems.length} tasks
        </span>
      </div>

      {/* 3. Content Presentation */}
      {isPending ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-4/5 ml-8" />
              <Skeleton className="h-3 w-40 ml-8" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Couldn't load homework</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
            {error instanceof Error ? error.message : "Something went wrong retrieving assignments."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4 gap-1.5 text-xs">
            <RotateCcw size={13} />
            <span>Try again</span>
          </Button>
        </Card>
      ) : homeworkItems.length === 0 ? (
        statusFilter !== "all" ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
              <Clock size={18} />
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A]">No assignments match this filter</h3>
            <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
              No tasks found in the "{statusFilter}" state for this student.
            </p>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")} className="mt-4 text-xs h-8">
              View all homework
            </Button>
          </Card>
        ) : (
          <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
            <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
              <BookOpen size={22} strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A]">No homework assigned yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
              Assign exercises or chapter tasks linked to recent sessions to guide this student's independent practice.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTaskToEdit(null);
                setIsDialogOpen(true);
              }}
              className="mt-5 gap-2 text-xs font-semibold h-9"
            >
              <Plus size={15} />
              <span>Assign homework</span>
            </Button>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {homeworkItems.map((task) => {
            const isMutatingThis =
              (completeMutation.isPending && completeMutation.variables?.homeworkId === task.id) ||
              (deleteMutation.isPending && deleteMutation.variables?.homeworkId === task.id);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3.5 group relative ${
                  task.is_completed ? "border-[#E2E8F0] bg-[#FAFAFC]" : "border-[#CBD5E1]/80 hover:border-[#94A3B8]"
                }`}
              >
                {/* Completion Checkbox Button */}
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task)}
                  disabled={isMutatingThis}
                  aria-label={
                    task.is_completed
                      ? `Mark "${task.title}" as pending`
                      : `Mark "${task.title}" as complete`
                  }
                  className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    task.is_completed
                      ? "bg-[#16A34A] border-[#16A34A] text-white"
                      : "border-[#CBD5E1] hover:border-[#315FEA] bg-white"
                  } ${isMutatingThis ? "opacity-50 cursor-wait" : ""}`}
                >
                  {task.is_completed && <Check size={13} strokeWidth={3} />}
                </button>

                {/* Primary Content Body */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`text-sm sm:text-[15px] font-semibold tracking-tight break-words ${
                        task.is_completed ? "line-through text-[#94A3B8]" : "text-[#0F172A]"
                      }`}
                    >
                      {task.title}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] font-semibold border ${
                        task.is_completed
                          ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                          : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                      }`}
                    >
                      {task.is_completed ? "Completed" : "Pending"}
                    </span>
                  </div>

                  {task.description && (
                    <p
                      className={`text-xs sm:text-[13px] leading-relaxed break-words max-w-3xl whitespace-pre-line ${
                        task.is_completed ? "text-[#94A3B8]" : "text-[#475569]"
                      }`}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Context: Related Session Info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B] pt-1">
                    {task.session ? (
                      <Link
                        to={`/sessions/${task.session_id}`}
                        className="inline-flex items-center gap-1.5 text-[#315FEA] hover:underline font-medium truncate"
                      >
                        <Video size={12} className="shrink-0 text-[#94A3B8]" />
                        <span>Lesson: {task.session.topic}</span>
                        {task.session.scheduled_start && (
                          <span className="text-[#94A3B8] font-normal">
                            ({format(parseISO(task.session.scheduled_start), "MMM d")})
                          </span>
                        )}
                        <ChevronRight size={11} className="text-[#94A3B8]" />
                      </Link>
                    ) : (
                      <span className="text-[#94A3B8]">Lesson context unavailable</span>
                    )}

                    <span className="text-[#E2E8F0]" aria-hidden="true">•</span>
                    <span className="text-[#94A3B8]">
                      Assigned {format(parseISO(task.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                {/* Overflow Menu */}
                <div className="relative shrink-0 self-start">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                    aria-label="Assignment actions"
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openMenuId === task.id && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setOpenMenuId(null)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1 z-30 select-none animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            handleToggleComplete(task);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                        >
                          <CheckCircle2 size={13} className="text-[#16A34A]" />
                          <span>{task.is_completed ? "Mark pending" : "Mark complete"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setTaskToEdit(task);
                            setIsDialogOpen(true);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                        >
                          <Edit3 size={13} className="text-[#94A3B8]" />
                          <span>Edit</span>
                        </button>

                        <div className="my-1 border-t border-[#F1F5F9]" />

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeletingTask(task);
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#DC2626] hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Scoped Assignment Creation & Edit Modal */}
      <StudentHomeworkModal
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setTaskToEdit(null);
        }}
        studentProfileId={profileId}
        taskToEdit={taskToEdit}
      />

      {/* 5. Delete Confirmation Dialog */}
      {deletingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-sm w-full p-6 space-y-3">
            <h4 className="text-base font-semibold text-[#0F172A]">Delete assignment?</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              <strong className="text-[#0F172A]">"{deletingTask.title}"</strong> will be permanently removed from this student's record.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingTask(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="gap-1.5"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Modal Component Scoped to Student's Sessions                        */
/* ------------------------------------------------------------------ */
interface StudentHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentProfileId: string;
  taskToEdit?: HomeworkTaskResponse | null;
}

const StudentHomeworkModal: React.FC<StudentHomeworkModalProps> = ({
  isOpen,
  onClose,
  studentProfileId,
  taskToEdit,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = Boolean(taskToEdit);

  const createMutation = useCreateHomework();
  const updateMutation = useUpdateHomework();

  // Load only sessions belonging to THIS student for assignment attachment
  const { data: studentSessions = [], isPending: isLoadingSessions } = useSessions({
    student_profile_id: studentProfileId,
    limit: 50,
  });

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
        toast.success("Assignment created.");
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
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#0F172A]">
              {isEditing ? "Edit Assignment" : "Assign Homework"}
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isEditing
                ? "Update instructions or task title for this student."
                : "Select an existing lesson session to attach this homework to."}
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto" noValidate>
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Session Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Lesson Session <span className="text-[#DC2626]">*</span>
            </label>
            {isEditing ? (
              <div className="h-10 px-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
                <span className="font-medium text-[#0F172A] truncate">
                  {taskToEdit?.session?.topic || "Assigned Session"}
                </span>
                <span className="font-mono text-[10px] text-[#94A3B8]">Session bound</span>
              </div>
            ) : studentSessions.length === 0 && !isLoadingSessions ? (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-800">
                This student has no scheduled or completed sessions yet. Please schedule a session first before creating homework.
              </div>
            ) : (
              <div>
                <select
                  disabled={isSubmitting || isLoadingSessions}
                  className={`w-full h-10 px-3 text-xs sm:text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 cursor-pointer ${
                    errors.session_id
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("session_id")}
                >
                  <option value="">Choose a lesson session...</option>
                  {studentSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic} ({format(parseISO(s.scheduled_start), "MMM d, yyyy")})
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
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Solve Quadratic Equations Exercise 4.2"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Instructions <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Provide problem numbers, page references, or specific questions to complete..."
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
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || (!isEditing && studentSessions.length === 0)}
              className="min-w-[130px] gap-2 text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Assign Task"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentHomeworkTab;