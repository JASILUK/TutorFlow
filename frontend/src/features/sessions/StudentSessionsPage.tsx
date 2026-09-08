// src/features/portal/StudentSessionsPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  User,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isAfter,
  isBefore,
  addDays,
} from "date-fns";

import { useSessions } from "@/features/sessions/hooks/useSessions";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Button, Skeleton } from "@/components/ui/core-primitives";
import { SessionResponse, SessionStatus } from "@/types/sessions";

type ViewTab = "all" | "upcoming" | "completed";

export const StudentSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewTab, setViewTab] = useState<ViewTab>("all");

  // Query sessions automatically scoped to this student on the server
  const {
    data: rawSessions = [],
    isPending,
    isError,
    error,
    refetch,
  } = useSessions({ limit: 50 });

  // Separate & sort sessions client-side
  const { nextSession, upcomingSessions, completedSessions } = useMemo(() => {
    const now = new Date();

    const upcoming: SessionResponse[] = [];
    const completed: SessionResponse[] = [];

    rawSessions.forEach((session) => {
      if (session.status === "in_progress") {
        upcoming.push(session);
      } else if (session.status === "scheduled") {
        // Only consider as upcoming if it hasn't completely elapsed
        try {
          const endDate = parseISO(session.scheduled_end);
          if (isAfter(endDate, now) || isToday(parseISO(session.scheduled_start))) {
            upcoming.push(session);
          } else {
            // Expired scheduled session - treat as completed/past
            completed.push(session);
          }
        } catch {
          upcoming.push(session);
        }
      } else {
        completed.push(session);
      }
    });

    // Sort upcoming CHRONOLOGICALLY (earliest first)
    upcoming.sort((a, b) => {
      // In-progress always floats to the top
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      return parseISO(a.scheduled_start).getTime() - parseISO(b.scheduled_start).getTime();
    });

    // Sort completed REVERSE-CHRONOLOGICALLY (most recent first)
    completed.sort(
      (a, b) => parseISO(b.scheduled_start).getTime() - parseISO(a.scheduled_start).getTime()
    );

    const nearestNext = upcoming.length > 0 ? upcoming[0] : null;

    return {
      nextSession: nearestNext,
      upcomingSessions: upcoming,
      completedSessions: completed,
    };
  }, [rawSessions]);

  const handleOpenSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton State                                             */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return <StudentSessionsSkeleton />;
  }

  /* ------------------------------------------------------------------ */
  /* Error State                                                        */
  /* ------------------------------------------------------------------ */
  if (isError) {
    return (
      <PageContainer>
        <PageHeader
          title="My Sessions"
          description="View your upcoming lessons and session history."
        />
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8 select-none">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Unable to load your sessions</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
            {error instanceof Error ? error.message : "We couldn't retrieve your lessons right now."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 gap-1.5 text-xs"
          >
            <RotateCcw size={13} />
            <span>Try again</span>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. Header */}
      <PageHeader
        title="My Sessions"
        description="View your upcoming lessons and session history."
      />

      {/* 2. Hero Next / In-Progress Lesson (Always shown when available) */}
      {nextSession && (
        <NextLessonHeroCard
          session={nextSession}
          onOpenSession={handleOpenSession}
        />
      )}

      {/* 3. Filter Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-6 select-none">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => setViewTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewTab === "all"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            All ({rawSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setViewTab("upcoming")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewTab === "upcoming"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Upcoming ({upcomingSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setViewTab("completed")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewTab === "completed"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Completed ({completedSessions.length})
          </button>
        </div>

        <span className="text-xs text-[#94A3B8] font-medium hidden sm:block">
          {rawSessions.length} total recorded lessons
        </span>
      </div>

      {/* 4. Session Content List */}
      {rawSessions.length === 0 ? (
        <NoSessionsEmptyState />
      ) : (
        <div className="space-y-8 select-none">
          {/* A. UPCOMING SECTION */}
          {(viewTab === "all" || viewTab === "upcoming") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#315FEA]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Upcoming Lessons ({upcomingSessions.length})
                </h3>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] bg-white text-center py-8">
                  <p className="text-xs font-medium text-[#0F172A]">No upcoming lessons scheduled</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Your tutor will schedule your next session slot soon.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] shadow-xs overflow-hidden">
                  {upcomingSessions.map((session) => (
                    <StudentSessionRow
                      key={session.id}
                      session={session}
                      isHeroCandidate={session.id === nextSession?.id}
                      onOpen={() => handleOpenSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* B. COMPLETED SECTION */}
          {(viewTab === "all" || viewTab === "completed") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Lesson History ({completedSessions.length})
                </h3>
              </div>

              {completedSessions.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] bg-white text-center py-8">
                  <p className="text-xs font-medium text-[#0F172A]">No completed lessons yet</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Lessons you attend will appear here in your learning history.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] shadow-xs overflow-hidden">
                  {completedSessions.map((session) => (
                    <StudentSessionRow
                      key={session.id}
                      session={session}
                      onOpen={() => handleOpenSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Hero Card: Next / Live Lesson                                      */
/* ------------------------------------------------------------------ */
interface NextLessonHeroCardProps {
  session: SessionResponse;
  onOpenSession: (id: string) => void;
}

const NextLessonHeroCard: React.FC<NextLessonHeroCardProps> = ({
  session,
  onOpenSession,
}) => {
  const isInProgress = session.status === "in_progress";
  const { dateHeading, timeRange } = formatSessionDates(
    session.scheduled_start,
    session.scheduled_end
  );

  return (
    <div
      onClick={() => onOpenSession(session.id)}
      className={`p-5 sm:p-6 rounded-2xl border mb-8 transition-all cursor-pointer shadow-sm relative overflow-hidden group ${
        isInProgress
          ? "bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/40 border-[#FDE68A] hover:border-[#F59E0B]"
          : "bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF]/50 border-[#CBD5E1] hover:border-[#315FEA]"
      }`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border select-none ${
              isInProgress
                ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A] animate-pulse"
                : "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isInProgress ? "bg-[#D97706]" : "bg-[#315FEA]"
              }`}
            />
            {isInProgress ? "Lesson is live right now" : "Next Upcoming Lesson"}
          </span>

          <span className="text-xs font-semibold text-[#0F172A]">
            {dateHeading}
          </span>
        </div>

        <span className="text-xs font-mono text-[#64748B]">{timeRange}</span>
      </div>

      {/* Main Lesson Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#315FEA] transition-colors">
            {session.topic}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-[#94A3B8]" />
              <span className="font-medium">{session.tutor_name || "Assigned Tutor"}</span>
            </div>
            {session.ai_suggested_focus && (
              <>
                <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                <span className="text-[#315FEA] font-medium truncate max-w-xs">
                  Target: {session.ai_suggested_focus}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {session.meeting_url ? (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                isInProgress
                  ? "bg-[#16A34A] text-white hover:bg-[#15803D]"
                  : "bg-[#315FEA] text-white hover:bg-[#284FC7]"
              }`}
            >
              <Video size={15} />
              <span>Join lesson</span>
              <ExternalLink size={12} className="opacity-75" />
            </a>
          ) : (
            <span className="text-[11px] text-[#64748B] bg-white/80 border border-[#E2E8F0] px-3 py-1.5 rounded-lg">
              Meeting link will appear here
            </span>
          )}

          <button
            type="button"
            onClick={() => onOpenSession(session.id)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#475569] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          >
            <span>Details</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* List Item Row (Desktop + Mobile Stacked)                           */
/* ------------------------------------------------------------------ */
interface StudentSessionRowProps {
  session: SessionResponse;
  isHeroCandidate?: boolean;
  onOpen: () => void;
}

const StudentSessionRow: React.FC<StudentSessionRowProps> = ({
  session,
  isHeroCandidate = false,
  onOpen,
}) => {
  const { dateHeading, timeRange } = formatSessionDates(
    session.scheduled_start,
    session.scheduled_end
  );
  const isInProgress = session.status === "in_progress";

  return (
    <div
      onClick={onOpen}
      className={`p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors cursor-pointer group hover:bg-[#F8FAFC] ${
        isInProgress ? "bg-[#FFFDF5]" : ""
      }`}
    >
      {/* Date & Time Column */}
      <div className="w-full sm:w-44 shrink-0 space-y-0.5">
        <span className="block text-xs sm:text-sm font-semibold text-[#0F172A] leading-tight">
          {dateHeading}
        </span>
        <span className="block text-[11px] sm:text-xs text-[#64748B] font-normal font-mono">
          {timeRange}
        </span>
      </div>

      {/* Topic & Tutor */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[#0F172A] group-hover:text-[#315FEA] transition-colors truncate">
            {session.topic}
          </h4>
          {isHeroCandidate && (
            <span className="hidden md:inline-flex text-[10px] uppercase font-bold text-[#315FEA] bg-[#EEF2FF] px-1.5 py-0.2 rounded border border-[#BFDBFE]">
              Next
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <span className="truncate">Tutor: {session.tutor_name || "Lead Tutor"}</span>
          {session.ai_session_summary && (
            <>
              <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#7C3AED]">
                <Sparkles size={11} />
                Summary ready
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status & Actions */}
      <div
        className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]"
        onClick={(e) => e.stopPropagation()}
      >
        <StudentStatusBadge status={session.status} />

        <div className="flex items-center gap-2">
          {/* Join action if eligible */}
          {session.meeting_url && (isInProgress || session.status === "scheduled") && (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#315FEA] hover:bg-[#284FC7] transition-colors"
            >
              <Video size={13} />
              <span>Join</span>
            </a>
          )}

          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
          >
            <span>View</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Status Badge                                                       */
/* ------------------------------------------------------------------ */
const StudentStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const configs: Record<SessionStatus, { label: string; className: string }> = {
    scheduled: {
      label: "Scheduled",
      className: "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]",
    },
    in_progress: {
      label: "In progress",
      className: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]",
    },
    completed: {
      label: "Completed",
      className: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    },
    ai_reviewed: {
      label: "Reviewed",
      className: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
    },
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

/* ------------------------------------------------------------------ */
/* Date Helpers                                                       */
/* ------------------------------------------------------------------ */
function formatSessionDates(startIso: string, endIso: string) {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);

    let dateHeading = "";
    if (isToday(start)) {
      dateHeading = "Today";
    } else if (isTomorrow(start)) {
      dateHeading = "Tomorrow";
    } else if (isBefore(start, addDays(new Date(), 7)) && isAfter(start, new Date())) {
      dateHeading = format(start, "EEE, MMM d");
    } else {
      dateHeading = format(start, "MMM d, yyyy");
    }

    const timeRange = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;

    return { dateHeading, timeRange };
  } catch {
    return { dateHeading: startIso, timeRange: `${startIso} – ${endIso}` };
  }
}

/* ------------------------------------------------------------------ */
/* Empty States                                                       */
/* ------------------------------------------------------------------ */
const NoSessionsEmptyState: React.FC = () => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/60">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
      <Calendar size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">No sessions yet</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      Your scheduled and completed lessons will appear here once your tutor organizes your schedule.
    </p>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Skeletons                                                          */
/* ------------------------------------------------------------------ */
const StudentSessionsSkeleton: React.FC = () => (
  <PageContainer>
    <div className="space-y-2 mb-6">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72" />
    </div>
    <Skeleton className="h-36 w-full rounded-2xl mb-8" />
    <div className="flex gap-2 mb-6">
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-24 rounded-lg" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 divide-y divide-[#E2E8F0] space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="py-3 flex items-center justify-between gap-4">
          <div className="space-y-1.5 w-1/4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  </PageContainer>
);

export default StudentSessionsPage;