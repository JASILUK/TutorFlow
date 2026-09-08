import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/services/api/ai.api";
import { aiKeys } from "./aiKeys";
import { homeworkKeys } from "@/features/homework/hooks/homeworkKeys";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboardKeys";
import { sessionKeys } from "@/features/sessions/hooks/sessionKeys";
import { studentKeys } from "@/features/students/hooks/studentKeys";

/**
 * Hook to query the existing progress snapshot for a student (zero AI cost).
 */
export const useStudentProgress = (studentId: string) => {
  return useQuery({
    queryKey: aiKeys.progressByStudent(studentId),
    queryFn: () => aiApi.getStudentProgress(studentId),
    enabled: Boolean(studentId),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });
};

/**
 * Hook to generate an AI lesson plan for a scheduled or in-progress session.
 */
export const useGenerateSessionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => aiApi.generateSessionPlan(sessionId),
    onSuccess: (updatedSession) => {
      // Invalidate the session details so the UI immediately renders ai_plan
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(updatedSession.id),
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};

/**
 * Hook to generate post-session debrief, next focus, and auto-created homework.
 */
export const useGenerateSessionDebrief = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => aiApi.generateSessionDebrief(sessionId),
    onSuccess: (debriefData) => {
      // 1. Invalidate session query to reflect status: 'ai_reviewed' & summaries
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(debriefData.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });

      // 2. Invalidate homework queries so newly created tasks appear immediately
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.bySession(debriefData.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.lists(),
      });

      // 3. Invalidate dashboard views (removes from tutor attention queue)
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};

/**
 * Hook to synthesize longitudinal learning progress across completed lessons.
 * Handles both initial generation and regeneration.
 */
export const useGenerateStudentProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => aiApi.generateStudentProgress(studentId),
    onSuccess: (progressData, studentId) => {
      // 1. Write directly to cache so the progress tab displays immediately
      queryClient.setQueryData(aiKeys.progressByStudent(studentId), progressData);
      queryClient.invalidateQueries({
        queryKey: aiKeys.progressByStudent(studentId),
      });

      // 2. Invalidate student detail and overview queries
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: studentKeys.overview(studentId),
      });

      // 3. Refresh dashboard progress snapshots
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};