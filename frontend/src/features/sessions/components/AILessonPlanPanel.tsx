// src/features/sessions/components/tutor/AILessonPlanPanel.tsx
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckSquare,
  Clock,
  HelpCircle,
  RotateCcw,
  AlertCircle,
  ListOrdered,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useGenerateSessionPlan } from "@/features/ai/hooks/useAI";
import { useUpdateSession } from "@/features/sessions/hooks";
import { SessionPlanDetail, LessonStepDetail } from "@/types/ai";
import { SessionStatus } from "@/types/sessions";
import { Card, Button } from "@/components/ui/core-primitives";
import { BrandLoader } from "@/components/ui/brand-loader";
import { CollapsibleCardSection } from "@/components/ui/CollapsibleCardSection";
import { parseApiError } from "@/services/api/error-handler";

interface AILessonPlanPanelProps {
  planData: SessionPlanDetail | null;
  sessionId: string;
  status: SessionStatus;
}

export const AILessonPlanPanel: React.FC<AILessonPlanPanelProps> = ({
  planData,
  sessionId,
  status,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftPlan, setDraftPlan] = useState<SessionPlanDetail>({
    learning_objectives: [],
    lesson_outline: [],
    practice_questions: [],
  });

  const generatePlanMutation = useGenerateSessionPlan();
  const updateSessionMutation = useUpdateSession();

  // Synchronize local editable state when planData changes
  useEffect(() => {
    if (planData) {
      setDraftPlan({
        learning_objectives: Array.isArray(planData.learning_objectives)
          ? [...planData.learning_objectives]
          : [],
        lesson_outline: Array.isArray(planData.lesson_outline)
          ? planData.lesson_outline.map((step) => ({ ...step }))
          : [],
        practice_questions: Array.isArray(planData.practice_questions)
          ? [...planData.practice_questions]
          : [],
      });
    }
  }, [planData]);

  const hasValidPlan =
    planData !== null &&
    typeof planData === "object" &&
    (Array.isArray(planData.learning_objectives) ||
      Array.isArray(planData.lesson_outline) ||
      Array.isArray(planData.practice_questions));

  const canEdit = status === "scheduled" || status === "in_progress";
  const isGenerating = generatePlanMutation.isPending;
  const isSaving = updateSessionMutation.isPending;

  // Handle AI Plan Regeneration
  const handleGeneratePlan = async () => {
    try {
      await generatePlanMutation.mutateAsync(sessionId);
      toast.success("New lesson plan generated.");
      setIsEditing(false);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Couldn't generate the lesson plan.");
    }
  };

  // Handle Manual Save
  const handleSaveEditedPlan = async () => {
    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        payload: {
          ai_plan: draftPlan,
        },
      });
      toast.success("Lesson plan saved.");
      setIsEditing(false);
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message || "Failed to update lesson plan.");
    }
  };

  const handleCancelEdit = () => {
    if (planData) {
      setDraftPlan({
        learning_objectives: [...(planData.learning_objectives || [])],
        lesson_outline: (planData.lesson_outline || []).map((s) => ({ ...s })),
        practice_questions: [...(planData.practice_questions || [])],
      });
    }
    setIsEditing(false);
  };

  return (
    <Card className="p-5 sm:p-6 space-y-5 border-[#E2E8F0] shadow-xs select-none">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#315FEA]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
            AI Lesson Plan
          </h3>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              hasValidPlan
                ? "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]"
                : "text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0]"
            }`}
          >
            {hasValidPlan ? "Plan Ready" : "Not Generated"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasValidPlan && canEdit && !isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1"
              >
                <Edit3 size={11} />
                <span>Edit Plan</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <BrandLoader size="sm" variant="primary" speed="fast" />
                    <span>Regenerating…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={11} />
                    <span>Regenerate</span>
                  </>
                )}
              </Button>
            </>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="h-7 px-2.5 text-xs text-[#64748B]"
              >
                <X size={12} className="mr-1" />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEditedPlan}
                disabled={isSaving}
                className="h-7 px-3 text-xs font-semibold gap-1.5 min-w-[90px]"
              >
                {isSaving ? (
                  <>
                    <BrandLoader size="sm" variant="white" speed="fast" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    <span>Save Plan</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mutation Error Notification */}
      {generatePlanMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>Couldn't generate the plan. Please retry.</span>
          </div>
          <button
            type="button"
            onClick={handleGeneratePlan}
            className="text-[11px] font-bold text-[#DC2626] underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Generating State */}
      {isGenerating && !hasValidPlan && (
        <div className="py-8 text-center space-y-3 bg-[#F8FAFC]/50 rounded-xl border border-dashed border-[#CBD5E1]">
          <BrandLoader size="md" variant="blue" speed="fast" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#0F172A]">Synthesizing Lesson Plan…</p>
            <p className="text-[11px] text-[#64748B]">
              Formulating learning targets, pacing outline, and practice questions.
            </p>
          </div>
        </div>
      )}

      {/* 2. EDITING MODE */}
      {isEditing && (
        <div className="space-y-5 text-xs">
          {/* Objectives Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <CheckSquare size={13} className="text-[#315FEA]" />
                <span>Learning Objectives</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraftPlan((prev) => ({
                    ...prev,
                    learning_objectives: [...prev.learning_objectives, ""],
                  }))
                }
                className="text-[11px] font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <Plus size={11} /> Add Objective
              </button>
            </div>
            <div className="space-y-2">
              {draftPlan.learning_objectives.map((obj, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => {
                      const next = [...draftPlan.learning_objectives];
                      next[idx] = e.target.value;
                      setDraftPlan((prev) => ({ ...prev, learning_objectives: next }));
                    }}
                    placeholder={`Objective ${idx + 1}...`}
                    className="flex-1 h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] outline-none focus:border-[#315FEA]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = draftPlan.learning_objectives.filter((_, i) => i !== idx);
                      setDraftPlan((prev) => ({ ...prev, learning_objectives: next }));
                    }}
                    className="p-1 text-[#94A3B8] hover:text-[#DC2626]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson Outline Editor */}
          <div className="space-y-2.5 pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <ListOrdered size={13} className="text-[#315FEA]" />
                <span>Lesson Outline & Timed Steps</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraftPlan((prev) => ({
                    ...prev,
                    lesson_outline: [
                      ...prev.lesson_outline,
                      {
                        step: prev.lesson_outline.length + 1,
                        title: "",
                        duration_minutes: 10,
                        description: "",
                      },
                    ],
                  }))
                }
                className="text-[11px] font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <Plus size={11} /> Add Step
              </button>
            </div>
            <div className="space-y-3">
              {draftPlan.lesson_outline.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] text-[#64748B]">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const next = [...draftPlan.lesson_outline];
                        next[idx].title = e.target.value;
                        setDraftPlan((prev) => ({ ...prev, lesson_outline: next }));
                      }}
                      placeholder="Step title..."
                      className="flex-1 h-7 px-2 bg-white border border-[#E2E8F0] rounded text-xs text-[#0F172A] font-semibold outline-none focus:border-[#315FEA]"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={step.duration_minutes}
                        onChange={(e) => {
                          const next = [...draftPlan.lesson_outline];
                          next[idx].duration_minutes = parseInt(e.target.value, 10) || 0;
                          setDraftPlan((prev) => ({ ...prev, lesson_outline: next }));
                        }}
                        className="w-14 h-7 px-1.5 text-center bg-white border border-[#E2E8F0] rounded text-xs font-mono text-[#0F172A] outline-none"
                      />
                      <span className="text-[11px] text-[#64748B]">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = draftPlan.lesson_outline
                          .filter((_, i) => i !== idx)
                          .map((s, i) => ({ ...s, step: i + 1 }));
                        setDraftPlan((prev) => ({ ...prev, lesson_outline: next }));
                      }}
                      className="p-1 text-[#94A3B8] hover:text-[#DC2626]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(e) => {
                      const next = [...draftPlan.lesson_outline];
                      next[idx].description = e.target.value;
                      setDraftPlan((prev) => ({ ...prev, lesson_outline: next }));
                    }}
                    placeholder="Step guidance, questions to ask, or key teaching points..."
                    className="w-full p-2 bg-white border border-[#E2E8F0] rounded text-[11px] text-[#334155] outline-none focus:border-[#315FEA] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Practice Questions Editor */}
          <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <HelpCircle size={13} className="text-[#315FEA]" />
                <span>Practice Questions</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraftPlan((prev) => ({
                    ...prev,
                    practice_questions: [...prev.practice_questions, ""],
                  }))
                }
                className="text-[11px] font-semibold text-[#315FEA] hover:underline inline-flex items-center gap-1"
              >
                <Plus size={11} /> Add Question
              </button>
            </div>
            <div className="space-y-2">
              {draftPlan.practice_questions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const next = [...draftPlan.practice_questions];
                      next[idx] = e.target.value;
                      setDraftPlan((prev) => ({ ...prev, practice_questions: next }));
                    }}
                    placeholder={`Question ${idx + 1}...`}
                    className="flex-1 h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] outline-none focus:border-[#315FEA]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = draftPlan.practice_questions.filter((_, i) => i !== idx);
                      setDraftPlan((prev) => ({ ...prev, practice_questions: next }));
                    }}
                    className="p-1 text-[#94A3B8] hover:text-[#DC2626]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. VIEW MODE (Wrapped with CollapsibleCardSection) */}
      {hasValidPlan && !isEditing && !isGenerating && (
        <CollapsibleCardSection
          maxCollapsedHeight={280}
          expandLabel="Show full lesson plan"
          collapseLabel="Collapse lesson plan"
        >
          <div className="space-y-5 text-xs">
            {/* Objectives */}
            {Array.isArray(planData?.learning_objectives) &&
              planData.learning_objectives.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                    <CheckSquare size={14} className="text-[#315FEA]" />
                    <span>Target Learning Objectives</span>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {planData.learning_objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#334155] leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#315FEA] mt-1.5 shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Outline Steps */}
            {Array.isArray(planData?.lesson_outline) && planData.lesson_outline.length > 0 && (
              <div className="space-y-2.5 pt-3 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                  <ListOrdered size={14} className="text-[#315FEA]" />
                  <span>Lesson Outline & Pacing</span>
                </div>
                <div className="space-y-2">
                  {planData.lesson_outline.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0F172A]">
                          Step {step.step}: {step.title}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#64748B] bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded">
                          <Clock size={11} className="text-[#94A3B8]" />
                          {step.duration_minutes} min
                        </span>
                      </div>
                      {step.description && (
                        <p className="text-[11px] text-[#475569] leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions */}
            {Array.isArray(planData?.practice_questions) &&
              planData.practice_questions.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                    <HelpCircle size={14} className="text-[#315FEA]" />
                    <span>Curriculum Practice Questions</span>
                  </div>
                  <div className="space-y-1.5">
                    {planData.practice_questions.map((q, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-[#FAFAFC] border border-[#E2E8F0] text-[#334155] leading-relaxed"
                      >
                        <span className="font-semibold text-[#0F172A] mr-1.5">{i + 1}.</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </CollapsibleCardSection>
      )}

      {/* 4. UNPREPARED / INITIAL EMPTY STATE */}
      {!hasValidPlan && !isEditing && !isGenerating && (
        <div className="py-4 space-y-3.5">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#0F172A]">
              Personalized Lesson Preparation
            </h4>
            <p className="text-xs text-[#64748B] leading-relaxed max-w-lg">
              Generate structured learning targets, timed pacing steps, and practice questions
              aligned with the student's profile before starting the session.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F8FAFC]">
            <span className="text-[11px] text-[#94A3B8]">
              Available while session is scheduled or in progress.
            </span>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="gap-2 text-xs font-semibold h-8 shrink-0 self-start sm:self-auto"
              >
                <Sparkles size={13} />
                <span>Generate lesson plan</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AILessonPlanPanel;