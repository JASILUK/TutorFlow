// src/features/sessions/components/tutor/TutorSessionWorkspace.tsx
import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  ExternalLink,
  Play,
  CheckCircle2,
  Video,
  User,
  BookOpen,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { 
  useStartSession, 
  useCompleteSession, 
  useDeleteSession 
} from "@/features/sessions/hooks";
import { SessionResponse, SessionStatus } from "@/types/sessions";
import { Card, Button } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { parseApiError } from "@/services/api/error-handler";
import { LiveNotesEditor } from "./LiveNotesEditor";
import { AILessonPlanPanel } from "./AILessonPlanPanel";
import { SessionReviewPanel } from "./SessionReviewPanel";
import { SessionHomeworkPanel } from "./SessionHomeworkPanel";

interface TutorSessionWorkspaceProps {
  session: SessionResponse;
}

export const TutorSessionWorkspace: React.FC<TutorSessionWorkspaceProps> = ({ session }) => {
  const navigate = useNavigate();
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const flushNotesRef = useRef<(() => Promise<boolean>) | null>(null);
  const registerFlushHandler = useCallback((handler: (() => Promise<boolean>) | null) => {
    flushNotesRef.current = handler;
  }, []);

  const startSessionMutation = useStartSession();
  const completeSessionMutation = useCompleteSession();
  const deleteSessionMutation = useDeleteSession();

  const handleStartSession = async () => {
    try {
      await startSessionMutation.mutateAsync(session.id);
      toast.success("Session started.");
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't start the session. Please try again.");
    }
  };

  const handleCompleteSession = async () => {
    setIsCompletingSession(true);
    try {
      if (flushNotesRef.current) {
        const flushSuccess = await flushNotesRef.current();
        if (!flushSuccess) {
          toast.error("Could not persist pending notes. Please retry.");
          setIsCompletingSession(false);
          return;
        }
      }
      await completeSessionMutation.mutateAsync(session.id);
      setIsConfirmCompleteOpen(false);
      setIsCompletingSession(false);
      toast.success("Session completed.");
    } catch (err) {
      setIsCompletingSession(false);
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't complete the session.");
    }
  };

  const handleDeleteSession = async () => {
    setIsDeletingSession(true);
    try {
      await deleteSessionMutation.mutateAsync(session.id);
      toast.success("Session deleted successfully.");
      navigate("/dashboard/sessions", { replace: true });
    } catch (err) {
      setIsDeletingSession(false);
      setIsConfirmDeleteOpen(false);
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't delete the session.");
    }
  };

  const { dateLabel, timeRange } = formatSessionTime(
    session.scheduled_start,
    session.scheduled_end
  );

  const studentInitials = session.student_name
    ? session.student_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  const isInProgress = session.status === "in_progress";
  const isCompletedOrReviewed = session.status === "completed" || session.status === "ai_reviewed";

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center font-semibold text-xs select-none shrink-0">
                {studentInitials}
              </div>
              <Link
                to={`/dashboard/students/${session.student_profile_id}`}
                className="text-sm font-semibold text-[#0F172A] hover:text-[#315FEA] transition-colors truncate"
              >
                {session.student_name || "Student"}
              </Link>
              <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
              <TutorStatusBadge status={session.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] tracking-tight leading-snug">
              {session.topic}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#475569]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                <Calendar size={14} className="text-[#94A3B8]" />
                {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#64748B]">
                <Clock size={14} className="text-[#94A3B8]" />
                {timeRange}
              </span>
            </div>
          </div>
          {/* Tutor Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {session.meeting_url && (
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-sm"
              >
                <Video size={15} className="text-[#315FEA]" />
                <span>Join meeting</span>
                <ExternalLink size={13} className="text-[#94A3B8]" />
              </a>
            )}
            {session.status === "scheduled" && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartSession}
                  disabled={startSessionMutation.isPending}
                  className="gap-2 text-xs font-semibold h-9"
                >
                  {startSessionMutation.isPending ? (
                    <>
                      <BrandLoader size="sm" variant="white" speed="fast" />
                      <span>Starting…</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>Start session</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="gap-1.5 text-xs font-semibold h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </Button>
              </>
            )}
            {session.status === "in_progress" && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsConfirmCompleteOpen(true)}
                disabled={isCompletingSession}
                className="gap-2 text-xs font-semibold h-9 bg-[#16A34A] hover:bg-[#15803D]"
              >
                <CheckCircle2 size={15} />
                <span>Complete session</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {(isInProgress || isCompletedOrReviewed) && (
            <LiveNotesEditor
              sessionId={session.id}
              initialNotes={session.notes}
              isReadOnly={!isInProgress}
              registerFlushHandler={registerFlushHandler}
            />
          )}
          <AILessonPlanPanel
            planData={session.ai_plan}
            sessionId={session.id}
            status={session.status}
          />
          {isCompletedOrReviewed && (
            <SessionReviewPanel
              summary={session.ai_session_summary}
              suggestedFocus={session.ai_suggested_focus}
              status={session.status}
              sessionId={session.id}
            />
          )}
        </div>
        <div className="space-y-6">
          <SessionHomeworkPanel sessionId={session.id} isTutor={true} />
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Meeting
              </span>
              <Video size={15} className="text-[#94A3B8]" />
            </div>
            {session.meeting_url ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <span className="text-[11px] text-[#64748B] block mb-1 font-medium">
                    Video Link
                  </span>
                  <p className="text-xs font-mono text-[#0F172A] truncate">
                    {session.meeting_url}
                  </p>
                </div>
                <a
                  href={session.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-sm"
                >
                  <span>Open meeting link</span>
                  <ExternalLink size={13} className="text-[#94A3B8]" />
                </a>
              </div>
            ) : (
              <div className="py-2 text-center sm:text-left space-y-1">
                <p className="text-xs font-medium text-[#0F172A]">No meeting link added</p>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  No external link was attached.
                </p>
              </div>
            )}
          </Card>
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Session Context
              </span>
              <BookOpen size={15} className="text-[#94A3B8]" />
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#64748B] block font-medium mb-0.5">Tutor</span>
                <div className="flex items-center gap-1.5 text-[#0F172A] font-medium">
                  <User size={13} className="text-[#94A3B8]" />
                  <span>{session.tutor_name || "Lead Tutor"}</span>
                </div>
              </div>
              <div>
                <span className="text-[#64748B] block font-medium mb-0.5">Student</span>
                <Link
                  to={`/dashboard/students/${session.student_profile_id}`}
                  className="text-[#315FEA] hover:underline font-medium"
                >
                  {session.student_name}
                </Link>
              </div>
              {session.started_at && (
                <div>
                  <span className="text-[#64748B] block font-medium mb-0.5">Started at</span>
                  <span className="text-[#0F172A]">
                    {format(parseISO(session.started_at), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>
              )}
              {session.completed_at && (
                <div>
                  <span className="text-[#64748B] block font-medium mb-0.5">Completed at</span>
                  <span className="text-[#0F172A]">
                    {format(parseISO(session.completed_at), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Complete Confirmation Modal */}
      {isConfirmCompleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Complete this tutoring session?
              </h3>
              <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                Pending notes will be saved immediately and locked in read-only mode.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={isCompletingSession}
                onClick={() => setIsConfirmCompleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isCompletingSession}
                onClick={handleCompleteSession}
                className="bg-[#16A34A] hover:bg-[#15803D] min-w-[150px] gap-2"
              >
                {isCompletingSession ? (
                  <>
                    <BrandLoader size="sm" variant="white" speed="fast" />
                    <span>Saving & closing…</span>
                  </>
                ) : (
                  <span>Confirm & Complete</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Delete this scheduled session?
              </h3>
              <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                This action is permanent and cannot be undone. All attached resources for this session entry will be cleared.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={isDeletingSession}
                onClick={() => setIsConfirmDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isDeletingSession}
                onClick={handleDeleteSession}
                className="bg-rose-600 hover:bg-rose-700 min-w-[130px] gap-2 text-white"
              >
                {isDeletingSession ? (
                  <>
                    <BrandLoader size="sm" variant="white" speed="fast" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TutorStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const configs: Record<SessionStatus, { label: string; className: string }> = {
    scheduled: { label: "Scheduled", className: "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]" },
    in_progress: { label: "In Progress", className: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]" },
    completed: { label: "Completed", className: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]" },
    ai_reviewed: { label: "AI Reviewed", className: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]" },
  };
  const current = configs[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border select-none ${current.className}`}
    >
      {current.label}
    </span>
  );
};

function formatSessionTime(startIso: string, endIso: string) {
  try {
    const startDate = parseISO(startIso);
    const endDate = parseISO(endIso);
    return {
      dateLabel: format(startDate, "EEE, MMM d, yyyy"),
      timeRange: `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`,
    };
  } catch {
    return { dateLabel: startIso, timeRange: `${startIso} – ${endIso}` };
  }
}