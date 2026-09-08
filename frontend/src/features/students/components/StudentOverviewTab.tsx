// src/features/students/components/StudentOverviewTab.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  FileText,
  RotateCcw,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { useStudentOverview } from "../hooks";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { SessionResponse, SessionStatus } from "@/types/sessions";
import { OverviewHomeworkTaskSummary } from "@/types/students";
import { StudentTabKey } from "../StudentDetailPage";

interface StudentOverviewTabProps {
  profileId: string;
  onNavigateTab: (tab: StudentTabKey) => void;
}

export const StudentOverviewTab: React.FC<StudentOverviewTabProps> = ({
  profileId,
  onNavigateTab,
}) => {
  const {
    data: overview,
    isPending,
    isError,
    error,
    refetch,
  } = useStudentOverview(profileId);

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton State                                             */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return <OverviewSkeleton />;
  }

  /* ------------------------------------------------------------------ */
  /* Error State                                                        */
  /* ------------------------------------------------------------------ */
  if (isError || !overview) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Unable to load overview
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
          {error instanceof Error
            ? error.message
            : "We encountered an issue retrieving this student's overview workspace."}
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
    );
  }

  const { metrics, next_session, recent_sessions, pending_homework, student } =
    overview;

  return (
    <div className="space-y-6 select-none">
      {/* 1. Core Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Completed Sessions Metric */}
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[13px] font-medium text-[#475569]">
              Completed sessions
            </span>
            <div className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-none">
              {metrics.total_sessions_completed}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} strokeWidth={1.8} />
          </div>
        </Card>

        {/* Pending Homework Metric */}
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[13px] font-medium text-[#475569]">
              Pending homework tasks
            </span>
            <div className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-none">
              {metrics.pending_homework_count}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <BookOpen size={22} strokeWidth={1.8} />
          </div>
        </Card>
      </div>

      {/* 2. Next Session Spotlight Card */}
      <NextSessionCard
        session={next_session}
        studentId={profileId}
      />

      {/* 3. Operational Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Recent Teaching Activity */}
        <RecentSessionsList
          sessions={recent_sessions}
          onViewAll={() => onNavigateTab("sessions")}
        />

        {/* Right Column: Pending Homework List */}
        <PendingHomeworkList
          tasks={pending_homework}
          totalCount={metrics.pending_homework_count}
          onViewAll={() => onNavigateTab("homework")}
        />
      </div>

      {/* 4. Pedagogical Context Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Latest AI Learning Focus */}
        <LatestAIFocusCard focus={metrics.latest_ai_focus} />

        {/* Academic Goals & Needs */}
        <LearningContextCard
          goals={student.learning_goals}
          weakAreas={student.weak_areas}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Next Scheduled Session Spotlight                     */
/* ------------------------------------------------------------------ */
interface NextSessionCardProps {
  session: SessionResponse | null;
  studentId: string;
}

const NextSessionCard: React.FC<NextSessionCardProps> = ({
  session,
  studentId,
}) => {
  if (!session) {
    return (
      <Card className="p-6 border-dashed bg-[#F8FAFC]/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Upcoming Session
          </span>
          <h3 className="text-base font-semibold text-[#0F172A]">
            No upcoming session scheduled
          </h3>
          <p className="text-xs text-[#64748B]">
            Plan your next curriculum topic and book an available lesson slot.
          </p>
        </div>
        <Link
          to={`/dashboard/sessions?schedule=${studentId}`}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-sm shrink-0"
        >
          <CalendarPlus size={15} className="text-[#315FEA]" />
          Schedule Session
        </Link>
      </Card>
    );
  }

  const { dateLabel, timeRange } = formatSessionTime(
    session.scheduled_start,
    session.scheduled_end
  );

  return (
    <Card className="p-6 border-l-4 border-l-[#315FEA]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#315FEA]">
              Next Session
            </span>
            <SessionStatusBadge status={session.status} />
          </div>

          <h3 className="text-lg font-semibold text-[#0F172A] tracking-tight">
            {session.topic}
          </h3>

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

        {/* Contextual Action */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {session.meeting_url && (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors"
            >
              <ExternalLink size={14} />
              Meeting Link
            </a>
          )}

          <Link
            to={`/dashboard/sessions/${session.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#315FEA] hover:bg-[#284FC7] active:bg-[#1E3EB4] text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <span>Open Session</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Recent Sessions Summary List                         */
/* ------------------------------------------------------------------ */
interface RecentSessionsListProps {
  sessions: SessionResponse[];
  onViewAll: () => void;
}

const RecentSessionsList: React.FC<RecentSessionsListProps> = ({
  sessions,
  onViewAll,
}) => {
  return (
    <Card className="p-0 overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A] tracking-tight">
          Recent Sessions
        </h3>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-[#315FEA] hover:text-[#284FC7] inline-flex items-center gap-1 transition-colors"
          >
            View all
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="divide-y divide-[#E2E8F0] flex-1">
        {sessions.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-medium text-[#0F172A]">
              No completed sessions yet
            </p>
            <p className="text-xs text-[#64748B]">
              Past lesson logs, notes, and debriefs will appear here after lessons.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const formattedDate = format(
              parseISO(session.scheduled_start),
              "MMM d, yyyy"
            );

            return (
              <Link
                key={session.id}
                to={`/dashboard/sessions/${session.id}`}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors block group"
              >
                <div className="space-y-1 min-w-0">
                  <span className="block text-sm font-medium text-[#0F172A] group-hover:text-[#315FEA] transition-colors truncate">
                    {session.topic}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span>{formattedDate}</span>
                    <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                    <SessionStatusBadge status={session.status} />
                  </div>
                </div>
                <ArrowRight
                  size={15}
                  className="text-[#94A3B8] group-hover:text-[#315FEA] transition-colors shrink-0"
                />
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Pending Homework Summary List                        */
/* ------------------------------------------------------------------ */
interface PendingHomeworkListProps {
  tasks: OverviewHomeworkTaskSummary[];
  totalCount: number;
  onViewAll: () => void;
}

const PendingHomeworkList: React.FC<PendingHomeworkListProps> = ({
  tasks,
  totalCount,
  onViewAll,
}) => {
  return (
    <Card className="p-0 overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#0F172A] tracking-tight">
            Pending Homework
          </h3>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
              {totalCount}
            </span>
          )}
        </div>
        {tasks.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-[#315FEA] hover:text-[#284FC7] inline-flex items-center gap-1 transition-colors"
          >
            View all
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="divide-y divide-[#E2E8F0] flex-1">
        {tasks.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-medium text-[#0F172A]">
              No pending homework
            </p>
            <p className="text-xs text-[#64748B]">
              The student has completed all assigned tasks.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const formattedDueDate = task.due_date
              ? format(parseISO(task.due_date), "MMM d, yyyy")
              : null;

            return (
              <div key={task.id} className="p-4 flex items-start gap-3">
                <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mt-0.5 shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0F172A] leading-snug break-words">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-[#64748B] line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  {formattedDueDate && (
                    <p className="text-[11px] text-[#94A3B8]">
                      Due {formattedDueDate}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Latest AI Learning Focus                             */
/* ------------------------------------------------------------------ */
const LatestAIFocusCard: React.FC<{ focus: string | null }> = ({ focus }) => {
  return (
    <Card className="p-5 flex flex-col justify-between border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#315FEA]">
          <Sparkles size={15} />
          <span>Latest AI Focus</span>
        </div>

        {focus ? (
          <p className="text-sm text-[#0F172A] leading-relaxed font-normal">
            {focus}
          </p>
        ) : (
          <div className="space-y-1 py-1">
            <p className="text-xs font-medium text-[#475569]">
              No AI focus generated yet
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Curriculum focus recommendations will populate automatically after
              completing initial session debriefs.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span>Synthesis source</span>
        <span className="font-mono text-[#64748B]">Session debrief analysis</span>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Academic Goals & Priority Needs                      */
/* ------------------------------------------------------------------ */
interface LearningContextCardProps {
  goals: string;
  weakAreas: string;
}

const LearningContextCard: React.FC<LearningContextCardProps> = ({
  goals,
  weakAreas,
}) => {
  const cleanGoals = goals?.trim();
  const cleanWeakAreas = weakAreas?.trim();

  return (
    <Card className="p-5 flex flex-col justify-between border-[#E2E8F0]">
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
          <FileText size={15} className="text-[#64748B]" />
          <span>Learning Context</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="font-medium text-[#64748B] block mb-0.5">
              Primary Goals
            </span>
            <p className="text-sm text-[#0F172A] leading-relaxed">
              {cleanGoals || "Not specified on initial profile."}
            </p>
          </div>

          <div>
            <span className="font-medium text-[#64748B] block mb-0.5">
              Identified Focus Areas
            </span>
            <p className="text-sm text-[#0F172A] leading-relaxed">
              {cleanWeakAreas || "Not specified on initial profile."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span>Profile criteria</span>
        <span className="font-mono text-[#64748B]">Tutor editable</span>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Utilities: Session Status Badge                                    */
/* ------------------------------------------------------------------ */
const SessionStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const config = {
    scheduled: {
      label: "Scheduled",
      className: "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]",
    },
    completed: {
      label: "Completed",
      className: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    },
    ai_reviewed: {
      label: "AI Reviewed",
      className: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
    },
  }[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Utilities: Time Formatter                                          */
/* ------------------------------------------------------------------ */
function formatSessionTime(startIso: string, endIso: string) {
  try {
    const startDate = parseISO(startIso);
    const endDate = parseISO(endIso);
    return {
      dateLabel: format(startDate, "EEE, MMM d, yyyy"),
      timeRange: `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`,
    };
  } catch {
    return {
      dateLabel: startIso,
      timeRange: `${startIso} – ${endIso}`,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Skeleton Component                                                 */
/* ------------------------------------------------------------------ */
const OverviewSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>

    <Skeleton className="h-32 w-full rounded-xl" />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  </div>
);

export default StudentOverviewTab;