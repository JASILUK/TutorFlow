import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/services/api/students.api";
import { studentKeys } from "./studentKeys";

export const useStudent = (profileId?: string) => {
  return useQuery({
    queryKey: studentKeys.detail(profileId ?? ""),
    queryFn: () => studentsApi.getStudent(profileId!),
    enabled: Boolean(profileId),
  });
};