import { apiClient } from "./client";
import {
  SessionCreateRequest,
  SessionUpdateRequest,
  SessionNotesUpdateRequest,
  SessionResponse,
  SessionListParams,
  MessageResponse,
} from "@/types/sessions";

export const sessionsApi = {
  /**
   * Schedules a new tutoring session.
   * POST /sessions
   */
  createSession: async (
    payload: SessionCreateRequest
  ): Promise<SessionResponse> => {
    const { data } = await apiClient.post<SessionResponse>("/sessions", payload);
    return data;
  },

  /**
   * Retrieves sessions ordered by scheduled_start DESC for current user.
   * GET /sessions
   */
  listSessions: async (
    params?: SessionListParams
  ): Promise<SessionResponse[]> => {
    const { data } = await apiClient.get<SessionResponse[]>("/sessions", {
      params,
    });
    return data;
  },

  /**
   * Fetches details for a single session.
   * GET /sessions/{session_id}
   */
  getSession: async (sessionId: string): Promise<SessionResponse> => {
    const { data } = await apiClient.get<SessionResponse>(
      `/sessions/${sessionId}`
    );
    return data;
  },

  /**
   * Updates topic, time window, or meeting URL of a scheduled session.
   * PATCH /sessions/{session_id}
   */
  updateSession: async (
    sessionId: string,
    payload: SessionUpdateRequest
  ): Promise<SessionResponse> => {
    const { data } = await apiClient.patch<SessionResponse>(
      `/sessions/${sessionId}`,
      payload
    );
    return data;
  },

  /**
   * Transitions session from SCHEDULED to IN_PROGRESS.
   * POST /sessions/{session_id}/start
   */
  startSession: async (sessionId: string): Promise<SessionResponse> => {
    const { data } = await apiClient.post<SessionResponse>(
      `/sessions/${sessionId}/start`
    );
    return data;
  },

  /**
   * Autosaves tutor session live notes (allowed only while IN_PROGRESS).
   * PATCH /sessions/{session_id}/notes
   */
  updateSessionNotes: async (
    sessionId: string,
    payload: SessionNotesUpdateRequest
  ): Promise<SessionResponse> => {
    const { data } = await apiClient.patch<SessionResponse>(
      `/sessions/${sessionId}/notes`,
      payload
    );
    return data;
  },

  /**
   * Transitions session from IN_PROGRESS to COMPLETED.
   * POST /sessions/{session_id}/complete
   */
  completeSession: async (sessionId: string): Promise<SessionResponse> => {
    const { data } = await apiClient.post<SessionResponse>(
      `/sessions/${sessionId}/complete`
    );
    return data;
  },

  /**
   * Permanently deletes a scheduled session (strictly when status == SCHEDULED).
   * DELETE /sessions/{session_id}
   */
  deleteSession: async (sessionId: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(
      `/sessions/${sessionId}`
    );
    return data;
  },
};