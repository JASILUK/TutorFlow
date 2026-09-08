// src/services/api/dashboard.api.ts
import { apiClient } from "./client";
import {
  TutorDashboardResponse,
  StudentDashboardResponse,
} from "@/types/dashboard";

export const dashboardApi = {
  /**
   * Retrieves aggregated dashboard metrics, schedule, attention queue, and homework for tutors.
   * GET /dashboard/tutor
   */
  getTutorDashboard: async (): Promise<TutorDashboardResponse> => {
    const { data } = await apiClient.get<TutorDashboardResponse>("/dashboard/tutor");
    return data;
  },

  /**
   * Retrieves next session, pending homework, learning progress, and recent sessions for students.
   * GET /dashboard/student
   */
  getStudentDashboard: async (): Promise<StudentDashboardResponse> => {
    const { data } = await apiClient.get<StudentDashboardResponse>("/dashboard/student");
    return data;
  },
};