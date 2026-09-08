// src/features/calendar/CalendarPage.tsx
import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  RotateCcw,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
} from "date-fns";

import { useSessions } from "@/features/sessions/hooks/useSessions";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { ScheduleSessionModal } from "@/features/sessions/components/ScheduleSessionModal";
import { CalendarWeekView } from "./components/CalendarWeekView";
import { CalendarMonthView } from "./components/CalendarMonthView";

type CalendarView = "week" | "month";

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // 1. Determine visible date-range boundaries based on active view
  const { queryRange, gridDays, rangeLabel } = useMemo(() => {
    if (view === "week") {
      // Start on Monday, end on Sunday
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      return {
        queryRange: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
        },
        gridDays: days,
        rangeLabel: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
      };
    } else {
      // Month View: Full visual grid (starting Sunday to Saturday)
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

      return {
        queryRange: {
          start: gridStart.toISOString(),
          end: gridEnd.toISOString(),
        },
        gridDays: days,
        rangeLabel: format(currentDate, "MMMM yyyy"),
      };
    }
  }, [currentDate, view]);

  // 2. Fetch sessions scoped strictly to the visible date range
  const {
    data: sessions = [],
    isPending,
    isError,
    error,
    refetch,
  } = useSessions({
    start: queryRange.start,
    end: queryRange.end,
    limit: 100,
  });

  // Navigation handlers
  const handlePrevious = () => {
    if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <PageContainer>
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
            Calendar
          </h1>
          <p className="text-sm text-[#475569] mt-0.5">
            View and manage your scheduled tutoring sessions.
          </p>
        </div>

        {/* Action Button: Reuses ScheduleSessionModal */}
        <Button
          variant="primary"
          onClick={() => setIsScheduleModalOpen(true)}
          className="gap-2 shrink-0 self-start md:self-auto text-xs font-semibold h-10 px-4"
        >
          <CalendarPlus size={16} strokeWidth={2} />
          <span>Schedule session</span>
        </Button>
      </div>

      {/* 2. Calendar Toolbar: Today / Prev / Next / Date Range / View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 select-none">
        <div className="flex items-center gap-2">
          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs font-semibold h-9 px-3"
          >
            Today
          </Button>

          {/* Prev / Next Arrows */}
          <div className="flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={handlePrevious}
              aria-label="Previous time period"
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]" />
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next time period"
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Dynamic Range Label */}
          <span className="text-sm sm:text-base font-semibold text-[#0F172A] ml-2">
            {rangeLabel}
          </span>
        </div>

        {/* View Switcher: Week vs Month */}
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "week"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              view === "month"
                ? "bg-white text-[#315FEA] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* 3. Calendar View Surface */}
      {isPending ? (
        <CalendarLoadingSkeleton view={view} />
      ) : isError ? (
        <CalendarErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          {view === "week" ? (
            <CalendarWeekView days={gridDays} sessions={sessions} />
          ) : (
            <CalendarMonthView
              gridDays={gridDays}
              currentMonth={currentDate}
              sessions={sessions}
            />
          )}
        </div>
      )}

      {/* Empty State Banner (Displayed beneath if current view has 0 sessions scheduled) */}
      {!isPending && !isError && sessions.length === 0 && (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-[#CBD5E1] bg-white text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#315FEA] flex items-center justify-center shrink-0">
              <CalendarIcon size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0F172A]">
                No sessions scheduled for this period
              </p>
              <p className="text-[11px] text-[#64748B]">
                Your calendar is clear. Plan a lesson with any student when you're ready.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScheduleModalOpen(true)}
            className="text-xs shrink-0"
          >
            Schedule session
          </Button>
        </div>
      )}

      {/* 4. Reused Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Skeleton Loading State                                             */
/* ------------------------------------------------------------------ */
const CalendarLoadingSkeleton: React.FC<{ view: CalendarView }> = ({ view }) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
    <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-24" />
    </div>
    {view === "week" ? (
      <div className="grid grid-cols-8 gap-2 h-[420px]">
        <Skeleton className="h-full w-full rounded-md" />
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-md" />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-7 gap-2 h-[420px]">
        {[...Array(28)].map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-md" />
        ))}
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Error State                                                        */
/* ------------------------------------------------------------------ */
const CalendarErrorState: React.FC<{
  error: unknown;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200">
    <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
      <AlertCircle size={20} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">
      Couldn't load your schedule
    </h3>
    <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
      {error instanceof Error
        ? error.message
        : "We encountered a network issue retrieving session slots for this period."}
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
  </Card>
);

export default CalendarPage;