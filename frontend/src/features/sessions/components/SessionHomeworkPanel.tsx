import React, { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Edit3,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import {
  useCompleteHomework,
  useDeleteHomework,
  useHomework,
} from "@/features/homework/hooks/useHomework";
import { HomeworkTaskResponse } from "@/types/homework";
import { HomeworkDialog } from "./HomeworkDialog";
import { toast } from "sonner";
import { parseApiError } from "@/services/api/error-handler";

interface SessionHomeworkPanelProps {
  sessionId: string;
  isTutor: boolean;
}

export const SessionHomeworkPanel: React.FC<SessionHomeworkPanelProps> = ({
  sessionId,
  isTutor,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeEditingTask, setActiveEditingTask] = useState<HomeworkTaskResponse | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);

  // Passes isTutor so students route to /homework/my?session_id=... without 403 Forbidden
  const { data, isPending, isError, error, refetch } = useHomework({
    session_id: sessionId,
    isTutor,
  });

  const completeMutation = useCompleteHomework();
  const deleteMutation = useDeleteHomework();

  const homeworkItems = data?.items ?? [];
  const pendingCount =
    data?.counts?.pending_count ?? homeworkItems.filter((i) => !i.is_completed).length;

  const handleToggleComplete = async (task: HomeworkTaskResponse) => {
    try {
      await completeMutation.mutateAsync({
        homeworkId: task.id,
        sessionId,
        payload: { is_completed: !task.is_completed },
      });
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;
    try {
      await deleteMutation.mutateAsync({ homeworkId: deletingTaskId, sessionId });
      toast.success("Homework deleted");
      setDeletingTaskId(null);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to delete task");
    }
  };

  return (
    <Card className="p-5 space-y-4 border-[#E2E8F0] select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-[#315FEA]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Homework
          </h3>
          {homeworkItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#475569]">
              {pendingCount} left
            </span>
          )}
        </div>

        {isTutor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveEditingTask(null);
              setIsDialogOpen(true);
            }}
            className="h-7 px-2 text-xs font-semibold text-[#315FEA] hover:text-[#284FC7] gap-1"
          >
            <Plus size={13} />
            <span>Add</span>
          </Button>
        )}
      </div>

      {/* States */}
      {isPending ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="py-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#DC2626]">
            <AlertCircle size={14} />
            <span>{error instanceof Error ? error.message : "Couldn't load homework."}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="h-7 text-xs gap-1"
          >
            <RotateCcw size={11} />
            <span>Retry</span>
          </Button>
        </div>
      ) : homeworkItems.length === 0 ? (
        <div className="py-4 text-center space-y-1">
          <p className="text-xs font-medium text-[#0F172A]">
            {isTutor ? "No homework assigned yet." : "No homework assigned for this session."}
          </p>
          <p className="text-[11px] text-[#64748B]">
            {isTutor
              ? "Assign tasks to reinforce this lesson's concepts."
              : "Check back later for assignments."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F1F5F9] -mx-1">
          {homeworkItems.map((task) => {
            const isMutatingThis =
              (completeMutation.isPending &&
                completeMutation.variables?.homeworkId === task.id) ||
              (deleteMutation.isPending &&
                deleteMutation.variables?.homeworkId === task.id);

            return (
              <div key={task.id} className="py-2.5 px-1 flex items-start gap-2.5 group relative">
                {/* Completion Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task)}
                  disabled={isMutatingThis}
                  aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    task.is_completed
                      ? "bg-[#16A34A] border-[#16A34A] text-white"
                      : "border-[#CBD5E1] hover:border-[#315FEA] bg-white"
                  } ${isMutatingThis ? "opacity-50 cursor-wait" : ""}`}
                >
                  {task.is_completed && <Check size={11} strokeWidth={3} />}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span
                    className={`block text-xs font-semibold leading-snug break-words ${
                      task.is_completed ? "line-through text-[#94A3B8]" : "text-[#0F172A]"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.description && (
                    <p
                      className={`text-[11px] leading-relaxed break-words line-clamp-2 ${
                        task.is_completed ? "text-[#CBD5E1]" : "text-[#64748B]"
                      }`}
                    >
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Tutor Actions Menu */}
                {isTutor && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpenTaskId(menuOpenTaskId === task.id ? null : task.id)
                      }
                      className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {menuOpenTaskId === task.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setMenuOpenTaskId(null)}
                          aria-hidden="true"
                        />
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenTaskId(null);
                              setActiveEditingTask(task);
                              setIsDialogOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenTaskId(null);
                              setDeletingTaskId(task.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isTutor && (
        <HomeworkDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setActiveEditingTask(null);
          }}
          sessionId={sessionId}
          initialTask={activeEditingTask}
        />
      )}

      {isTutor && deletingTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-sm w-full p-5 space-y-3">
            <h4 className="text-sm font-semibold text-[#0F172A]">Delete homework?</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              This task will be permanently removed from this session.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingTaskId(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="gap-1"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};