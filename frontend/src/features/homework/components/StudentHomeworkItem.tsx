// src/features/homework/components/StudentHomeworkItem.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Video, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { HomeworkTaskResponse } from "@/types/homework";

interface StudentHomeworkItemProps {
  task: HomeworkTaskResponse;
  onToggleComplete: (task: HomeworkTaskResponse) => Promise<void>;
  isMutating: boolean;
}

export const StudentHomeworkItem: React.FC<StudentHomeworkItemProps> = ({
  task,
  onToggleComplete,
  isMutating,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDescription = task.description && task.description.length > 180;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutating) return;
    onToggleComplete(task);
  };

  const formattedSessionDate = task.session?.scheduled_start
    ? formatSessionStart(task.session.scheduled_start)
    : null;

  return (
    <div
      className={`p-4 sm:p-5 transition-colors border-b last:border-b-0 border-[#E2E8F0] flex flex-col sm:flex-row sm:items-start gap-3.5 sm:gap-4 ${
        task.is_completed ? "bg-[#FAFAFC]/70" : "bg-white hover:bg-[#F8FAFC]/50"
      }`}
    >
      {/* 1. Left Checkbox Column */}
      <div className="pt-0.5 shrink-0 flex items-center sm:items-start">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.is_completed}
          aria-label={
            task.is_completed
              ? `Mark Incomplete: ${task.title}`
              : `Mark Complete: ${task.title}`
          }
          disabled={isMutating}
          onClick={handleCheckboxClick}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 ${
            task.is_completed
              ? "bg-[#16A34A] border-[#16A34A] text-white"
              : "border-[#CBD5E1] hover:border-[#315FEA] bg-white text-transparent"
          } ${isMutating ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
        >
          <Check
            size={13}
            strokeWidth={3}
            className={`transition-transform duration-150 ${
              task.is_completed ? "scale-100" : "scale-0"
            }`}
          />
        </button>
      </div>

      {/* 2. Middle Task Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title & Inline Status */}
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`text-sm sm:text-[15px] font-semibold tracking-tight break-words ${
              task.is_completed ? "text-[#64748B] line-through" : "text-[#0F172A]"
            }`}
          >
            {task.title}
          </h3>

          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border select-none ${
              task.is_completed
                ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
            }`}
          >
            {task.is_completed ? "Completed" : "To do"}
          </span>
        </div>

        {/* Task Instructions / Description */}
        {task.description && (
          <div className="space-y-1">
            <p
              className={`text-xs sm:text-[13px] leading-relaxed break-words whitespace-pre-line ${
                task.is_completed ? "text-[#94A3B8]" : "text-[#475569]"
              } ${!isExpanded && isLongDescription ? "line-clamp-2" : ""}`}
            >
              {task.description}
            </p>

            {isLongDescription && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#315FEA] hover:underline pt-0.5"
              >
                <span>{isExpanded ? "Show less" : "Show full instructions"}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}

        {/* Session Context Anchor */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#64748B] pt-0.5">
          {task.session ? (
            <div className="inline-flex items-center gap-1.5 truncate">
              <Video size={13} className="text-[#94A3B8] shrink-0" />
              <span className="text-[#64748B]">From lesson:</span>
              <span className="font-medium text-[#0F172A] truncate">
                {task.session.topic}
              </span>
              {formattedSessionDate && (
                <>
                  <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    {formattedSessionDate}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-[#94A3B8]">Session unavailable</span>
          )}
        </div>
      </div>

      {/* 3. Right Action Column: Canonical Route Navigation */}
      {task.session && (
        <div className="pt-1 sm:pt-0 shrink-0 self-start sm:self-center">
          <Link
            to={`/sessions/${task.session_id}`}
            state={{ from: "/portal/homework", label: "My Homework" }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#475569] hover:text-[#315FEA] bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] hover:border-[#BFDBFE] transition-colors"
          >
            <span>View session</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
};

function formatSessionStart(isoDate: string): string {
  try {
    const d = parseISO(isoDate);
    if (isToday(d)) {
      return `Today · ${format(d, "h:mm a")}`;
    }
    if (isTomorrow(d)) {
      return `Tomorrow · ${format(d, "h:mm a")}`;
    }
    return format(d, "MMM d · h:mm a");
  } catch {
    return isoDate;
  }
}