// src/hooks/homework/useHomework.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeworkApi } from "@/services/api/homework.api";
import { homeworkKeys } from "./homeworkKeys";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboardKeys";
import {
  HomeworkCompleteRequest,
  HomeworkCreateRequest,
  HomeworkListParams,
  HomeworkUpdateRequest,
} from "@/types/homework";

export interface UseHomeworkOptions extends HomeworkListParams {
  isTutor?: boolean;
}

export const useHomework = (options?: UseHomeworkOptions) => {
  const { isTutor = true, ...params } = options ?? {};

  return useQuery({
    queryKey: params?.session_id
      ? [...homeworkKeys.bySession(params.session_id), isTutor ? "tutor" : "student"]
      : [...homeworkKeys.list(params), isTutor ? "tutor" : "student"],
    queryFn: () =>
      isTutor
        ? homeworkApi.getHomework(params)
        : homeworkApi.getMyHomework(params),
    enabled: true,
  });
};

export const useCreateHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HomeworkCreateRequest) =>
      homeworkApi.createHomework(payload),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.bySession(newTask.session_id),
      });
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};

export const useUpdateHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      homeworkId,
      payload,
    }: {
      homeworkId: string;
      sessionId: string;
      payload: HomeworkUpdateRequest;
    }) => homeworkApi.updateHomework(homeworkId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.bySession(variables.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};

export const useCompleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      homeworkId,
      payload,
    }: {
      homeworkId: string;
      sessionId: string;
      payload: HomeworkCompleteRequest;
    }) => homeworkApi.completeHomework(homeworkId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.bySession(variables.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
    },
  });
};

export const useDeleteHomework = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      homeworkId,
    }: {
      homeworkId: string;
      sessionId: string;
    }) => homeworkApi.deleteHomework(homeworkId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.bySession(variables.sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: homeworkKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.tutor(),
      });
    },
  });
};