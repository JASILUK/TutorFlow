// src/features/portal/StudentHomeworkPage.tsx
import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Inbox,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useHomework, useCompleteHomework } from "@/features/homework/hooks/useHomework";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, Skeleton } from "@/components/ui/core-primitives";
import { StudentHomeworkItem } from "@/features/homework/components/StudentHomeworkItem";
import { HomeworkTaskResponse } from "@/types/homework";
import { parseApiError } from "@/services/api/error-handler";

type FilterStatus = "all" | "pending" | "completed";

export const StudentHomeworkPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active filter directly from URL search params
  const activeFilter = (searchParams.get("status") as FilterStatus) || "all";

  // Map URL status filter to is_completed parameter
  const isCompletedParam = useMemo(() => {
    if (activeFilter === "pending") return false;
    if (activeFilter === "completed") return true;
    return undefined;
  }, [activeFilter]);

  // Query strictly through the student endpoint GET /homework/my
  const {
    data: dashboardData,
    isPending,
    isError,
    error,
    refetch,
  } = useHomework({
    isTutor: false,
    is_completed: isCompletedParam,
    limit: 50,
  });

  const completeMutation = useCompleteHomework();

  const counts = dashboardData?.counts ?? {
    total: 0,
    pending_count: 0,
    completed_count: 0,
  };

  const tasks = dashboardData?.items ?? [];

  // Group tasks for the "All" view: Pending first, Completed second
  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending: HomeworkTaskResponse[] = [];
    const completed: HomeworkTaskResponse[] = [];

    tasks.forEach((t) => {
      if (t.is_completed) {
        completed.push(t);
      } else {
        pending.push(t);
      }
    });

    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  const handleFilterChange = (newStatus: FilterStatus) => {
    if (newStatus === "all") {
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("status", newStatus);
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleToggleComplete = async (task: HomeworkTaskResponse) => {
    try {
      await completeMutation.mutateAsync({
        homeworkId: task.id,
        sessionId: task.session_id,
        payload: { is_completed: !task.is_completed },
      });
      // Silent success without disruptive toast spam
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't update this assignment. Please try again.");
    }
  };

  return (
    <PageContainer>
      {/* 1. Contextual Breadcrumb & Header */}
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
        Learning / Homework
      </div>

      <PageHeader
        title="My Homework"
        description="Keep track of your assignments and complete them at your own pace."
      />

      {/* 2. Top Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 select-none">
        <Card className="p-4 flex items-center justify-between border-[#E2E8F0]">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Total Assignments</span>
            <p className="text-xl font-bold text-[#0F172A] leading-tight">
              {counts.total}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <BookOpen size={17} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#D97706] border-[#E2E8F0]">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">To Do</span>
            <p className="text-xl font-bold text-[#D97706] leading-tight">
              {counts.pending_count}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <Clock size={17} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#16A34A] border-[#E2E8F0]">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Completed</span>
            <p className="text-xl font-bold text-[#16A34A] leading-tight">
              {counts.completed_count}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
            <CheckCircle2 size={17} />
          </div>
        </Card>
      </div>

      {/* 3. Primary Filter Row */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-5 select-none">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeFilter === "all"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("pending")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeFilter === "pending"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            To do ({counts.pending_count})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("completed")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeFilter === "completed"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Completed ({counts.completed_count})
          </button>
        </div>

        <span className="text-xs text-[#94A3B8] font-medium hidden sm:block">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} shown
        </span>
      </div>

      {/* 4. Homework Worklist Presentation */}
      {isPending ? (
        <StudentHomeworkSkeleton />
      ) : isError ? (
        <StudentHomeworkErrorState error={error} onRetry={() => refetch()} />
      ) : counts.total === 0 ? (
        <AllCaughtUpEmptyState />
      ) : tasks.length === 0 ? (
        activeFilter === "pending" ? (
          <NothingLeftToDoEmptyState />
        ) : (
          <NoCompletedHomeworkEmptyState />
        )
      ) : activeFilter === "all" ? (
        /* "All" View: Dual Structured Section Grouping */
        <div className="space-y-6 select-none">
          {/* Actionable / To Do Section */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  To do ({pendingTasks.length})
                </h3>
              </div>
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                {pendingTasks.map((task) => (
                  <StudentHomeworkItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    isMutating={
                      completeMutation.isPending &&
                      completeMutation.variables?.homeworkId === task.id
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed History Section */}
          {completedTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Completed ({completedTasks.length})
                </h3>
              </div>
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                {completedTasks.map((task) => (
                  <StudentHomeworkItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    isMutating={
                      completeMutation.isPending &&
                      completeMutation.variables?.homeworkId === task.id
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Filtered View (To Do or Completed) */
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden select-none">
          {tasks.map((task) => (
            <StudentHomeworkItem
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              isMutating={
                completeMutation.isPending &&
                completeMutation.variables?.homeworkId === task.id
              }
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Skeletons & Empty / Error States                                   */
/* ------------------------------------------------------------------ */
const StudentHomeworkSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="p-5 flex items-start gap-4">
        <Skeleton className="w-5 h-5 rounded-md shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg shrink-0 hidden sm:block" />
      </div>
    ))}
  </div>
);

const StudentHomeworkErrorState: React.FC<{
  error: unknown;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200">
    <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
      <AlertCircle size={20} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">
      Couldn't load your homework
    </h3>
    <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
      {error instanceof Error
        ? error.message
        : "We couldn't retrieve your assignments right now."}
    </p>
    <Button
      variant="secondary"
      size="sm"
      onClick={onRetry}
      className="mt-4 gap-1.5 text-xs font-semibold"
    >
      <RotateCcw size={13} />
      <span>Try again</span>
    </Button>
  </Card>
);

const AllCaughtUpEmptyState: React.FC = () => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
      <Inbox size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">You're all caught up</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      No homework has been assigned yet. New assignments from your tutoring sessions
      will appear here.
    </p>
  </Card>
);

const NothingLeftToDoEmptyState: React.FC = () => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center mb-3">
      <ClipboardCheck size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">Nothing left to do</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      You've completed all of your current homework assignments.
    </p>
  </Card>
);

const NoCompletedHomeworkEmptyState: React.FC = () => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <Clock size={20} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">No completed homework yet</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      Completed assignments will appear here after you finish them.
    </p>
  </Card>
);

export default StudentHomeworkPage;