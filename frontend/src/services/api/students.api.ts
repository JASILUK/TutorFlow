import { apiClient } from "./client";
import {
  StudentCreateRequest,
  StudentUpdateRequest,
  StudentStatusUpdateRequest,
  StudentProfileResponse,
  PaginatedStudentResponse,
  StudentOverviewResponse,
  StudentListParams,
  MessageResponse,
} from "@/types/students";

export const studentsApi = {
  /**
   * Tutor creates a student account and an academic profile under their management.
   * POST /students
   */
  createStudent: async (
    payload: StudentCreateRequest
  ): Promise<StudentProfileResponse> => {
    const { data } = await apiClient.post<StudentProfileResponse>(
      "/students",
      payload
    );
    return data;
  },

  /**
   * Returns a paginated list of students belonging to the authenticated tutor.
   * GET /students
   */
  listStudents: async (
    params?: StudentListParams
  ): Promise<PaginatedStudentResponse> => {
    const { data } = await apiClient.get<PaginatedStudentResponse>("/students", {
      params,
    });
    return data;
  },

  /**
   * Fetches details for a single student by student profile ID.
   * GET /students/{profile_id}
   */
  getStudent: async (profileId: string): Promise<StudentProfileResponse> => {
    const { data } = await apiClient.get<StudentProfileResponse>(
      `/students/${profileId}`
    );
    return data;
  },

  /**
   * Partially updates a student's profile or account name.
   * PATCH /students/{profile_id}
   */
  updateStudent: async (
    profileId: string,
    payload: StudentUpdateRequest
  ): Promise<StudentProfileResponse> => {
    const { data } = await apiClient.patch<StudentProfileResponse>(
      `/students/${profileId}`,
      payload
    );
    return data;
  },

  /**
   * Activates or deactivates a student account.
   * PATCH /students/{profile_id}/status
   */
  setStudentStatus: async (
    profileId: string,
    payload: StudentStatusUpdateRequest
  ): Promise<StudentProfileResponse> => {
    const { data } = await apiClient.patch<StudentProfileResponse>(
      `/students/${profileId}/status`,
      payload
    );
    return data;
  },

  /**
   * Deletes the student user and cascades profile/sessions.
   * DELETE /students/{profile_id}
   */
  deleteStudent: async (profileId: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(
      `/students/${profileId}`
    );
    return data;
  },

  /**
   * Returns a unified overview dashboard for a student (metrics, next session, past sessions, homework).
   * GET /students/{profile_id}/overview
   */
  getStudentOverview: async (
    profileId: string
  ): Promise<StudentOverviewResponse> => {
    const { data } = await apiClient.get<StudentOverviewResponse>(
      `/students/${profileId}/overview`
    );
    return data;
  },
};