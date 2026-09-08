// src/features/sessions/SessionsPage.tsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  Clock,
  ArrowRight,
  Video,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Hourglass,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { useSessions } from "@/features/sessions/hooks/useSessions";
import { useStudents } from "@/features/students/hooks/useStudents";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { ScheduleSessionModal } from "./components/ScheduleSessionModal";
import { SessionResponse, SessionStatus } from "@/types/sessions";

const STATUS_FILTER_OPTIONS: { label: string; value: SessionStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "AI reviewed", value: "ai_reviewed" },
];

export const SessionsPage: React.FC = () => {
  // Local Filter UI State
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<SessionStatus | "all">("all");

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Fetch students strictly to populate filter dropdown options
  const { data: studentsData } = useStudents({ page_size: 100 });
  const studentOptions = studentsData?.items ?? [];

  // Query parameters strictly bound to FastAPI contract
  const queryParams = useMemo(() => {
    return {
      student_profile_id: selectedStudentProfileId || undefined,
      status: selectedStatus === "all" ? undefined : selectedStatus,
      limit: 50,
    };
  }, [selectedStudentProfileId, selectedStatus]);

  const {
    data: sessions = [],
    isPending,
    isError,
    error,
    refetch,
  } = useSessions(queryParams);

  const hasActiveFilters = Boolean(selectedStudentProfileId || selectedStatus !== "all");

  const handleClearFilters = () => {
    setSelectedStudentProfileId("");
    setSelectedStatus("all");
  };

  // Lightweight operational summary derived from current dataset
  const summaryMetrics = useMemo(() => {
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;

    sessions.forEach((s) => {
      if (s.status === "scheduled") scheduled += 1;
      else if (s.status === "in_progress") inProgress += 1;
      else if (s.status === "completed" || s.status === "ai_reviewed") completed += 1;
    });

    return { scheduled, inProgress, completed };
  }, [sessions]);

  return (
    <PageContainer>
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
            Sessions
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Manage your upcoming and completed tutoring sessions.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsScheduleModalOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto text-xs font-semibold h-10 px-4"
        >
          <CalendarPlus size={16} strokeWidth={2} />
          <span>Schedule session</span>
        </Button>
      </div>

      {/* 2. Compact Session Summary Pills */}
      {!isPending && !isError && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 select-none">
          <Card className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">Scheduled</span>
              <p className="text-lg sm:text-xl font-semibold text-[#0F172A] leading-tight">
                {summaryMetrics.scheduled}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#315FEA] flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">In Progress</span>
              <p className="text-lg sm:text-xl font-semibold text-[#0F172A] leading-tight">
                {summaryMetrics.inProgress}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center shrink-0">
              <Hourglass size={16} />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#475569]">Completed</span>
              <p className="text-lg sm:text-xl font-semibold text-[#0F172A] leading-tight">
                {summaryMetrics.completed}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </Card>
        </div>
      )}

      {/* 3. Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 select-none">
        {/* Student Selector Filter */}
        <div className="w-full sm:w-60">
          <select
            value={selectedStudentProfileId}
            onChange={(e) => setSelectedStudentProfileId(e.target.value)}
            aria-label="Filter sessions by student"
            className="w-full h-10 px-3 text-sm text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors cursor-pointer"
          >
            <option value="">All students</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>
                {student.student_user?.full_name || student.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector Filter */}
        <div className="w-full sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as SessionStatus | "all")}
            aria-label="Filter sessions by lifecycle status"
            className="w-full h-10 px-3 text-sm text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters CTA */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-xs text-[#64748B] hover:text-[#0F172A] px-3 h-10 self-start sm:self-auto"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* 4. Session List Presentation */}
      {isPending ? (
        <SessionsLoadingSkeleton />
      ) : isError ? (
        <SessionsErrorState error={error} onRetry={() => refetch()} />
      ) : sessions.length === 0 ? (
        hasActiveFilters ? (
          <NoFilteredSessionsState onClear={handleClearFilters} />
        ) : (
          <NoSessionsEmptyState onSchedule={() => setIsScheduleModalOpen(true)} />
        )
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)] select-none">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]/75 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th scope="col" className="py-3 px-6 w-1/4">
                    Date & Time
                  </th>
                  <th scope="col" className="py-3 px-6 w-1/5">
                    Student
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Session Topic
                  </th>
                  <th scope="col" className="py-3 px-6 w-32">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-6 text-right w-24">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {sessions.map((session) => (
                  <SessionTableRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Items */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {sessions.map((session) => (
              <SessionMobileItem key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Shared Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Desktop Table Row                                                  */
/* ------------------------------------------------------------------ */
const SessionTableRow: React.FC<{ session: SessionResponse }> = ({ session }) => {
  const { dateLabel, timeRange } = formatSessionSchedule(
    session.scheduled_start,
    session.scheduled_end
  );

  const isInProgress = session.status === "in_progress";
  const actionLabel = getActionLabel(session.status);

  return (
    <tr
      className={`hover:bg-[#F8FAFC] transition-colors duration-150 group ${
        isInProgress ? "bg-[#FFFDF5]" : ""
      }`}
    >
      {/* Date & Time */}
      <td className="py-3.5 px-6 align-top">
        <div className="space-y-0.5">
          <span className="block text-sm font-semibold text-[#0F172A] leading-tight">
            {dateLabel}
          </span>
          <span className="block text-xs text-[#64748B] font-normal">
            {timeRange}
          </span>
        </div>
      </td>

      {/* Student Identity */}
      <td className="py-3.5 px-6 align-top">
        <Link
          to={`/dashboard/students/${session.student_profile_id}`}
          className="text-sm font-medium text-[#0F172A] hover:text-[#315FEA] transition-colors block truncate"
        >
          {session.student_name || "Assigned Student"}
        </Link>
      </td>

      {/* Topic */}
      <td className="py-3.5 px-6 align-top">
        <div className="space-y-1">
          <Link
            to={`/sessions/${session.id}`}
            className="text-sm font-medium text-[#0F172A] group-hover:text-[#315FEA] transition-colors leading-snug block line-clamp-2"
          >
            {session.topic}
          </Link>
          {session.meeting_url && session.status === "scheduled" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
              <Video size={12} className="text-[#94A3B8]" />
              Online Meeting
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="py-3.5 px-6 align-top">
        <SessionStatusBadge status={session.status} />
      </td>

      {/* Action */}
      <td className="py-3.5 px-6 text-right align-top">
        <Link
          to={`/sessions/${session.id}`}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
            isInProgress
              ? "bg-[#315FEA] text-white border-[#315FEA] hover:bg-[#284FC7]"
              : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <span>{actionLabel}</span>
          <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  );
};

/* ------------------------------------------------------------------ */
/* Mobile Stacked Item                                                */
/* ------------------------------------------------------------------ */
const SessionMobileItem: React.FC<{ session: SessionResponse }> = ({ session }) => {
  const { dateLabel, timeRange } = formatSessionSchedule(
    session.scheduled_start,
    session.scheduled_end
  );

  const isInProgress = session.status === "in_progress";
  const actionLabel = getActionLabel(session.status);

  return (
    <div className={`p-4 space-y-3 ${isInProgress ? "bg-[#FFFDF5]" : ""}`}>
      {/* Date & Status Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <Calendar size={13} className="text-[#94A3B8]" />
          <span className="font-semibold text-[#0F172A]">{dateLabel}</span>
          <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
          <span>{timeRange}</span>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      {/* Student Link + Topic */}
      <div className="space-y-1">
        <Link
          to={`/dashboard/students/${session.student_profile_id}`}
          className="text-xs font-medium text-[#315FEA] block"
        >
          {session.student_name || "Student Profile"}
        </Link>
        <Link
          to={`/sessions/${session.id}`}
          className="block text-sm font-semibold text-[#0F172A] hover:text-[#315FEA] leading-snug"
        >
          {session.topic}
        </Link>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between">
        {session.meeting_url && session.status === "scheduled" ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
            <Video size={12} className="text-[#94A3B8]" />
            Meeting Link
          </span>
        ) : (
          <span className="text-[11px] text-[#94A3B8]">ID #{session.id.slice(0, 8)}</span>
        )}

        <Link
          to={`/sessions/${session.id}`}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            isInProgress
              ? "bg-[#315FEA] text-white border-[#315FEA]"
              : "bg-white text-[#475569] border-[#E2E8F0]"
          }`}
        >
          <span>{actionLabel}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Helpers & Badges                                                   */
/* ------------------------------------------------------------------ */
const SessionStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const configs: Record<SessionStatus, { label: string; className: string; icon?: React.ReactNode }> = {
    scheduled: {
      label: "Scheduled",
      className: "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]",
      icon: <Hourglass size={11} className="animate-spin" />,
    },
    completed: {
      label: "Completed",
      className: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    },
    ai_reviewed: {
      label: "AI Reviewed",
      className: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
      icon: <Sparkles size={11} />,
    },
  };

  const current = configs[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border select-none ${current.className}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};

function formatSessionSchedule(startIso: string, endIso: string) {
  try {
    const startDate = parseISO(startIso);
    const endDate = parseISO(endIso);
    return {
      dateLabel: format(startDate, "MMM d, yyyy"),
      timeRange: `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`,
    };
  } catch {
    return {
      dateLabel: startIso,
      timeRange: `${startIso} – ${endIso}`,
    };
  }
}

function getActionLabel(status: SessionStatus): string {
  switch (status) {
    case "in_progress":
      return "Continue";
    case "scheduled":
    case "completed":
    case "ai_reviewed":
    default:
      return "View";
  }
}

/* ------------------------------------------------------------------ */
/* Empty States                                                       */
/* ------------------------------------------------------------------ */
const NoSessionsEmptyState: React.FC<{ onSchedule: () => void }> = ({ onSchedule }) => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
      <Calendar size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">No sessions yet</h3>
    <p className="mt-1 text-xs sm:text-sm text-[#64748B] max-w-sm leading-relaxed">
      Schedule a tutoring session with any of your students to begin organizing lesson objectives and taking live notes.
    </p>
    <Button
      variant="primary"
      size="sm"
      onClick={onSchedule}
      className="mt-5 gap-2 text-xs font-semibold h-9"
    >
      <CalendarPlus size={15} />
      <span>Schedule session</span>
    </Button>
  </Card>
);

const NoFilteredSessionsState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <Clock size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No sessions match these filters</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      Try choosing a different student or session lifecycle status.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={onClear}
      className="mt-4 text-xs h-8"
    >
      Clear filters
    </Button>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */
const SessionsLoadingSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 divide-y divide-[#E2E8F0] space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="py-3 flex items-center justify-between gap-4">
        <div className="space-y-1.5 w-1/4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-4 w-28 hidden sm:block" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Error State                                                        */
/* ------------------------------------------------------------------ */
const SessionsErrorState: React.FC<{
  error: unknown;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="bg-white rounded-xl border border-red-200 p-8 text-center flex flex-col items-center justify-center select-none">
    <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
      <AlertCircle size={20} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">
      We couldn't load your sessions
    </h3>
    <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
      {error instanceof Error
        ? error.message
        : "We encountered a network issue retrieving your session schedule."}
    </p>
    <Button
      variant="secondary"
      size="sm"
      onClick={onRetry}
      className="mt-4 gap-1.5 text-xs"
    >
      <RotateCcw size={13} />
      <span>Try again</span>
    </Button>
  </div>
);

export default SessionsPage;