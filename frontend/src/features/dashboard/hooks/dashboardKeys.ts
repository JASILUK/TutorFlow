// src/features/dashboard/hooks/dashboardKeys.ts
export const dashboardKeys = {
  all: ["dashboard"] as const,
  tutor: () => [...dashboardKeys.all, "tutor"] as const,
  student: () => [...dashboardKeys.all, "student"] as const,
};