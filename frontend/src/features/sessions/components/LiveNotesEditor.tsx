// src/features/sessions/components/tutor/LiveNotesEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Check, Loader2, AlertCircle, RotateCcw, FileText } from "lucide-react";
import { useUpdateSessionNotes } from "@/features/sessions/hooks";
import { Card } from "@/components/ui/core-primitives";
import { CollapsibleCardSection } from "@/components/ui/CollapsibleCardSection";
import { parseApiError } from "@/services/api/error-handler";

interface LiveNotesEditorProps {
  sessionId: string;
  initialNotes: string;
  isReadOnly: boolean;
  onPersistSuccess?: (savedText: string) => void;
  registerFlushHandler?: (handler: (() => Promise<boolean>) | null) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Increased debounce to 1.5s for smoother live writing without network thrashing
const DEBOUNCE_MS = 1500;

export const LiveNotesEditor: React.FC<LiveNotesEditorProps> = ({
  sessionId,
  initialNotes,
  isReadOnly,
  onPersistSuccess,
  registerFlushHandler,
}) => {
  // Local working draft
  const [draft, setDraft] = useState<string>(initialNotes ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Persistence tracking refs
  const lastSavedNotesRef = useRef<string>(initialNotes ?? "");
  const currentDraftRef = useRef<string>(initialNotes ?? "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);

  const updateNotesMutation = useUpdateSessionNotes();

  // Synchronize initialNotes when session first populates, without wiping dirty typing
  useEffect(() => {
    if (initialNotes !== undefined && lastSavedNotesRef.current === "") {
      lastSavedNotesRef.current = initialNotes;
      if (draft === "") {
        setDraft(initialNotes);
        currentDraftRef.current = initialNotes;
      }
    }
  }, [initialNotes, draft]);

  // Always keep currentDraftRef fresh
  useEffect(() => {
    currentDraftRef.current = draft;
  }, [draft]);

  /**
   * Authoritative save execution
   */
  const executeSave = useCallback(
    async (textToSave: string): Promise<boolean> => {
      // Avoid redundant network traffic if unchanged
      if (textToSave === lastSavedNotesRef.current) {
        setSaveStatus("idle");
        return true;
      }

      if (isReadOnly) {
        return false;
      }

      setSaveStatus("saving");
      setSaveError(null);
      isSavingRef.current = true;

      try {
        await updateNotesMutation.mutateAsync({
          sessionId,
          payload: { notes: textToSave },
        });

        lastSavedNotesRef.current = textToSave;
        isSavingRef.current = false;
        setSaveStatus("saved");
        if (onPersistSuccess) {
          onPersistSuccess(textToSave);
        }
        return true;
      } catch (err) {
        isSavingRef.current = false;
        const parsed = parseApiError(err);
        setSaveStatus("error");
        setSaveError(parsed.message || "Couldn't save notes.");
        return false;
      }
    },
    [sessionId, isReadOnly, updateNotesMutation, onPersistSuccess]
  );

  /**
   * Debounced typing trigger
   */
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;

    const updatedText = e.target.value;
    setDraft(updatedText);
    currentDraftRef.current = updatedText;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (updatedText !== lastSavedNotesRef.current) {
      setSaveStatus("saving");
      debounceTimerRef.current = setTimeout(() => {
        executeSave(currentDraftRef.current);
      }, DEBOUNCE_MS);
    } else {
      setSaveStatus("idle");
    }
  };

  /**
   * Manual retry on failure
   */
  const handleRetry = () => {
    executeSave(currentDraftRef.current);
  };

  /**
   * Expose immediate flush for completion boundary
   */
  const flushDraft = useCallback(async (): Promise<boolean> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    return await executeSave(currentDraftRef.current);
  }, [executeSave]);

  useEffect(() => {
    if (registerFlushHandler) {
      registerFlushHandler(flushDraft);
    }
    return () => {
      if (registerFlushHandler) {
        registerFlushHandler(null);
      }
    };
  }, [registerFlushHandler, flushDraft]);

  // Teardown debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Read-Only Mode (Completed / AI Reviewed)                           */
  /* ------------------------------------------------------------------ */
  if (isReadOnly) {
    const hasNotes = Boolean(draft && draft.trim().length > 0);

    return (
      <Card className="p-5 sm:p-6 space-y-3 select-none">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
            <FileText size={15} className="text-[#64748B]" />
            <span>Session Notes</span>
          </div>
          <span className="text-[11px] text-[#94A3B8]">Saved during session</span>
        </div>

        {hasNotes ? (
          <CollapsibleCardSection
            maxCollapsedHeight={280}
            expandLabel="Show full notes"
            collapseLabel="Show less"
          >
            <div className="text-[14px] sm:text-[15px] leading-[1.6] text-[#0F172A] whitespace-pre-wrap font-normal select-text">
              {draft}
            </div>
          </CollapsibleCardSection>
        ) : (
          <p className="text-xs text-[#94A3B8] italic py-2">
            No notes were recorded during this lesson.
          </p>
        )}
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Live Editable Mode (In-Progress)                                   */
  /* ------------------------------------------------------------------ */
  return (
    <Card className="p-5 sm:p-6 space-y-3 flex flex-col border-[#CBD5E1] shadow-sm select-none">
      {/* Editor Header + Save Status Pill */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
          <FileText size={15} className="text-[#315FEA]" />
          <span>Live Notes</span>
        </div>

        {/* Save Status Indicators */}
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-[#64748B] text-[11px] font-medium">
              <Loader2 size={12} className="animate-spin text-[#315FEA]" />
              Saving…
            </span>
          )}

          {saveStatus === "saved" && (
            <span className="inline-flex items-center gap-1 text-[#16A34A] text-[11px] font-medium">
              <Check size={12} strokeWidth={2.5} />
              Saved
            </span>
          )}

          {saveStatus === "error" && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[#DC2626] text-[11px] font-medium">
                <AlertCircle size={12} />
                {saveError || "Couldn't save"}
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 text-[11px] text-[#315FEA] hover:underline font-semibold"
              >
                <RotateCcw size={11} />
                Retry
              </button>
            </div>
          )}

          {saveStatus === "idle" && (
            <span className="text-[11px] text-[#94A3B8]">Auto-saving enabled</span>
          )}
        </div>
      </div>

      {/* Editor Surface */}
      <div className="relative flex-1">
        <textarea
          value={draft}
          onChange={handleDraftChange}
          placeholder="Start capturing lesson notes, student feedback, key explanations, equations, and reminders…"
          aria-label="Live session lesson notes"
          rows={14}
          className="w-full h-full min-h-[280px] sm:min-h-[340px] p-2 text-[14px] sm:text-[15px] leading-[1.6] text-[#0F172A] bg-transparent border-0 outline-none resize-y placeholder:text-[#94A3B8] placeholder:font-normal focus:ring-0 select-text"
        />
      </div>

      {/* Editor Subtext / Guidance */}
      <div className="pt-2 border-t border-[#F8FAFC] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span>Markdown formatting supported</span>
        <span>Autosaves ~1.5s after pause</span>
      </div>
    </Card>
  );
};

export default LiveNotesEditor;