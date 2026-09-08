import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/services/api/sessions.api";
import { sessionKeys } from "./sessionKeys";
import { studentKeys } from "@/features/students/hooks/studentKeys";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboardKeys";
import {
  SessionListParams,
  SessionCreateRequest,
  SessionUpdateRequest,
  SessionNotesUpdateRequest,
  SessionResponse,
} from "@/types/sessions";

/**
 * Hook to retrieve a list of sessions with optional filters.
 */
export const useSessions = (params?: SessionListParams) => {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionsApi.listSessions(params),
  });
};

/**
 * Hook to retrieve a single session by its ID.
 */
export const useSession = (sessionId?: string) => {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ""),
    queryFn: () => sessionsApi.getSession(sessionId!),
    enabled: Boolean(sessionId),
  });
};

/**
 * Schedules a new tutoring session.
 * Invalidates session lists, dashboard queries, and target student overview.
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SessionCreateRequest) =>
      sessionsApi.createSession(payload),
    onSuccess: (newSession, variables) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      const studentProfileId =
        variables.student_profile_id || newSession.student_profile_id;
      if (studentProfileId) {
        queryClient.invalidateQueries({
          queryKey: studentKeys.overview(studentProfileId),
        });
      }
    },
  });
};

/**
 * Updates a scheduled session.
 * Updates cache, invalidates lists, dashboard queries, and target student overview.
 */
export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: SessionUpdateRequest;
    }) => sessionsApi.updateSession(sessionId, payload),
    onSuccess: (updatedSession, { sessionId }) => {
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        updatedSession
      );
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      if (updatedSession.student_profile_id) {
        queryClient.invalidateQueries({
          queryKey: studentKeys.overview(updatedSession.student_profile_id),
        });
      }
    },
  });
};

/**
 * Transitions a session from SCHEDULED to IN_PROGRESS.
 */
export const useStartSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.startSession(sessionId),
    onSuccess: (startedSession, sessionId) => {
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        startedSession
      );
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      const studentProfileId =
        startedSession.student_profile_id ||
        queryClient.getQueryData<SessionResponse>(sessionKeys.detail(sessionId))
          ?.student_profile_id;
      if (studentProfileId) {
        queryClient.invalidateQueries({
          queryKey: studentKeys.overview(studentProfileId),
        });
      }
    },
  });
};

/**
 * Autosaves live markdown notes.
 * Directly synchronizes detail cache without triggering background refetches.
 */
export const useUpdateSessionNotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: SessionNotesUpdateRequest;
    }) => sessionsApi.updateSessionNotes(sessionId, payload),
    onSuccess: (updatedSession, { sessionId }) => {
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        updatedSession
      );
    },
  });
};

/**
 * Transitions a session from IN_PROGRESS to COMPLETED.
 */
export const useCompleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.completeSession(sessionId),
    onSuccess: (completedSession, sessionId) => {
      queryClient.setQueryData(
        sessionKeys.detail(sessionId),
        completedSession
      );
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      const studentProfileId =
        completedSession.student_profile_id ||
        queryClient.getQueryData<SessionResponse>(sessionKeys.detail(sessionId))
          ?.student_profile_id;
      if (studentProfileId) {
        queryClient.invalidateQueries({
          queryKey: studentKeys.overview(studentProfileId),
        });
      }
    },
  });
};

/**
 * Deletes a scheduled session. Evicts detail and invalidates relevant queries.
 */
export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.deleteSession(sessionId),
    onMutate: (sessionId: string) => {
      const cached = queryClient.getQueryData<SessionResponse>(
        sessionKeys.detail(sessionId)
      );
      return { studentProfileId: cached?.student_profile_id };
    },
    onSuccess: (_data, sessionId, context) => {
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });

      if (context?.studentProfileId) {
        queryClient.invalidateQueries({
          queryKey: studentKeys.overview(context.studentProfileId),
        });
      }
    },
  });
};