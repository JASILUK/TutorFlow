// src/features/dashboard/TutorDashboardPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  Clock,
  Video,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

import { useTutorDashboard } from "./hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { ScheduleSessionModal } from "@/features/sessions/components/ScheduleSessionModal";
import {
  DashboardSessionItem,
  StudentsNeedingAttentionItem,
  HomeworkTaskSummaryItem,
} from "@/types/dashboard";
import { SessionStatus } from "@/types/sessions";

export const TutorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = useTutorDashboard();

  if (isPending) {
    return <DashboardLoadingSkeleton />;
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
              : "We couldn't retrieve your teaching workspace right now."}
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

  const {
    summary,
    today_sessions,
    upcoming_sessions,
    students_needing_attention,
    recent_sessions,
    homework_summary,
  } = data;

  // Derive the next actionable session: prioritize in_progress if active, otherwise first today/upcoming
  const activeSession = today_sessions.find((s) => s.status === "in_progress");
  const nextSessionCandidate =
    activeSession ||
    today_sessions.find((s) => s.status === "scheduled") ||
    upcoming_sessions[0] ||
    null;

  const tutorFirstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <PageContainer>
      {/* 1. Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 select-none">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Good morning, {tutorFirstName}. Here is what needs your attention today.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsScheduleModalOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto text-xs font-semibold h-10 px-4 shadow-sm"
        >
          <CalendarPlus size={15} strokeWidth={2} />
          <span>Schedule session</span>
        </Button>
      </div>

      {/* 2. Compact Headline Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-7 select-none">
        <Card className="p-4 flex items-center justify-between border-[#E2E8F0] shadow-xs">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Active Students</span>
            <p className="text-xl font-bold text-[#0F172A] leading-tight">
              {summary.total_students}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center shrink-0">
            <Users size={17} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#315FEA] border-[#E2E8F0] shadow-xs">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Today's Sessions</span>
            <p className="text-xl font-bold text-[#315FEA] leading-tight">
              {summary.sessions_today}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center shrink-0">
            <Calendar size={17} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-[#16A34A] border-[#E2E8F0] shadow-xs">
          <div className="space-y-0.5">
            <span className="text-xs font-medium text-[#475569]">Upcoming Pipeline</span>
            <p className="text-xl font-bold text-[#16A34A] leading-tight">
              {summary.upcoming_sessions}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
            <Clock size={17} />
          </div>
        </Card>
      </div>

      {/* 3. Primary Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Column (2 Cols on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Teaching Schedule Agenda */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden select-none">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-[#315FEA]" />
                <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                  Today's Schedule
                </h2>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full font-medium">
                  {today_sessions.length}
                </span>
              </div>
              <Link
                to="/dashboard/calendar"
                className="text-xs font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <span>Full calendar</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {today_sessions.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-[#F8FAFC]/40">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#315FEA] flex items-center justify-center mx-auto border border-[#BFDBFE]/60">
                  <CheckCircle2 size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    No sessions scheduled today
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
                    Your teaching agenda is clear for the day. You can prepare upcoming lessons or schedule a new one.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="text-xs font-semibold h-8"
                  >
                    Schedule session
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/dashboard/calendar")}
                    className="text-xs font-semibold h-8"
                  >
                    View calendar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {today_sessions.map((session) => (
                  <TodayScheduleRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>

          {/* Actionable Attention Queue */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden select-none">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-[#D97706]" />
                <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                  Needs Attention
                </h2>
                {students_needing_attention.length > 0 && (
                  <span className="text-[11px] font-mono text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.2 rounded-full font-bold">
                    {students_needing_attention.length}
                  </span>
                )}
              </div>
            </div>

            {students_needing_attention.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC]/30">
                <p className="font-semibold text-[#0F172A]">You're all caught up</p>
                <p className="text-[11px] mt-0.5">Nothing is currently awaiting debrief or follow-up.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {students_needing_attention.map((item, idx) => (
                  <AttentionRow key={item.session_id || idx} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Lessons Snapshot */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden select-none">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-[#64748B]" />
                <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                  Upcoming Lessons
                </h2>
              </div>
              <Link
                to="/dashboard/sessions"
                className="text-xs font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {upcoming_sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC]/30">
                No upcoming sessions found in your roster.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {upcoming_sessions.map((session) => (
                  <UpcomingSessionRow key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Supporting Context Column (1 Col on Desktop) */}
        <div className="space-y-6 select-none">
          {/* Next / Active Session Spotlight Card */}
          {nextSessionCandidate && (
            <Card className="p-5 border-[#CBD5E1] shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    nextSessionCandidate.status === "in_progress"
                      ? "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A] animate-pulse"
                      : "bg-[#EEF2FF] text-[#315FEA] border-[#BFDBFE]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      nextSessionCandidate.status === "in_progress"
                        ? "bg-[#D97706]"
                        : "bg-[#315FEA]"
                    }`}
                  />
                  {nextSessionCandidate.status === "in_progress" ? "In Progress" : "Next Session"}
                </span>

                <span className="text-[11px] font-mono text-[#64748B]">
                  {formatSessionShortDate(nextSessionCandidate.scheduled_start)}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <h3 className="text-base font-semibold text-[#0F172A] tracking-tight leading-snug">
                  {nextSessionCandidate.topic}
                </h3>
                <Link
                  to={`/dashboard/students/${nextSessionCandidate.student_profile_id}`}
                  className="text-xs text-[#315FEA] hover:underline font-medium block truncate"
                >
                  {nextSessionCandidate.student_name}
                </Link>
                <p className="text-xs font-mono text-[#64748B]">
                  {format(parseISO(nextSessionCandidate.scheduled_start), "h:mm a")} –{" "}
                  {format(parseISO(nextSessionCandidate.scheduled_end), "h:mm a")}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#F1F5F9]">
                {nextSessionCandidate.meeting_url && (
                  <a
                    href={nextSessionCandidate.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg bg-[#315FEA] hover:bg-[#284FC7] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Video size={14} />
                    <span>Join</span>
                    <ExternalLink size={11} className="opacity-75" />
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/sessions/${nextSessionCandidate.id}`)}
                  className="h-9 px-3 text-xs font-semibold flex-1"
                >
                  <span>Open workspace</span>
                  <ArrowRight size={12} className="ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {/* Pending Homework Queue */}
          <Card className="p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-[#315FEA]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Pending Homework
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.2 rounded font-medium">
                {homework_summary.total_pending}
              </span>
            </div>

            {homework_summary.recent_pending.length === 0 ? (
              <p className="text-xs text-[#64748B] py-2">
                No homework currently waiting for review or completion.
              </p>
            ) : (
              <div className="space-y-2.5 divide-y divide-[#F1F5F9] -mx-1">
                {homework_summary.recent_pending.map((hw) => (
                  <div key={hw.id} className="pt-2 first:pt-0 px-1">
                    <Link
                      to={`/sessions/${hw.session_id}`}
                      className="text-xs font-semibold text-[#0F172A] hover:text-[#315FEA] block truncate leading-snug"
                    >
                      {hw.title}
                    </Link>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-0.5">
                      <span className="truncate">{hw.student_name}</span>
                      <span className="font-mono text-[#94A3B8]">
                        {format(parseISO(hw.created_at), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1">
              <Link
                to="/dashboard/homework"
                className="text-xs font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <span>View all homework</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </Card>

          {/* Recent Finished Sessions History */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Recent Sessions
              </h3>
              <Link
                to="/dashboard/sessions"
                className="text-xs font-semibold text-[#315FEA] hover:underline"
              >
                History
              </Link>
            </div>

            {recent_sessions.length === 0 ? (
              <p className="text-xs text-[#64748B] py-1">No completed sessions recorded yet.</p>
            ) : (
              <div className="space-y-2 divide-y divide-[#F1F5F9] -mx-1">
                {recent_sessions.map((s) => (
                  <div key={s.id} className="pt-2 first:pt-0 px-1">
                    <Link
                      to={`/sessions/${s.id}`}
                      className="text-xs font-semibold text-[#0F172A] hover:text-[#315FEA] block truncate"
                    >
                      {s.topic}
                    </Link>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-0.5">
                      <span className="truncate">{s.student_name}</span>
                      <span className="font-mono text-[#94A3B8]">
                        {format(parseISO(s.scheduled_start), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Reused Session Creation Modal */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Row Components                                                     */
/* ------------------------------------------------------------------ */

const TodayScheduleRow: React.FC<{ session: DashboardSessionItem }> = ({ session }) => {
  const navigate = useNavigate();
  const startTime = format(parseISO(session.scheduled_start), "h:mm a");
  const endTime = format(parseISO(session.scheduled_end), "h:mm a");
  const isInProgress = session.status === "in_progress";

  return (
    <div
      onClick={() => navigate(`/sessions/${session.id}`)}
      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer group ${
        isInProgress ? "bg-[#FFFDF5]" : ""
      }`}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="w-28 shrink-0">
          <span className="text-xs font-bold font-mono text-[#0F172A] block leading-tight">
            {startTime}
          </span>
          <span className="text-[11px] font-mono text-[#64748B] block">{endTime}</span>
        </div>

        <div className="min-w-0 space-y-0.5">
          <h4 className="text-sm font-semibold text-[#0F172A] group-hover:text-[#315FEA] transition-colors truncate">
            {session.topic}
          </h4>
          <p className="text-xs text-[#64748B] truncate font-medium">
            Student: {session.student_name}
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]"
        onClick={(e) => e.stopPropagation()}
      >
        <DashboardStatusBadge status={session.status} />

        {session.meeting_url && (
          <a
            href={session.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#315FEA] hover:text-white bg-[#EEF2FF] hover:bg-[#315FEA] transition-colors"
          >
            <Video size={13} />
            <span>Join</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => navigate(`/sessions/${session.id}`)}
          className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg transition-colors"
          aria-label={`Open session ${session.topic}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const AttentionRow: React.FC<{ item: StudentsNeedingAttentionItem }> = ({ item }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => item.session_id && navigate(`/sessions/${item.session_id}`)}
      className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
    >
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#315FEA] transition-colors truncate">
            {item.student_name}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-1.5 py-0.2 rounded">
            <Hourglass size={10} />
            {item.reason === "pending_debrief" ? "Debrief pending" : item.reason}
          </span>
        </div>
        {item.topic && (
          <p className="text-[11px] text-[#64748B] truncate">Session: {item.topic}</p>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (item.session_id) navigate(`/sessions/${item.session_id}`);
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#315FEA] hover:underline shrink-0"
      >
        <span>Review</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

const UpcomingSessionRow: React.FC<{ session: DashboardSessionItem }> = ({ session }) => {
  const navigate = useNavigate();
  const dateFormatted = formatSessionShortDate(session.scheduled_start);
  const startTime = format(parseISO(session.scheduled_start), "h:mm a");

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
          <span>{session.student_name}</span>
          <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
          <span className="font-mono text-[#94A3B8]">
            {dateFormatted} · {startTime}
          </span>
        </div>
      </div>

      <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
    </div>
  );
};

const DashboardStatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
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

function formatSessionShortDate(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    if (isToday(d)) return "Today";
    return format(d, "EEE, MMM d");
  } catch {
    return isoDate;
  }
}

const DashboardLoadingSkeleton: React.FC = () => (
  <PageContainer>
    <div className="space-y-2 mb-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-7">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  </PageContainer>
);

export default TutorDashboardPage;