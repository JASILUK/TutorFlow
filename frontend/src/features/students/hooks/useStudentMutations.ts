import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/services/api/students.api";
import { studentKeys } from "./studentKeys";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboardKeys";
import {
  StudentCreateRequest,
  StudentUpdateRequest,
  StudentStatusUpdateRequest,
} from "@/types/students";

/**
 * Creates a new student and invalidates student listing queries and tutor dashboard.
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StudentCreateRequest) =>
      studentsApi.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.tutor(),
      });
    },
  });
};

/**
 * Partially updates student profile, populates detail cache, and invalidates list/overview/dashboard.
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: StudentUpdateRequest;
    }) => studentsApi.updateStudent(profileId, payload),
    onSuccess: (updatedStudent, { profileId }) => {
      queryClient.setQueryData(
        studentKeys.detail(profileId),
        updatedStudent
      );
      queryClient.invalidateQueries({
        queryKey: studentKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: studentKeys.overview(profileId),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.tutor(),
      });
    },
  });
};

/**
 * Toggles account status, updates detail cache, and invalidates list/overview/dashboard.
 */
export const useSetStudentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string;
      payload: StudentStatusUpdateRequest;
    }) => studentsApi.setStudentStatus(profileId, payload),
    onSuccess: (updatedStudent, { profileId }) => {
      queryClient.setQueryData(
        studentKeys.detail(profileId),
        updatedStudent
      );
      queryClient.invalidateQueries({
        queryKey: studentKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: studentKeys.overview(profileId),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.tutor(),
      });
    },
  });
};

/**
 * Permanently deletes student profile, evicts detail & overview, and refreshes directory lists/dashboard.
 */
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => studentsApi.deleteStudent(profileId),
    onSuccess: (_data, profileId) => {
      queryClient.removeQueries({
        queryKey: studentKeys.detail(profileId),
      });
      queryClient.removeQueries({
        queryKey: studentKeys.overview(profileId),
      });
      queryClient.invalidateQueries({
        queryKey: studentKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.tutor(),
      });
    },
  });
};