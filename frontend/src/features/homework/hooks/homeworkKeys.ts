import { HomeworkListParams } from "@/types/homework";

export const homeworkKeys = {
  all: ["homework"] as const,
  lists: () => [...homeworkKeys.all, "list"] as const,
  list: (params?: HomeworkListParams) => [...homeworkKeys.lists(), params ?? {}] as const,
  bySession: (sessionId: string) => [...homeworkKeys.all, "session", sessionId] as const,
};