// src/features/homework/TutorHomeworkPage.tsx
import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import {
  useHomework,
  useCompleteHomework,
  useDeleteHomework,
} from "@/features/homework/hooks/useHomework";
import { useStudents } from "@/features/students/hooks/useStudents";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { GlobalHomeworkModal } from "./components/GlobalHomeworkModal";
import { HomeworkTaskResponse } from "@/types/homework";
import { parseApiError } from "@/services/api/error-handler";

type StatusFilter = "all" | "pending" | "completed";

export const TutorHomeworkPage: React.FC = () => {
  // Local filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Dialog states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<HomeworkTaskResponse | null>(null);
  const [deletingTask, setDeletingTask] = useState<HomeworkTaskResponse | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Student directory for filtering options
  const { data: studentsData } = useStudents({ page_size: 100 });
  const studentOptions = studentsData?.items ?? [];

  // Query parameters mapping
  const queryParams = useMemo(() => {
    return {
      student_profile_id: selectedStudentId || undefined,
      is_completed:
        statusFilter === "all" ? undefined : statusFilter === "completed",
      limit: 50,
    };
  }, [selectedStudentId, statusFilter]);

  const {
    data: dashboardData,
    isPending,
    isError,
    error,
    refetch,
  } = useHomework(queryParams);

  const completeMutation = useCompleteHomework();
  const deleteMutation = useDeleteHomework();

  const homeworkItems = dashboardData?.items ?? [];
  const counts = dashboardData?.counts ?? {
    total: 0,
    pending_count: 0,
    completed_count: 0,
  };

  const hasActiveFilters = Boolean(selectedStudentId || statusFilter !== "all");

  const handleClearFilters = () => {
    setSelectedStudentId("");
    setStatusFilter("all");
  };

  const handleToggleComplete = async (task: HomeworkTaskResponse) => {
    try {
      await completeMutation.mutateAsync({
        homeworkId: task.id,
        sessionId: task.session_id,
        payload: { is_completed: !task.is_completed },
      });
      toast.success(task.is_completed ? "Task marked pending." : "Task completed.");
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
    <PageContainer>
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
            Homework
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Manage assignments across your students and track what still needs attention.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingTask(null);
            setIsCreateModalOpen(true);
          }}
          className="gap-2 shrink-0 self-start sm:self-auto text-xs font-semibold h-10 px-4"
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Add homework</span>
        </Button>
      </div>

      {/* 2. Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 select-none">
        <Card className="p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Total Assignments</span>
            <p className="text-xl font-semibold text-[#0F172A] leading-tight">
              {counts.total}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#D97706]">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Pending Workload</span>
            <p className="text-xl font-semibold text-[#0F172A] leading-tight">
              {counts.pending_count}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#16A34A]">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Completed Tasks</span>
            <p className="text-xl font-semibold text-[#0F172A] leading-tight">
              {counts.completed_count}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </Card>
      </div>

      {/* 3. Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 select-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Status Switcher Tabs */}
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
              All
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
              Completed
            </button>
          </div>

          {/* Student Filter Dropdown */}
          <div className="w-full sm:w-56">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              aria-label="Filter assignments by student"
              className="w-full h-9 px-3 text-xs font-medium text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors cursor-pointer"
            >
              <option value="">All students</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.student_user?.full_name || student.subject}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-[#64748B] hover:text-[#0F172A] h-9 px-2.5 self-start sm:self-auto"
            >
              Clear filters
            </Button>
          )}
        </div>

        <span className="text-xs text-[#94A3B8] font-medium hidden sm:block">
          Showing {homeworkItems.length} tasks
        </span>
      </div>

      {/* 4. Homework Worklist Presentation */}
      {isPending ? (
        <HomeworkLoadingSkeleton />
      ) : isError ? (
        <HomeworkErrorState error={error} onRetry={() => refetch()} />
      ) : homeworkItems.length === 0 ? (
        hasActiveFilters ? (
          statusFilter === "completed" ? (
            <FilteredNoCompletedState onClear={handleClearFilters} />
          ) : (
            <FilteredEmptyState onClear={handleClearFilters} />
          )
        ) : (
          <NoHomeworkEmptyState
            onAdd={() => {
              setEditingTask(null);
              setIsCreateModalOpen(true);
            }}
          />
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
                {/* Checkbox Trigger */}
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

                {/* Primary Content */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm sm:text-[15px] font-semibold tracking-tight break-words ${
                        task.is_completed ? "line-through text-[#94A3B8]" : "text-[#0F172A]"
                      }`}
                    >
                      {task.title}
                    </h3>
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

                  {/* Context Anchor: Related Session */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B] pt-1">
                    {task.session ? (
                      <Link
                        to={`/sessions/${task.session_id}`}
                        className="inline-flex items-center gap-1.5 text-[#315FEA] hover:underline font-medium truncate"
                      >
                        <Video size={12} className="shrink-0 text-[#94A3B8]" />
                        <span>From: {task.session.topic}</span>
                        {task.session.scheduled_start && (
                          <span className="text-[#94A3B8] font-normal">
                            ({format(parseISO(task.session.scheduled_start), "MMM d")})
                          </span>
                        )}
                        <ChevronRight size={11} className="text-[#94A3B8]" />
                      </Link>
                    ) : (
                      <span className="text-[#94A3B8]">Session unavailable</span>
                    )}

                    <span className="text-[#E2E8F0]" aria-hidden="true">•</span>
                    <span className="text-[#94A3B8]">
                      Assigned {format(parseISO(task.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                {/* Overflow Actions */}
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
                            setEditingTask(task);
                            setIsCreateModalOpen(true);
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

      {/* 5. Create / Edit Assignment Modal */}
      <GlobalHomeworkModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
      />

      {/* 6. Delete Confirmation Dialog */}
      {deletingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-sm w-full p-6 space-y-3">
            <h4 className="text-base font-semibold text-[#0F172A]">Delete homework assignment?</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              <strong className="text-[#0F172A]">"{deletingTask.title}"</strong> will be permanently removed.
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
                {deleteMutation.isPending ? "Deleting…" : "Delete assignment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Skeletons & Empty States                                           */
/* ------------------------------------------------------------------ */
const HomeworkLoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded-md" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-4/5 ml-8" />
        <Skeleton className="h-3 w-40 ml-8" />
      </div>
    ))}
  </div>
);

const HomeworkErrorState: React.FC<{ error: unknown; onRetry: () => void }> = ({
  error,
  onRetry,
}) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200">
    <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
      <AlertCircle size={20} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">Couldn't load homework</h3>
    <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
      {error instanceof Error ? error.message : "Something went wrong retrieving assignments."}
    </p>
    <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4 gap-1.5 text-xs">
      <RotateCcw size={13} />
      <span>Try again</span>
    </Button>
  </Card>
);

const NoHomeworkEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
      <BookOpen size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">Homework is clear</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      You haven't assigned any homework yet. Assign tasks to reinforce lessons and track progress.
    </p>
    <Button variant="primary" size="sm" onClick={onAdd} className="mt-5 gap-2 text-xs font-semibold h-9">
      <Plus size={15} />
      <span>Add homework</span>
    </Button>
  </Card>
);

const FilteredEmptyState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <Clock size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No homework matches these filters</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      Try choosing a different student or status filter.
    </p>
    <Button variant="outline" size="sm" onClick={onClear} className="mt-4 text-xs h-8">
      Clear filters
    </Button>
  </Card>
);

const FilteredNoCompletedState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <CheckCircle2 size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No completed homework yet</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      When students or you mark assignments as complete, they will appear here.
    </p>
    <Button variant="outline" size="sm" onClick={onClear} className="mt-4 text-xs h-8">
      Clear filters
    </Button>
  </Card>
);

export default TutorHomeworkPage;