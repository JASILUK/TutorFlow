// src/features/students/components/StudentSessionsTab.tsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  ArrowRight,
  CalendarPlus,
  AlertCircle,
  RotateCcw,
  Video,
} from "lucide-react";
import { format, parseISO } from "date-fns";



import { useSessions } from "@/features/sessions/hooks/useSessions";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { ScheduleSessionModal } from "@/features/sessions/components/ScheduleSessionModal";
import { SessionResponse, SessionStatus } from "@/types/sessions";

interface StudentSessionsTabProps {
  profileId: string;
}

const STATUS_OPTIONS: { label: string; value: SessionStatus | "all" }[] = [
  { label: "All sessions", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "AI reviewed", value: "ai_reviewed" },
];

export const StudentSessionsTab: React.FC<StudentSessionsTabProps> = ({
  profileId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<SessionStatus | "all">("all");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Query parameters strictly bound to this student profile
  const queryParams = useMemo(() => {
    return {
      student_profile_id: profileId,
      status: selectedFilter === "all" ? undefined : selectedFilter,
      limit: 50,
    };
  }, [profileId, selectedFilter]);

  const {
    data: sessions = [],
    isPending,
    isError,
    error,
    refetch,
  } = useSessions(queryParams);

  const isFiltered = selectedFilter !== "all";

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton State                                             */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return <SessionsSkeleton />;
  }

  /* ------------------------------------------------------------------ */
  /* Error State                                                        */
  /* ------------------------------------------------------------------ */
  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center flex flex-col items-center justify-center select-none">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Unable to load sessions
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
          {error instanceof Error
            ? error.message
            : "We encountered an issue retrieving sessions for this student."}
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

  return (
    <div className="space-y-5 select-none">
      {/* 1. Header Toolbar: Title, Filter, Primary Schedule CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] tracking-tight">
            Sessions
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Upcoming and historical teaching sessions with this student.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedFilter}
              onChange={(e) =>
                setSelectedFilter(e.target.value as SessionStatus | "all")
              }
              aria-label="Filter sessions by status"
              className="w-full sm:w-44 h-9 px-3 text-xs font-medium text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Action Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScheduleModalOpen(true)}
            className="gap-2 text-xs font-semibold h-9 shrink-0"
          >
            <CalendarPlus size={15} />
            <span>Schedule session</span>
          </Button>
        </div>
      </div>

      {/* 2. Content Area */}
      {sessions.length === 0 ? (
        isFiltered ? (
          <FilteredEmptyState onClear={() => setSelectedFilter("all")} />
        ) : (
          <NoSessionsEmptyState onSchedule={() => setIsScheduleModalOpen(true)} />
        )
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          {/* Desktop Table Presentation */}
          <div className="hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]/75 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
                  <th scope="col" className="py-3 px-6 w-1/4">
                    Date & Time
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Session Topic
                  </th>
                  <th scope="col" className="py-3 px-6 w-36">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-6 text-right w-28">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {sessions.map((session) => (
                  <SessionDesktopRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card Presentation */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {sessions.map((session) => (
              <SessionMobileItem key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Reusable Schedule Session Modal scoped to this student */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        studentProfileId={profileId}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Desktop Table Row                                                  */
/* ------------------------------------------------------------------ */
const SessionDesktopRow: React.FC<{ session: SessionResponse }> = ({
  session,
}) => {
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
              Video Link Ready
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
const SessionMobileItem: React.FC<{ session: SessionResponse }> = ({
  session,
}) => {
  const { dateLabel, timeRange } = formatSessionSchedule(
    session.scheduled_start,
    session.scheduled_end
  );
  const isInProgress = session.status === "in_progress";
  const actionLabel = getActionLabel(session.status);

  return (
    <div className={`p-4 space-y-3 ${isInProgress ? "bg-[#FFFDF5]" : ""}`}>
      {/* Header: Date + Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <Calendar size={13} className="text-[#94A3B8]" />
          <span className="font-semibold text-[#0F172A]">{dateLabel}</span>
          <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
          <span>{timeRange}</span>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      {/* Topic */}
      <Link
        to={`/sessions/${session.id}`}
        className="block text-sm font-semibold text-[#0F172A] hover:text-[#315FEA] leading-snug"
      >
        {session.topic}
      </Link>

      {/* Action Strip */}
      <div className="pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between">
        {session.meeting_url && session.status === "scheduled" ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
            <Video size={12} className="text-[#94A3B8]" />
            Video Meeting
          </span>
        ) : (
          <span className="text-[11px] text-[#94A3B8]">Session ID #{session.id.slice(0, 8)}</span>
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
  const configs: Record<SessionStatus, { label: string; className: string }> = {
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
      return "Open";
    case "completed":
    case "ai_reviewed":
    default:
      return "View";
  }
}

/* ------------------------------------------------------------------ */
/* Empty States                                                       */
/* ------------------------------------------------------------------ */
const NoSessionsEmptyState: React.FC<{ onSchedule: () => void }> = ({
  onSchedule,
}) => (
  <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-3">
      <Calendar size={20} strokeWidth={1.8} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No sessions yet</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-sm leading-relaxed">
      Schedule a session with this student to start organizing lesson plans,
      taking live notes, and generating debriefs.
    </p>
    <Button
      variant="primary"
      size="sm"
      onClick={onSchedule}
      className="mt-4 gap-2 text-xs font-semibold"
    >
      <CalendarPlus size={14} />
      <span>Schedule session</span>
    </Button>
  </Card>
);

const FilteredEmptyState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50">
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <Clock size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No matching sessions</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      No session records matched the selected status filter for this student.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={onClear}
      className="mt-4 text-xs h-8"
    >
      Clear filter
    </Button>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */
const SessionsSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 divide-y divide-[#E2E8F0]">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="py-3 flex items-center justify-between gap-4">
          <div className="space-y-1.5 w-1/4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export default StudentSessionsTab;