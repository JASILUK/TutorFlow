import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { X, Calendar as CalendarIcon, Video } from "lucide-react";
import { SessionResponse, SessionStatus } from "@/types/sessions";

interface CalendarMonthViewProps {
  gridDays: Date[];
  currentMonth: Date;
  sessions: SessionResponse[];
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  gridDays,
  currentMonth,
  sessions,
}) => {
  const navigate = useNavigate();
  // Expanded daily popover on dates with more than 3 sessions
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  const activeExpandedSessions = expandedDay
    ? sessions.filter((s) => isSameDay(parseISO(s.scheduled_start), expandedDay))
    : [];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden select-none flex flex-col relative">
      
      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            className="p-2.5 sm:p-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days 7x5 or 7x6 Grid Matrix */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8F0]/70 bg-[#F1F5F9]/30">
        {gridDays.map((day) => {
          const isCurrMonth = isSameMonth(day, currentMonth);
          const isCurrDay = isToday(day);
          const daySessions = sessions.filter((s) =>
            isSameDay(parseISO(s.scheduled_start), day)
          );

          const visibleSessions = daySessions.slice(0, 3);
          const remainingCount = daySessions.length - 3;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[92px] sm:min-h-[120px] p-1.5 sm:p-2.5 transition-colors flex flex-col ${
                !isCurrMonth
                  ? "bg-[#F8FAFC]/60 text-[#94A3B8]"
                  : isCurrDay
                  ? "bg-[#EEF2FF]/25"
                  : "bg-white"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform ${
                    isCurrDay
                      ? "bg-[#315FEA] text-white shadow-sm"
                      : isCurrMonth
                      ? "text-[#0F172A]"
                      : "text-[#94A3B8]"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {daySessions.length > 0 && (
                  <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-[#94A3B8]">
                    {daySessions.length} {daySessions.length === 1 ? "session" : "sessions"}
                  </span>
                )}
              </div>

              {/* Event Stack */}
              <div className="space-y-1 flex-1">
                {visibleSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-medium leading-snug truncate block transition-all hover:opacity-90 active:scale-[0.98] border ${getMonthColorPill(
                      session.status
                    )}`}
                    title={`${session.student_name}: ${session.topic}`}
                  >
                    <span className="font-bold mr-1">
                      {format(parseISO(session.scheduled_start), "h:mm")}
                    </span>
                    <span>{session.student_name || "Student"}</span>
                  </button>
                ))}

                {/* Overflow trigger */}
                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedDay(day)}
                    className="w-full text-left text-[10px] font-semibold text-[#315FEA] hover:text-[#1E3EB4] px-1 py-0.5 rounded hover:bg-[#EEF2FF]/50 transition-colors"
                  >
                    +{remainingCount} more…
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================
          OVERFLOW DAY DIALOG POPOVER
          =================================================================== */}
      {expandedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-[#315FEA]" />
                <h4 className="text-sm font-bold text-[#0F172A]">
                  {format(expandedDay, "EEEE, MMMM d, yyyy")}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setExpandedDay(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-[#F1F5F9]">
              {activeExpandedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#0F172A] group-hover:text-[#315FEA] truncate">
                      {session.student_name}
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                      {session.topic}
                    </p>
                    <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                      {format(parseISO(session.scheduled_start), "h:mm a")} – {format(parseISO(session.scheduled_end), "h:mm a")}
                    </p>
                  </div>
                  {session.meeting_url && (
                    <Video size={14} className="text-[#315FEA] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getMonthColorPill(status: SessionStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]";
    case "completed":
      return "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]";
    case "ai_reviewed":
      return "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]";
    case "scheduled":
    default:
      return "bg-[#EEF2FF] text-[#1E40AF] border-[#BFDBFE]";
  }
}

export default CalendarMonthView;