// src/features/portal/StudentDashboardPage.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Video,
  ChevronRight,
  BookOpen,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Hourglass,
  ArrowRight,
  CheckCircle2,
  Target,
  Sparkles,
  Inbox,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

import { useStudentDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import {
  StudentNextSessionItem,
  StudentRecentSessionItem,
  StudentDashboardHomeworkItem,
} from "@/types/dashboard";
import { SessionStatus } from "@/types/sessions";

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isPending, isError, error, refetch } = useStudentDashboard();

  if (isPending) {
    return <StudentDashboardLoadingSkeleton />;
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200 mt-6 select-none">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
            <AlertCircle size={20} />
          </div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            Couldn't load your dashboard
          </h2>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
            {error instanceof Error
              ? error.message
              : "We couldn't retrieve your learning workspace right now."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="mt-4 gap-1.5 text-xs font-semibold"
          >
            <RotateCcw size={13} />
            <span>Try again</span>
          </Button>
        </Card>
      </PageContainer>
    );
  }

  const { next_session, homework, progress, recent_sessions } = data;
  const studentFirstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <PageContainer>
      {/* 1. Header */}
      <div className="mb-6 select-none">
        <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
          Welcome back, {studentFirstName}. Here is what is coming up in your learning.
        </p>
      </div>

      {/* 2. Primary Surface: Next Session Hero or Empty Upcoming */}
      <div className="mb-7 select-none">
        {next_session ? (
          <NextSessionHeroCard
            session={next_session}
            onOpenSession={(id) => navigate(`/sessions/${id}`)}
          />
        ) : (
          <NoNextSessionCard onBrowseSessions={() => navigate("/portal/sessions")} />
        )}
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start select-none">
        {/* Main Column (2 Cols on Desktop): Pending Homework & Recent Sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Homework Worklist Section */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#315FEA]" />
                <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                  Your Homework
                </h2>
                <span
                  className={`text-[11px] font-mono px-2 py-0.2 rounded-full font-bold ${
                    homework.pending_count > 0
                      ? "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {homework.pending_count} to do
                </span>
              </div>
              <Link
                to="/portal/homework"
                className="text-xs font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <span>View all homework</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {homework.recent.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-[#F8FAFC]/40">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto border border-[#BBF7D0]">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  You're all caught up
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
                  No pending homework right now. New assignments will appear here as your tutor assigns them.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {homework.recent.map((hw) => (
                  <StudentHomeworkRow key={hw.id} item={hw} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Lessons List */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#64748B]" />
                <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                  Recent Lessons
                </h2>
              </div>
              <Link
                to="/portal/sessions"
                className="text-xs font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <span>All sessions</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {recent_sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC]/30">
                No past sessions recorded yet. Completed lessons will appear here.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {recent_sessions.map((session) => (
                  <StudentRecentSessionRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Supporting Column (1 Col on Desktop): Progress Snapshot */}
        <div className="space-y-6">
          <Card className="p-5 border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-[#315FEA]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Learning Snapshot
                </h3>
              </div>
              <Link
                to="/portal/progress"
                className="text-xs font-semibold text-[#315FEA] hover:underline"
              >
                Progress
              </Link>
            </div>

            {/* Total Completed Metric */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider block">
                  Completed Lessons
                </span>
                <span className="text-2xl font-bold text-[#0F172A] leading-tight mt-0.5 block">
                  {progress.total_sessions_completed}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] text-[#16A34A] flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>

            {/* Recommended Next Focus */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                <Sparkles size={13} className="text-[#7C3AED]" />
                <span>Recommended Focus</span>
              </div>
              {progress.latest_ai_focus ? (
                <p className="text-xs leading-relaxed text-[#334155] bg-[#F5F3FF]/70 p-3 rounded-xl border border-[#DDD6FE]">
                  {progress.latest_ai_focus}
                </p>
              ) : (
                <p className="text-xs text-[#64748B] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  Your next curriculum focus area will be surfaced here after an upcoming session review.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Hero Card: Next / In-Progress Lesson                               */
/* ------------------------------------------------------------------ */
interface NextSessionHeroCardProps {
  session: StudentNextSessionItem;
  onOpenSession: (id: string) => void;
}

const NextSessionHeroCard: React.FC<NextSessionHeroCardProps> = ({
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
      className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer shadow-xs relative overflow-hidden group ${
        isInProgress
          ? "bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/40 border-[#FDE68A] hover:border-[#F59E0B]"
          : "bg-gradient-to-br from-white to-[#F8FAFC] border-[#CBD5E1] hover:border-[#315FEA]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none ${
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
            {isInProgress ? "Live Lesson In Progress" : "Next Lesson"}
          </span>

          <span className="text-xs font-semibold text-[#0F172A]">
            {dateHeading}
          </span>
        </div>

        <span className="text-xs font-mono text-[#64748B]">{timeRange}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#315FEA] transition-colors">
            {session.topic}
          </h2>
          <p className="text-xs text-[#475569]">
            With <span className="font-semibold text-[#0F172A]">{session.tutor_name}</span>
          </p>
        </div>

        <div
          className="flex items-center gap-2.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {session.meeting_url ? (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors ${
                isInProgress
                  ? "bg-[#16A34A] hover:bg-[#15803D]"
                  : "bg-[#315FEA] hover:bg-[#284FC7]"
              }`}
            >
              <Video size={14} />
              <span>Join lesson</span>
              <ExternalLink size={12} className="opacity-75" />
            </a>
          ) : (
            <span className="text-[11px] text-[#64748B] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg">
              Meeting link will appear here
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenSession(session.id)}
            className="h-9 px-3 text-xs font-semibold"
          >
            <span>View lesson</span>
            <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const NoNextSessionCard: React.FC<{ onBrowseSessions: () => void }> = ({
  onBrowseSessions,
}) => (
  <Card className="p-6 border-dashed bg-[#F8FAFC]/60 text-center flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="text-left space-y-1">
      <h3 className="text-sm font-semibold text-[#0F172A]">No upcoming lesson</h3>
      <p className="text-xs text-[#64748B] leading-relaxed">
        Your next tutoring session will appear here once scheduled by your tutor.
      </p>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={onBrowseSessions}
      className="text-xs font-semibold shrink-0 self-start sm:self-auto h-8"
    >
      View past sessions
    </Button>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Subcomponent Rows                                                  */
/* ------------------------------------------------------------------ */
const StudentHomeworkRow: React.FC<{ item: StudentDashboardHomeworkItem }> = ({
  item,
}) => {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate">
            {item.title}
          </span>
          <span className="text-[10px] font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-1.5 py-0.2 rounded select-none">
            To do
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-[#64748B] line-clamp-1 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      <div className="shrink-0 self-start sm:self-auto">
        <Link
          to={`/sessions/${item.session_id}`}
          state={{ from: "/portal", label: "Dashboard" }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#315FEA] hover:underline"
        >
          <span>View lesson</span>
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
};

const StudentRecentSessionRow: React.FC<{ session: StudentRecentSessionItem }> = ({
  session,
}) => {
  const navigate = useNavigate();
  const dateFormatted = formatSessionShortDate(session.scheduled_start);

  return (
    <div
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
    >
      <div className="min-w-0 space-y-0.5">
        <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#315FEA] transition-colors block truncate">
          {session.topic}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
          <span>With {session.tutor_name}</span>
          <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
          <span className="font-mono text-[#94A3B8]">{dateFormatted}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StudentDashboardStatusBadge status={session.status} />
        <ChevronRight size={14} className="text-[#94A3B8]" />
      </div>
    </div>
  );
};

const StudentDashboardStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
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
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border select-none ${current.className}`}
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
    } else {
      dateHeading = format(start, "EEE, MMM d");
    }

    const timeRange = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
    return { dateHeading, timeRange };
  } catch {
    return { dateHeading: startIso, timeRange: `${startIso} – ${endIso}` };
  }
}

function formatSessionShortDate(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    if (isToday(d)) return "Today";
    return format(d, "MMM d");
  } catch {
    return isoDate;
  }
}

/* ------------------------------------------------------------------ */
/* Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */
const StudentDashboardLoadingSkeleton: React.FC = () => (
  <PageContainer>
    <div className="space-y-2 mb-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72" />
    </div>

    <Skeleton className="h-32 w-full rounded-2xl mb-7" />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  </PageContainer>
);

export default StudentDashboardPage;