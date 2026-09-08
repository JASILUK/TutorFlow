import { useQuery } from "@tanstack/react-query";
import { studentsApi } from "@/services/api/students.api";
import { studentKeys } from "./studentKeys";
import { StudentListParams } from "@/types/students";

export const useStudents = (params?: StudentListParams) => {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentsApi.listStudents(params),
  });
};