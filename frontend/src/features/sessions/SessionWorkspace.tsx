// src/features/sessions/SessionWorkspace.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";

import { useSession } from "@/features/sessions/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Skeleton } from "@/components/ui/core-primitives";
import { SessionBackContext } from "./components/SessionBackContext";
import { TutorSessionWorkspace } from "./components/TutorSessionWorkspace";
import { StudentSessionView } from "./components/StudentSessionView";

export const SessionWorkspace: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Guard against missing or invalid param
  const validSessionId = sessionId && sessionId !== "undefined" ? sessionId : undefined;

  const {
    data: session,
    isPending,
    isError,
    error,
    refetch,
  } = useSession(validSessionId);

  // Authoritative role evaluation
  const isTutor = user?.role === "tutor" || user?.role === "admin";
  const isStudent = user?.role === "student";

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton                                                   */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error / Access Denied Safe State                                  */
  /* ------------------------------------------------------------------ */
  if (isError || !session || !validSessionId) {
    const handleSafeFallback = () => {
      navigate(isTutor ? "/dashboard/sessions" : "/portal/sessions");
    };

    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#DC2626] border border-red-100 flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A] mb-1">
            Unable to load this session
          </h2>
          <p className="text-sm text-[#475569] max-w-md mb-6 leading-relaxed">
            {error instanceof Error
              ? error.message
              : "This session could not be retrieved or you do not have permission to view it."}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSafeFallback} className="gap-2">
              <ArrowLeft size={16} />
              <span>{isTutor ? "Back to Sessions" : "Back to My Sessions"}</span>
            </Button>
            {validSessionId && (
              <Button variant="secondary" onClick={() => refetch()} className="gap-1.5">
                <RotateCcw size={14} />
                <span>Try again</span>
              </Button>
            )}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 1. Role-aware & context-aware back navigation */}
      <SessionBackContext session={session} isTutor={isTutor} />

      {/* 2. Render strictly by role */}
      {isTutor && <TutorSessionWorkspace session={session} />}
      {isStudent && <StudentSessionView session={session} />}
    </PageContainer>
  );
};

export default SessionWorkspace;