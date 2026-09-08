import { UserResponse, MessageResponse } from "@/types/auth";
import type { SessionResponse } from "@/types/sessions";

/* =============================================================================
   1. REQUEST TYPES (Inputs)
   ============================================================================= */

/**
 * Payload used by a tutor to register a new student and their linked profile.
 * Maps to StudentCreateRequest in FastAPI.
 */
export interface StudentCreateRequest {
  email: string;
  password: string;
  full_name: string;
  subject: string;
  current_level: string;
  learning_goals?: string;
  weak_areas?: string;
}

/**
 * Payload to partially update a student's academic profile or user account name.
 * Maps to StudentUpdateRequest in FastAPI.
 */
export interface StudentUpdateRequest {
  full_name?: string;
  subject?: string;
  current_level?: string;
  learning_goals?: string;
  weak_areas?: string;
}

/**
 * Payload to toggle active account status.
 * Maps to StudentStatusUpdateRequest in FastAPI.
 */
export interface StudentStatusUpdateRequest {
  is_active: boolean;
}

/**
 * Query parameters for paginated student directory search.
 * Maps to Query params in GET /students.
 */
export interface StudentListParams {
  page?: number;
  page_size?: number;
  subject?: string;
  search?: string;
}

/* =============================================================================
   2. RESPONSE TYPES (Outputs)
   ============================================================================= */

/**
 * Canonical student academic profile response.
 * Maps to StudentProfileResponse in FastAPI.
 */
export interface StudentProfileResponse {
  id: string; // UUID
  user_id: string; // UUID
  tutor_id: string; // UUID
  subject: string;
  current_level: string;
  learning_goals: string;
  weak_areas: string;
  created_at: string; // ISO 8601 UTC string
  updated_at: string; // ISO 8601 UTC string
  student_user?: UserResponse | null;
}

/**
 * Paginated student envelope.
 * Maps to PaginatedStudentResponse in FastAPI.
 */
export interface PaginatedStudentResponse {
  items: StudentProfileResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Minimal student identity & learning summary inside the overview payload.
 * Maps to OverviewStudentSummary in FastAPI.
 */
export interface OverviewStudentSummary {
  profile_id: string; // UUID
  user_id: string; // UUID
  full_name: string;
  email: string;
  subject: string;
  current_level: string;
  learning_goals: string;
  weak_areas: string;
}

/**
 * Minimal pending task entry in the student overview screen.
 * Maps to OverviewHomeworkTaskSummary in FastAPI.
 */
export interface OverviewHomeworkTaskSummary {
  id: string; // UUID
  session_id: string | null; // UUID
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null; // ISO 8601 UTC string
}

/**
 * Aggregated operational metrics for dashboard scanning.
 * Maps to OverviewMetrics in FastAPI.
 */
export interface OverviewMetrics {
  total_sessions_completed: number;
  pending_homework_count: number;
  latest_ai_focus: string | null;
}

/**
 * Consolidated student overview payload returned in a single round-trip.
 * Maps to StudentOverviewResponse in FastAPI.
 */
export interface StudentOverviewResponse {
  student: OverviewStudentSummary;
  metrics: OverviewMetrics;
  next_session: SessionResponse | null;
  recent_sessions: SessionResponse[];
  pending_homework: OverviewHomeworkTaskSummary[];
}

export type { MessageResponse };