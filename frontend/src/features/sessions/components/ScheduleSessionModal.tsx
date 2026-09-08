// src/features/sessions/components/ScheduleSessionModal.tsx
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Calendar, Clock, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { parse, addMinutes, format } from "date-fns";

import { useCreateSession } from "@/features/sessions/hooks";
import { useStudents, useStudent } from "@/features/students/hooks";
import { parseApiError, applyFieldErrors } from "@/services/api/error-handler";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Button } from "@/components/ui/core-primitives";
import { SessionCreateRequest } from "@/types/sessions";

/* ------------------------------------------------------------------ */
/* Validation Schema                                                  */
/* ------------------------------------------------------------------ */
const scheduleSessionSchema = z
  .object({
    student_profile_id: z.string().min(1, "Please select a student."),
    topic: z
      .string()
      .min(1, "Please enter a session topic.")
      .max(200, "Topic must not exceed 200 characters."),
    date: z.string().min(1, "Please choose a date."),
    start_time: z.string().min(1, "Please choose a start time."),
    end_time: z.string().min(1, "Please choose an end time."),
    meeting_type: z.enum(["none", "custom"]),
    meeting_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Time comparison validation
    if (data.start_time && data.end_time) {
      if (data.end_time <= data.start_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after start time.",
          path: ["end_time"],
        });
      }
    }

    // 2. Meeting URL validation if custom is checked
    if (data.meeting_type === "custom") {
      if (!data.meeting_url || data.meeting_url.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a meeting link.",
          path: ["meeting_url"],
        });
      } else {
        try {
          const url = new URL(data.meeting_url.trim());
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error();
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid HTTP or HTTPS meeting URL.",
            path: ["meeting_url"],
          });
        }
      }
    }
  });

type ScheduleSessionFormValues = z.infer<typeof scheduleSessionSchema>;

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentProfileId?: string; // Optional: when opened from Student Detail
}

