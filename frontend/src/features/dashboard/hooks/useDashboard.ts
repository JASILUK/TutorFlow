// src/features/dashboard/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api/dashboard.api";
import { dashboardKeys } from "./dashboardKeys";
import {
  TutorDashboardResponse,
  StudentDashboardResponse,
} from "@/types/dashboard";

/**
 * Hook to retrieve aggregated tutor dashboard data.
 */
export const useTutorDashboard = () => {
  return useQuery<TutorDashboardResponse>({
    queryKey: dashboardKeys.tutor(),
    queryFn: () => dashboardApi.getTutorDashboard(),
  });
};

/**
 * Hook to retrieve aggregated student dashboard data.
 */
export const useStudentDashboard = () => {
  return useQuery<StudentDashboardResponse>({
    queryKey: dashboardKeys.student(),
    queryFn: () => dashboardApi.getStudentDashboard(),
  });
};