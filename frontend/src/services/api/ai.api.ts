// src/services/api/ai.api.ts

import { apiClient } from "./client";
import { SessionResponse } from "@/types/sessions";
import { SessionDebriefResponse, StudentProgressResponse } from "@/types/ai";

export const aiApi = {
  generateSessionPlan: async (sessionId: string): Promise<SessionResponse> => {
    const { data } = await apiClient.post<SessionResponse>(`/ai/sessions/${sessionId}/plan`);
    return data;
  },

  generateSessionDebrief: async (sessionId: string): Promise<SessionDebriefResponse> => {
    const { data } = await apiClient.post<SessionDebriefResponse>(`/ai/sessions/${sessionId}/debrief`);
    return data;
  },

  /**
   * Reads existing progress snapshot from PostgreSQL (zero AI cost).
   */
  getStudentProgress: async (studentId: string): Promise<StudentProgressResponse | null> => {
    const { data } = await apiClient.get<StudentProgressResponse | null>(
      `/students/${studentId}/progress`
    );
    return data;
  },

  /**
   * Generates or regenerates longitudinal progress via LLM and upserts the DB row.
   */
  generateStudentProgress: async (studentId: string): Promise<StudentProgressResponse> => {
    const { data } = await apiClient.post<StudentProgressResponse>(
      `/ai/students/${studentId}/progress-summary`
    );
    return data;
  },
};