export const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({
  isOpen,
  onClose,
  studentProfileId,
}) => {
  const [formError, setFormError] = useState<string | null>(null);

  // Queries & Mutations
  const createSessionMutation = useCreateSession();

  // Load students for dropdown if studentProfileId is not passed
  const { data: studentsData, isPending: isLoadingStudents } = useStudents(
    !studentProfileId ? { page_size: 100 } : undefined
  );
  const students = studentsData?.items ?? [];

  // If studentProfileId is passed, optionally fetch that specific student's profile for display
  const { data: singleStudent } = useStudent(studentProfileId);

  // Default values helper
  const getDefaultDate = () => format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<ScheduleSessionFormValues>({
    resolver: zodResolver(scheduleSessionSchema),
    defaultValues: {
      student_profile_id: studentProfileId || "",
      topic: "",
      date: getDefaultDate(),
      start_time: "10:00",
      end_time: "11:00",
      meeting_type: "none",
      meeting_url: "",
    },
  });

  // Watchers
  const watchedStartTime = watch("start_time");
  const watchedMeetingType = watch("meeting_type");

  // Keep student_profile_id synchronized when studentProfileId changes
  useEffect(() => {
    if (studentProfileId) {
      setValue("student_profile_id", studentProfileId);
    }
  }, [studentProfileId, setValue]);

  // Adjust end_time automatically when start_time changes
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setValue("start_time", newStart, { shouldValidate: true });

    try {
      const parsedStart = parse(newStart, "HH:mm", new Date());
      const defaultEnd = addMinutes(parsedStart, 60);
      setValue("end_time", format(defaultEnd, "HH:mm"), { shouldValidate: true });
    } catch {
      // Ignore parse failure on incomplete typing
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (createSessionMutation.isPending) return;
    setFormError(null);
    reset({
      student_profile_id: studentProfileId || "",
      topic: "",
      date: getDefaultDate(),
      start_time: "10:00",
      end_time: "11:00",
      meeting_type: "none",
      meeting_url: "",
    });
    onClose();
  };

  const onSubmit = async (values: ScheduleSessionFormValues) => {
    setFormError(null);

    // Convert local Date + Time strings into UTC ISO string
    let scheduledStartIso: string;
    let scheduledEndIso: string;

    try {
      const localStart = parse(
        `${values.date} ${values.start_time}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      );
      const localEnd = parse(
        `${values.date} ${values.end_time}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      );

      scheduledStartIso = localStart.toISOString();
      scheduledEndIso = localEnd.toISOString();
    } catch {
      setFormError("Invalid date or time format. Please check your inputs.");
      return;
    }

    const payload: SessionCreateRequest = {
      student_profile_id: values.student_profile_id,
      topic: values.topic.trim(),
      scheduled_start: scheduledStartIso,
      scheduled_end: scheduledEndIso,
      meeting_url:
        values.meeting_type === "custom" && values.meeting_url
          ? values.meeting_url.trim()
          : null,
    };

    try {
      await createSessionMutation.mutateAsync(payload);
      toast.success("Session scheduled successfully.");
      handleClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.statusCode === 409) {
        setFormError(
          "This time conflicts with another session on your schedule. Please select another slot."
        );
      } else if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
        applyFieldErrors(parsed.fieldErrors, setError);
      } else {
        setFormError(
          parsed.message || "Unable to schedule session. Please try again."
        );
      }
    }
  };

  const isSubmitting = createSessionMutation.isPending;

  // Selected student label fallback
  const preselectedStudentName =
    singleStudent?.student_user?.full_name ||
    singleStudent?.subject ||
    "Selected Student";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-session-title"
    >
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h3
              id="schedule-session-title"
              className="text-lg font-semibold text-[#0F172A] leading-tight"
            >
              Schedule session
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Plan and schedule a one-to-one lesson with a student.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
          noValidate
        >
          <div className="px-6 py-5 overflow-y-auto space-y-5">
            {formError && (
              <div
                className="p-3 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg font-medium flex items-start gap-2"
                role="alert"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. WHO: Student Selection */}
            <div className="space-y-1.5">
              <label
                htmlFor="student_profile_id"
                className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
              >
                Student <span className="text-[#DC2626]">*</span>
              </label>

              {studentProfileId ? (
                /* Preselected Context */
                <div className="h-10 px-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0F172A]">
                  <span className="font-medium truncate">{preselectedStudentName}</span>
                  <span className="text-[11px] text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                    Current profile
                  </span>
                </div>
              ) : (
                /* Global Selection Dropdown */
                <div>
                  <select
                    id="student_profile_id"
                    disabled={isSubmitting || isLoadingStudents}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 cursor-pointer ${
                      errors.student_profile_id
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                    }`}
                    {...register("student_profile_id")}
                  >
                    <option value="">Choose a student...</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.student_user?.full_name || "Unassigned"} ({st.subject} - {st.current_level})
                      </option>
                    ))}
                  </select>
                  {errors.student_profile_id && (
                    <p className="text-xs text-[#DC2626] font-medium mt-1">
                      {errors.student_profile_id.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 2. WHAT: Session Details */}
            <div className="space-y-1.5">
              <label
                htmlFor="topic"
                className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
              >
                Session topic <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="topic"
                type="text"
                placeholder="e.g. Quadratic Equations — Factoring & Word Problems"
                disabled={isSubmitting}
                className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-60 ${
                  errors.topic
                    ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                }`}
                {...register("topic")}
              />
              {errors.topic && (
                <p className="text-xs text-[#DC2626] font-medium">
                  {errors.topic.message}
                </p>
              )}
            </div>

            {/* 3. WHEN: Date & Time Grid */}
            <div className="space-y-3 pt-1 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Schedule
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  Times in your local timezone
                </span>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="date"
                  className="text-xs font-medium text-[#0F172A] flex items-center gap-1.5"
                >
                  <Calendar size={13} className="text-[#94A3B8]" />
                  <span>Date</span> <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="date"
                  type="date"
                  disabled={isSubmitting}
                  className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 ${
                    errors.date
                      ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                  }`}
                  {...register("date")}
                />
                {errors.date && (
                  <p className="text-xs text-[#DC2626] font-medium">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="start_time"
                    className="text-xs font-medium text-[#0F172A] flex items-center gap-1.5"
                  >
                    <Clock size={13} className="text-[#94A3B8]" />
                    <span>Start time</span> <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="start_time"
                    type="time"
                    value={watchedStartTime}
                    onChange={handleStartTimeChange}
                    disabled={isSubmitting}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 ${
                      errors.start_time
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                    }`}
                  />
                  {errors.start_time && (
                    <p className="text-xs text-[#DC2626] font-medium">
                      {errors.start_time.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="end_time"
                    className="text-xs font-medium text-[#0F172A] flex items-center gap-1.5"
                  >
                    <Clock size={13} className="text-[#94A3B8]" />
                    <span>End time</span> <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="end_time"
                    type="time"
                    disabled={isSubmitting}
                    className={`w-full h-10 px-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors disabled:opacity-60 ${
                      errors.end_time
                        ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                    }`}
                    {...register("end_time")}
                  />
                  {errors.end_time && (
                    <p className="text-xs text-[#DC2626] font-medium">
                      {errors.end_time.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. WHERE: Meeting Configuration */}
            <div className="space-y-3 pt-1 border-t border-[#F1F5F9]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                Meeting link
              </span>

              <Controller
                name="meeting_type"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-[#0F172A] cursor-pointer">
                      <input
                        type="radio"
                        value="none"
                        checked={field.value === "none"}
                        onChange={() => field.onChange("none")}
                        className="text-[#315FEA] focus:ring-[#315FEA]"
                      />
                      <span>No meeting link</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-[#0F172A] cursor-pointer">
                      <input
                        type="radio"
                        value="custom"
                        checked={field.value === "custom"}
                        onChange={() => field.onChange("custom")}
                        className="text-[#315FEA] focus:ring-[#315FEA]"
                      />
                      <span>Add video meeting link (Google Meet, Zoom, etc.)</span>
                    </label>
                  </div>
                )}
              />

              {watchedMeetingType === "custom" && (
                <div className="space-y-1.5 pt-1">
                  <div className="relative">
                    <Video
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    />
                    <input
                      type="url"
                      placeholder="https://meet.google.com/abc-defg-hij"
                      disabled={isSubmitting}
                      className={`w-full h-10 pl-9 pr-3 text-sm text-[#0F172A] bg-white rounded-lg border outline-none transition-colors placeholder:text-[#94A3B8] disabled:opacity-60 ${
                        errors.meeting_url
                          ? "border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15"
                          : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15"
                      }`}
                      {...register("meeting_url")}
                    />
                  </div>
                  {errors.meeting_url && (
                    <p className="text-xs text-[#DC2626] font-medium">
                      {errors.meeting_url.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <BrandLoader size="sm" variant="white" speed="fast" />
                  <span>Scheduling…</span>
                </>
              ) : (
                <span>Schedule session</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSessionModal;