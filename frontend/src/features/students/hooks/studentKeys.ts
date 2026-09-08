import { StudentListParams } from "@/types/students";

export const studentKeys = {
  all: ["students"] as const,

  lists: () => [...studentKeys.all, "list"] as const,

  list: (params?: StudentListParams) =>
    [...studentKeys.lists(), params ?? {}] as const,

  details: () => [...studentKeys.all, "detail"] as const,

  detail: (profileId: string) =>
    [...studentKeys.details(), profileId] as const,

  overviews: () => [...studentKeys.all, "overview"] as const,

  overview: (profileId: string) =>
    [...studentKeys.overviews(), profileId] as const,
};