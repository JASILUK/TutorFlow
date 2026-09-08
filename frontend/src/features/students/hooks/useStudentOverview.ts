import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/services/api/students.api";
import { studentKeys } from "./studentKeys";

export const useStudentOverview = (profileId?: string) => {
  return useQuery({
    queryKey: studentKeys.overview(profileId ?? ""),
    queryFn: () => studentsApi.getStudentOverview(profileId!),
    enabled: Boolean(profileId),
  });
};