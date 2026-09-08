import { apiClient } from "./client";
import {
  HomeworkDashboardResponse,
  HomeworkTaskResponse,
  HomeworkCreateRequest,
  HomeworkUpdateRequest,
  HomeworkCompleteRequest,
  HomeworkListParams,
} from "@/types/homework";
import { MessageResponse } from "@/types/auth";

// In src/services/api/homework.api.ts

export const homeworkApi = {
  // Tutor global & session endpoint
  getHomework: async (params?: HomeworkListParams): Promise<HomeworkDashboardResponse> => {
    const { data } = await apiClient.get<HomeworkDashboardResponse>("/homework", { params });
    return data;
  },

  // Student own homework & session endpoint
  getMyHomework: async (params?: HomeworkListParams): Promise<HomeworkDashboardResponse> => {
    const { data } = await apiClient.get<HomeworkDashboardResponse>("/homework/my", { params });
    return data;
  },

  createHomework: async (payload: HomeworkCreateRequest): Promise<HomeworkTaskResponse> => {
    const { data } = await apiClient.post<HomeworkTaskResponse>("/homework", payload);
    return data;
  },

  updateHomework: async (
    homeworkId: string,
    payload: HomeworkUpdateRequest
  ): Promise<HomeworkTaskResponse> => {
    const { data } = await apiClient.patch<HomeworkTaskResponse>(`/homework/${homeworkId}`, payload);
    return data;
  },

  completeHomework: async (
    homeworkId: string,
    payload: HomeworkCompleteRequest
  ): Promise<HomeworkTaskResponse> => {
    const { data } = await apiClient.patch<HomeworkTaskResponse>(
      `/homework/${homeworkId}/complete`,
      payload
    );
    return data;
  },

 
  deleteHomework: async (homeworkId: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(`/homework/${homeworkId}`);
    return data;
  },
};