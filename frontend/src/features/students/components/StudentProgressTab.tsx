// src/features/students/components/StudentProgressTab.tsx
import React from "react";
import {
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Target,
  RotateCcw,
  Calendar,
  Zap,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import {
  useStudentProgress,
  useGenerateStudentProgress,
} from "@/features/ai/hooks/useAI";
import { Card, Button, Skeleton } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { parseApiError } from "@/services/api/error-handler";

interface StudentProgressTabProps {
  profileId: string;
}

export const StudentProgressTab: React.FC<StudentProgressTabProps> = ({
  profileId,
}) => {
  // 1. Read existing progress from PostgreSQL (zero AI cost)
  const {
    data: progress,
    isPending,
    isError,
    error,
    refetch,
  } = useStudentProgress(profileId);

  // 2. Generation & Regeneration Mutation
  const generateProgressMutation = useGenerateStudentProgress();
  const isGenerating = generateProgressMutation.isPending;

  const handleGenerateProgress = async () => {
    try {
      await generateProgressMutation.mutateAsync(profileId);
      toast.success("Student progress analysis updated.");
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't generate progress analysis.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton State                                             */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return (
      <div className="space-y-6 select-none">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error Recovery State                                               */
  /* ------------------------------------------------------------------ */
  if (isError) {
    return (
      <Card className="p-10 text-center flex flex-col items-center justify-center border-red-200 select-none">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Couldn't load progress data
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred while fetching the progress record."}
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
    );
  }

  /* ------------------------------------------------------------------ */
  /* Empty State: No Analysis Generated Yet                             */
  /* ------------------------------------------------------------------ */
  if (!progress && !isGenerating) {
    return (
      <Card className="p-8 sm:p-12 text-center flex flex-col items-center justify-center border-dashed bg-[#F8FAFC]/50 select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] border border-[#BFDBFE] text-[#315FEA] flex items-center justify-center mb-4">
          <TrendingUp size={22} />
        </div>
        <h3 className="text-base font-semibold text-[#0F172A]">
          No progress analysis yet
        </h3>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 max-w-md leading-relaxed">
          Synthesize observations across this student's completed sessions, track retention
          patterns, and extract high-priority curriculum focus areas.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={handleGenerateProgress}
          disabled={isGenerating}
          className="mt-5 gap-2 text-xs font-semibold h-9 shadow-sm"
        >
          <Sparkles size={14} />
          <span>Generate Progress Analysis</span>
        </Button>
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Generating Loading Placeholder                                     */
  /* ------------------------------------------------------------------ */
  if (isGenerating && !progress) {
    return (
      <Card className="py-14 text-center space-y-3 bg-[#F8FAFC]/50 rounded-xl border border-dashed border-[#CBD5E1] select-none">
        <BrandLoader size="md" variant="blue" speed="fast" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-[#0F172A]">
            Synthesizing Learning Progress…
          </p>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            Reviewing past lesson notes, concept friction, and mastery signals across completed sessions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* 1. Overall Narrative Summary Card */}
      <Card className="p-5 sm:p-6 space-y-4 border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#315FEA]" />
              <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wider">
                Progress Synthesis
              </h2>
            </div>
            {progress?.updated_at && (
              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 font-mono">
                <Calendar size={12} />
                <span>
                  Last analyzed: {format(parseISO(progress.updated_at), "MMM d, yyyy · h:mm a")}
                </span>
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateProgress}
            disabled={isGenerating}
            className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {isGenerating ? (
              <>
                <BrandLoader size="sm" variant="blue" speed="fast" />
                <span>Regenerating…</span>
              </>
            ) : (
              <>
                <RotateCcw size={12} />
                <span>Regenerate Analysis</span>
              </>
            )}
          </Button>
        </div>

        {/* Narrative Summary Body */}
        {progress?.overall_summary && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-[#475569] block">
              Cumulative Overview
            </span>
            <p className="text-[13px] sm:text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              {progress.overall_summary}
            </p>
          </div>
        )}
      </Card>

      {/* 2. Strengths vs Areas to Improve Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="p-5 sm:p-6 space-y-3.5 border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3 text-xs font-semibold text-[#16A34A]">
            <CheckCircle2 size={16} />
            <span className="uppercase tracking-wider">Demonstrated Strengths</span>
          </div>

          {progress?.strengths && progress.strengths.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {progress.strengths.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-[#334155] leading-relaxed bg-[#F0FDF4]/50 p-2.5 rounded-lg border border-[#BBF7D0]/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#94A3B8] italic py-2">
              No specific strengths recorded yet.
            </p>
          )}
        </Card>

        {/* Areas to Improve */}
        <Card className="p-5 sm:p-6 space-y-3.5 border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3 text-xs font-semibold text-[#D97706]">
            <AlertCircle size={16} />
            <span className="uppercase tracking-wider">Areas to Strengthen</span>
          </div>

          {progress?.areas_to_improve && progress.areas_to_improve.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {progress.areas_to_improve.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-[#334155] leading-relaxed bg-[#FFFBEB]/50 p-2.5 rounded-lg border border-[#FDE68A]/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#94A3B8] italic py-2">
              No immediate growth bottlenecks identified.
            </p>
          )}
        </Card>
      </div>

      {/* 3. Actionable Next Focus Recommendation */}
      {progress?.recommended_focus && (
        <Card className="p-5 sm:p-6 space-y-2 border-[#BFDBFE] bg-gradient-to-br from-white to-[#EEF2FF]/40 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#315FEA] uppercase tracking-wider">
            <Target size={15} />
            <span>Recommended Next Focus</span>
          </div>
          <p className="text-sm font-medium text-[#0F172A] leading-relaxed pt-1">
            {progress.recommended_focus}
          </p>
        </Card>
      )}
    </div>
  );
};

export default StudentProgressTab;