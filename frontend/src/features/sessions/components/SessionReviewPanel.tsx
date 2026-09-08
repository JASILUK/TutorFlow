// src/features/sessions/components/tutor/SessionReviewPanel.tsx
import React from "react";
import {
  Sparkles,
  Target,
  FileText,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import { useGenerateSessionDebrief } from "@/features/ai/hooks/useAI";
import { SessionStatus } from "@/types/sessions";
import { Card, Button } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { CollapsibleCardSection } from "@/components/ui/CollapsibleCardSection";
import { parseApiError } from "@/services/api/error-handler";

interface SessionReviewPanelProps {
  summary: string | null;
  suggestedFocus: string | null;
  status: SessionStatus;
  sessionId: string;
}

export const SessionReviewPanel: React.FC<SessionReviewPanelProps> = ({
  summary,
  suggestedFocus,
  status,
  sessionId,
}) => {
  const generateDebriefMutation = useGenerateSessionDebrief();

  const isReviewed = status === "ai_reviewed";
  const hasAnyReviewData = Boolean(summary || suggestedFocus);
  const isGenerating = generateDebriefMutation.isPending;

  const handleGenerateDebrief = async () => {
    try {
      await generateDebriefMutation.mutateAsync(sessionId);
      toast.success("Session review complete. Homework created.");
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't generate the session debrief.");
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4 border-[#E2E8F0] shadow-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#7C3AED]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
            Session Debrief & Review
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isReviewed
                ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]"
                : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
            }`}
          >
            {isReviewed ? "Reviewed" : "Debrief Pending"}
          </span>

          {status === "completed" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateDebrief}
              disabled={isGenerating}
              className="h-7 px-3 text-xs font-semibold gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              {isGenerating ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Reviewing session…</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  <span>Generate AI Review</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mutation Error Notification */}
      {generateDebriefMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>Couldn't complete the session debrief. Please retry.</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateDebrief}
            className="text-[11px] font-bold text-[#DC2626] underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Generating State */}
      {isGenerating && (
        <div className="py-8 text-center space-y-3 bg-[#F8FAFC]/50 rounded-xl border border-dashed border-[#CBD5E1]">
          <BrandLoader size="md" variant="blue" speed="fast" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#0F172A]">Synthesizing Lesson Debrief…</p>
            <p className="text-[11px] text-[#64748B]">
              Analyzing lesson notes, evaluating student mastery, and generating homework exercises.
            </p>
          </div>
        </div>
      )}

      {/* Content Rendering: Real Backend Data wrapped in CollapsibleCardSection */}
      {hasAnyReviewData && !isGenerating && (
        <CollapsibleCardSection
          maxCollapsedHeight={240}
          expandLabel="Show full review"
          collapseLabel="Show less"
        >
          <div className="space-y-4 text-xs">
            {summary && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                  <FileText size={13} className="text-[#315FEA]" />
                  <span>Session Summary</span>
                </div>
                <p className="text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                  {summary}
                </p>
              </div>
            )}

            {suggestedFocus && (
              <div className="space-y-1.5 pt-2 border-t border-[#F8FAFC]">
                <div className="flex items-center gap-1.5 font-semibold text-[#16A34A]">
                  <Target size={13} />
                  <span>Recommended Next Focus</span>
                </div>
                <p className="text-sm text-[#334155] leading-relaxed bg-[#F0FDF4] p-3.5 rounded-xl border border-[#BBF7D0]">
                  {suggestedFocus}
                </p>
              </div>
            )}
          </div>
        </CollapsibleCardSection>
      )}

      {/* Pending / Completed Empty State */}
      {!hasAnyReviewData && !isGenerating && (
        <div className="py-4 space-y-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#0F172A]">Post-Session Analysis</h4>
            <p className="text-xs text-[#64748B] leading-relaxed max-w-lg">
              Analyze your lesson observations to extract core mastery anchors, highlight conceptual
              friction points, and auto-generate follow-up homework assignments for this student.
            </p>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-[#94A3B8]" />
              <span>
                {status === "completed"
                  ? "Click 'Generate AI Review' to synthesize debrief and homework."
                  : "Debrief generation unlocks after completing the lesson."}
              </span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SessionReviewPanel;