// src/features/sessions/components/student/StudentSessionView.tsx
import React from "react";
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  User,
  CheckCircle2,
  Hourglass,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";

import { SessionResponse, SessionStatus } from "@/types/sessions";
import { Card } from "@/components/ui/core-primitives";
import { SessionHomeworkPanel } from "./SessionHomeworkPanel";

interface StudentSessionViewProps {
  session: SessionResponse;
}

export const StudentSessionView: React.FC<StudentSessionViewProps> = ({ session }) => {
  const { dateHeading, timeRange } = formatSessionDates(
    session.scheduled_start,
    session.scheduled_end
  );

  const isInProgress = session.status === "in_progress";
  const isCompleted = session.status === "completed" || session.status === "ai_reviewed";

  return (
    <div className="space-y-6 select-none max-w-5xl">
      {/* 1. Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StudentStatusBadge status={session.status} />
              <span className="text-xs font-semibold text-[#64748B]">
                With {session.tutor_name || "Lead Tutor"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight leading-snug">
              {session.topic}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#475569]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                <Calendar size={14} className="text-[#94A3B8]" />
                {dateHeading}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#64748B] font-mono">
                <Clock size={14} className="text-[#94A3B8]" />
                {timeRange}
              </span>
            </div>
          </div>

          {/* Join action */}
          {session.meeting_url ? (
            <a
              href={session.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow-sm transition-all self-start sm:self-auto shrink-0 ${
                isInProgress
                  ? "bg-[#16A34A] hover:bg-[#15803D]"
                  : "bg-[#315FEA] hover:bg-[#284FC7]"
              }`}
            >
              <Video size={16} />
              <span>Join lesson</span>
              <ExternalLink size={13} className="opacity-75" />
            </a>
          ) : (
            <div className="text-left sm:text-right self-start sm:self-auto shrink-0">
              <span className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg inline-block">
                Meeting link not available yet
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Overview / Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Lesson Prompt */}
          {isInProgress && (
            <Card className="p-6 border-l-4 border-l-[#315FEA] bg-[#FFFDF5] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#854D0E]">
                <Hourglass size={14} className="animate-spin" />
                <span>Lesson is in progress</span>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Your lesson is happening right now. Click the <strong>Join lesson</strong> button
                above to enter the live video room.
              </p>
            </Card>
          )}

          {/* Scheduled Prompt */}
          {session.status === "scheduled" && (
            <Card className="p-6 space-y-2 bg-[#F8FAFC]/60 border-dashed">
              <h3 className="text-sm font-semibold text-[#0F172A]">Upcoming Lesson Preparation</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your lesson is scheduled with {session.tutor_name || "your tutor"}. When it is time
                for class, use the video link above to attend. Any homework assigned for this topic
                is listed in the homework panel.
              </p>
            </Card>
          )}

          {/* Completed Session Review & Outcomes */}
          {isCompleted && (
            <StudentReviewPanel
              summary={session.ai_session_summary}
              suggestedFocus={session.ai_suggested_focus}
              completedAt={session.completed_at}
            />
          )}
        </div>

        {/* Right Column (1 Col): Homework & Context */}
        <div className="space-y-6">
          {/* Homework Panel (Student cannot add/edit/delete, but can toggle completion) */}
          <SessionHomeworkPanel sessionId={session.id} isTutor={false} />

          {/* Context Details */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Lesson Details
              </span>
              <BookOpen size={14} className="text-[#94A3B8]" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[#64748B] block font-medium mb-0.5">Tutor</span>
                <div className="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                  <User size={13} className="text-[#94A3B8]" />
                  <span>{session.tutor_name || "Lead Tutor"}</span>
                </div>
              </div>

              <div>
                <span className="text-[#64748B] block font-medium mb-0.5">Topic</span>
                <span className="text-[#0F172A] font-medium">{session.topic}</span>
              </div>

              {session.completed_at && (
                <div>
                  <span className="text-[#64748B] block font-medium mb-0.5">Completed</span>
                  <span className="text-[#0F172A]">
                    {format(parseISO(session.completed_at), "MMM d, yyyy · h:mm a")}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Student Learning Outcome Review                      */
/* ------------------------------------------------------------------ */
interface StudentReviewPanelProps {
  summary: string | null;
  suggestedFocus: string | null;
  completedAt: string | null;
}

const StudentReviewPanel: React.FC<StudentReviewPanelProps> = ({
  summary,
  suggestedFocus,
  completedAt,
}) => {
  const hasOutcomes = Boolean(summary || suggestedFocus);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A]">
          <CheckCircle2 size={15} />
          <span>Lesson Outcomes & Review</span>
        </div>
        {completedAt && (
          <span className="text-[11px] text-[#94A3B8]">
            Finished {format(parseISO(completedAt), "h:mm a")}
          </span>
        )}
      </div>

      {hasOutcomes ? (
        <div className="space-y-4 text-xs">
          {summary && (
            <div className="space-y-1.5">
              <span className="font-semibold text-[#0F172A] block">Lesson Summary</span>
              <p className="text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                {summary}
              </p>
            </div>
          )}

          {suggestedFocus && (
            <div className="space-y-1.5 pt-2 border-t border-[#F8FAFC]">
              <span className="font-semibold text-[#16A34A] block">What to Focus On Next</span>
              <p className="text-sm text-[#334155] leading-relaxed bg-[#F0FDF4] p-3.5 rounded-xl border border-[#BBF7D0]">
                {suggestedFocus}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center space-y-1">
          <p className="text-xs font-semibold text-[#0F172A]">Lesson completed</p>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
            Your tutor has marked this lesson as complete. Any post-session debrief notes or next
            learning focus areas will appear here.
          </p>
        </div>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Subcomponent: Student Status Badge                                 */
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

function formatSessionDates(startIso: string, endIso: string) {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    return {
      dateHeading: format(start, "EEEE, MMMM d, yyyy"),
      timeRange: `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`,
    };
  } catch {
    return { dateHeading: startIso, timeRange: `${startIso} – ${endIso}` };
  }
}