import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  isToday,
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
} from "date-fns";
import { Clock, Video, ChevronLeft, ChevronRight } from "lucide-react";
import {
  CALENDAR_START_HOUR,
  HOUR_HEIGHT_PX,
  TOTAL_HOURS,
  computeDaySessionLayout,
} from "../calendarLayout";
import { SessionResponse, SessionStatus } from "@/types/sessions";

interface CalendarWeekViewProps {
  days: Date[];
  sessions: SessionResponse[];
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => CALENDAR_START_HOUR + i);

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({ days, sessions }) => {
  const navigate = useNavigate();
  // Mobile day selector state (defaults to today if in range, otherwise first day of week)
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState<number>(() => {
    const todayIdx = days.findIndex((d) => isToday(d));
    return todayIdx >= 0 ? todayIdx : 0;
  });

  // Current time marker position
  const [nowPosition, setNowPosition] = useState<number | null>(null);

  useEffect(() => {
    const updateTimeMarker = () => {
      const now = new Date();
      const currentHour = getHours(now);
      const currentMin = getMinutes(now);

      if (currentHour >= CALENDAR_START_HOUR && currentHour < CALENDAR_START_HOUR + TOTAL_HOURS) {
        const minutesFromStart = (currentHour - CALENDAR_START_HOUR) * 60 + currentMin;
        setNowPosition((minutesFromStart / 60) * HOUR_HEIGHT_PX);
      } else {
        setNowPosition(null);
      }
    };

    updateTimeMarker();
    const interval = setInterval(updateTimeMarker, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeMobileDay = days[selectedMobileDayIndex] || days[0];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col select-none">
      
      {/* ===================================================================
          1. MOBILE DAY SWITCHER (Visible on screens < md)
          =================================================================== */}
      <div className="md:hidden border-b border-[#E2E8F0] bg-[#F8FAFC]/90 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            {format(activeMobileDay, "EEEE, MMM d")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedMobileDayIndex((idx) => Math.max(0, idx - 1))}
              disabled={selectedMobileDayIndex === 0}
              className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedMobileDayIndex((idx) => Math.min(days.length - 1, idx + 1))}
              disabled={selectedMobileDayIndex === days.length - 1}
              className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 7-Day Quick Touch Horizon */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, idx) => {
            const isSelected = idx === selectedMobileDayIndex;
            const dayIsToday = isToday(day);
            const count = sessions.filter((s) => isSameDay(parseISO(s.scheduled_start), day)).length;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedMobileDayIndex(idx)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? "bg-[#315FEA] text-white shadow-sm ring-2 ring-[#315FEA]/20"
                    : dayIsToday
                    ? "bg-[#EEF2FF] text-[#315FEA] font-semibold border border-[#BFDBFE]"
                    : "bg-white text-[#64748B] border border-[#E2E8F0]"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase">{format(day, "EE")[0]}</span>
                <span className="text-sm font-bold mt-0.5">{format(day, "d")}</span>
                {count > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white" : "bg-[#315FEA]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          2. DESKTOP DAY HEADER BAR (Visible on screens >= md)
          =================================================================== */}
      <div className="hidden md:grid md:grid-cols-[68px_repeat(7,1fr)] border-b border-[#E2E8F0] bg-[#F8FAFC]/90 sticky top-0 z-20">
        <div className="p-3.5 border-r border-[#E2E8F0]/70 flex items-center justify-center text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          <Clock size={13} className="mr-1" />
        </div>
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`py-3 px-2 text-center border-r last:border-r-0 border-[#E2E8F0]/70 transition-colors ${
                isCurrentDay ? "bg-[#EEF2FF]/40" : ""
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
                {format(day, "EEE")}
              </span>
              <span
                className={`text-[15px] font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full transition-transform ${
                  isCurrentDay
                    ? "bg-[#315FEA] text-white shadow-sm"
                    : "text-[#0F172A]"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* ===================================================================
          3. TIME GRID AREA
          =================================================================== */}
      <div className="overflow-y-auto max-h-[700px] relative divide-x divide-[#E2E8F0]/70 flex-1 bg-[#FAFAFC]">
        {/* Desktop 7-Col View */}
        <div className="hidden md:grid md:grid-cols-[68px_repeat(7,1fr)]">
          {/* Time Gutter */}
          <div className="relative border-r border-[#E2E8F0]/70 bg-[#F8FAFC]/50" style={{ height: TOTAL_HOURS * HOUR_HEIGHT_PX }}>
            {HOURS.map((hour, idx) => (
              <div
                key={hour}
                className="absolute right-2.5 text-[11px] font-mono font-medium text-[#94A3B8] -translate-y-2 select-none"
                style={{ top: idx * HOUR_HEIGHT_PX }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), "h a")}
              </div>
            ))}
          </div>

          {/* 7 Columns */}
          {days.map((day) => {
            const positioned = computeDaySessionLayout(day, sessions);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-r last:border-r-0 border-[#E2E8F0]/70 ${
                  isCurrentDay ? "bg-[#EEF2FF]/10" : ""
                }`}
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT_PX }}
              >
                {/* Guidelines */}
                {HOURS.map((hour, idx) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-[#E2E8F0]/60"
                    style={{ top: idx * HOUR_HEIGHT_PX }}
                  />
                ))}

                {/* Real-time Indicator line */}
                {isCurrentDay && nowPosition !== null && (
                  <div
                    className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                    style={{ top: `${nowPosition}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] -ml-1.5 shadow-sm" />
                    <div className="flex-1 border-t-2 border-[#DC2626]" />
                  </div>
                )}

                {/* Session Card Blocks */}
                {positioned.map(({ session, top, height, leftPercent, widthPercent }) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    className={`absolute rounded-lg p-2 text-left transition-all z-10 overflow-hidden border shadow-[0_1px_2px_rgba(15,23,42,0.06)] group hover:ring-2 hover:ring-[#315FEA] hover:z-30 cursor-pointer ${getSessionColorToken(
                      session.status
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1 leading-none mb-1">
                      <span className="text-[12px] font-bold tracking-tight truncate group-hover:underline">
                        {session.student_name || "Student"}
                      </span>
                      {session.meeting_url && (
                        <Video size={12} className="shrink-0 opacity-70" />
                      )}
                    </div>
                    <p className="text-[11px] leading-snug font-medium line-clamp-1 opacity-90">
                      {session.topic}
                    </p>
                    <p className="text-[10px] font-mono opacity-80 mt-1">
                      {format(parseISO(session.scheduled_start), "h:mm")} – {format(parseISO(session.scheduled_end), "h:mm a")}
                    </p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Mobile Single-Day View */}
        <div className="md:hidden grid grid-cols-[56px_1fr]">
          <div className="relative border-r border-[#E2E8F0]/70 bg-[#F8FAFC]/50" style={{ height: TOTAL_HOURS * HOUR_HEIGHT_PX }}>
            {HOURS.map((hour, idx) => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] font-mono font-medium text-[#94A3B8] -translate-y-2 select-none"
                style={{ top: idx * HOUR_HEIGHT_PX }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), "ha")}
              </div>
            ))}
          </div>

          <div
            className="relative"
            style={{ height: TOTAL_HOURS * HOUR_HEIGHT_PX }}
          >
            {HOURS.map((hour, idx) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-[#E2E8F0]/60"
                style={{ top: idx * HOUR_HEIGHT_PX }}
              />
            ))}

            {isToday(activeMobileDay) && nowPosition !== null && (
              <div
                className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                style={{ top: `${nowPosition}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-[#DC2626] -ml-1" />
                <div className="flex-1 border-t-2 border-[#DC2626]" />
              </div>
            )}

            {computeDaySessionLayout(activeMobileDay, sessions).map(
              ({ session, top, height, leftPercent, widthPercent }) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  className={`absolute rounded-lg p-2.5 text-left border shadow-sm z-10 overflow-hidden ${getSessionColorToken(
                    session.status
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1 leading-none mb-1">
                    <span className="text-[13px] font-bold truncate">
                      {session.student_name || "Student"}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/70">
                      {session.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs leading-snug font-medium line-clamp-1">
                    {session.topic}
                  </p>
                  <p className="text-[10px] font-mono opacity-80 mt-1">
                    {format(parseISO(session.scheduled_start), "h:mm a")} – {format(parseISO(session.scheduled_end), "h:mm a")}
                  </p>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function getSessionColorToken(status: SessionStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    case "completed":
      return "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]";
    case "ai_reviewed":
      return "bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]";
    case "scheduled":
    default:
      return "bg-[#EEF2FF] text-[#1E40AF] border-[#BFDBFE]";
  }
}

export default CalendarWeekView;