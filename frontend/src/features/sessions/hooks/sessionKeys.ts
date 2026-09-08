import { SessionListParams } from "@/types/sessions";

export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (params?: SessionListParams) =>
    [...sessionKeys.lists(), params ?? {}] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (sessionId: string) =>
    [...sessionKeys.details(), sessionId] as const,
};