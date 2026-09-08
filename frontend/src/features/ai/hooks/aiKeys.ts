// src/features/ai/hooks/aiKeys.ts

export const aiKeys = {
  all: ["ai"] as const,
  plans: () => [...aiKeys.all, "plan"] as const,
  planBySession: (sessionId: string) => [...aiKeys.plans(), sessionId] as const,
  debriefs: () => [...aiKeys.all, "debrief"] as const,
  debriefBySession: (sessionId: string) => [...aiKeys.debriefs(), sessionId] as const,
  progress: () => [...aiKeys.all, "progress"] as const,
  progressByStudent: (studentId: string) => [...aiKeys.progress(), studentId] as const,
};