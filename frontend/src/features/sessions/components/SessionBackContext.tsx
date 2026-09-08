// src/features/sessions/components/SessionBackContext.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SessionResponse } from "@/types/sessions";

interface NavigationState {
  from?: string;
  label?: string;
}

interface SessionBackContextProps {
  session: SessionResponse;
  isTutor: boolean;
}

export const SessionBackContext: React.FC<SessionBackContextProps> = ({
  session,
  isTutor,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as NavigationState | null;

  // Resolve safe origin based on role and location.state
  const backTarget = React.useMemo(() => {
    if (navState?.from) {
      // Guard against student receiving a tutor route in state
      if (!isTutor && navState.from.startsWith("/dashboard")) {
        return { path: "/portal/sessions", label: "My Sessions" };
      }
      return {
        path: navState.from,
        label: navState.label || (isTutor ? "Sessions" : "My Sessions"),
      };
    }

    if (isTutor) {
      return { path: "/dashboard/sessions", label: "Sessions" };
    }

    return { path: "/portal/sessions", label: "My Sessions" };
  }, [navState, isTutor]);

  const handleBackClick = () => {
    if (window.history.length > 2) {
      navigate(backTarget.path);
    } else {
      navigate(isTutor ? "/dashboard/sessions" : "/portal/sessions");
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 text-xs select-none">
      <button
        type="button"
        onClick={handleBackClick}
        className="inline-flex items-center gap-1.5 text-[#64748B] hover:text-[#0F172A] font-medium transition-colors p-1 -ml-1 rounded-md hover:bg-slate-100"
        aria-label={`Back to ${backTarget.label}`}
      >
        <ArrowLeft size={14} />
        <span>{backTarget.label}</span>
      </button>

      <ChevronRight size={12} className="text-[#CBD5E1]" aria-hidden="true" />

      {/* Show student link strictly for tutors arriving from student detail */}
      {isTutor && navState?.from?.includes("/dashboard/students/") && (
        <>
          <Link
            to={navState.from}
            className="text-[#64748B] hover:text-[#315FEA] font-medium truncate max-w-[150px] transition-colors"
          >
            {session.student_name}
          </Link>
          <ChevronRight size={12} className="text-[#CBD5E1]" aria-hidden="true" />
        </>
      )}

      <span className="text-[#0F172A] font-semibold truncate max-w-[240px] sm:max-w-md">
        {session.topic}
      </span>
    </div>
  );
};