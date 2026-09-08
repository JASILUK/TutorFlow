import { MessageResponse } from "@/types/auth";
import { SessionPlanDetail } from "@/types/ai";


/* =============================================================================
   1. ENUMS & VALUE UNIONS
   ============================================================================= */

/**
 * Strict domain lifecycle state for a tutoring session.
 * Maps directly to app.models.session.SessionStatus in FastAPI/SQLAlchemy.
 */
export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "ai_reviewed";

/* =============================================================================
   2. REQUEST TYPES (Inputs)
   ============================================================================= */

/**
 * Payload to schedule a new session. Initial state is always SCHEDULED.
 * Maps to SessionCreateRequest in FastAPI.
 */
export interface SessionCreateRequest {
  student_profile_id: string; // UUID
  topic: string;
  scheduled_start: string; // ISO 8601 UTC string
  scheduled_end: string; // ISO 8601 UTC string
  meeting_url?: string | null;
}

/**
 * Payload to update a scheduled session prior to start.
 * Maps to SessionUpdateRequest in FastAPI.
 */
export interface SessionUpdateRequest {
  topic?: string;
  scheduled_start?: string; // ISO 8601 UTC string
  scheduled_end?: string; // ISO 8601 UTC string
  meeting_url?: string | null;
  ai_plan?: SessionPlanDetail | null; 
}

/**
 * Payload for live lesson note-taking autosaves.
 * Only permitted when status is IN_PROGRESS.
 * Maps to SessionNotesUpdateRequest in FastAPI.
 */
export interface SessionNotesUpdateRequest {
  notes: string;
}

/**
 * Query parameters for listing and filtering sessions.
 * Maps to Query params in GET /sessions.
 */
export interface SessionListParams {
  student_profile_id?: string;
  status?: SessionStatus;
  limit?: number;

  /** Inclusive lower calendar boundary, serialized as ISO 8601. */
  start?: string;

  /** Exclusive upper calendar boundary, serialized as ISO 8601. */
  end?: string;
}

/* =============================================================================
   3. NESTED RELATION SUMMARY SCHEMAS
   ============================================================================= */

/**
 * Minimal user representation embedded inside session relation views.
 * Maps to SessionUserSummary in FastAPI.
 */
export interface SessionUserSummary {
  id: string; // UUID
  full_name: string;
  email: string;
}

/**
 * Minimal academic profile embedded inside session relation views.
 * Maps to SessionStudentProfileSummary in FastAPI.
 */
export interface SessionStudentProfileSummary {
  id: string; // UUID
  user_id: string; // UUID
  subject: string;
  current_level: string;
  student_user?: SessionUserSummary | null;
}

/* =============================================================================
   4. RESPONSE TYPES (Outputs)
   ============================================================================= */

/**
 * Primary session entity response.
 * Maps directly to SessionResponse in FastAPI.
 */
// In src/types/sessions.ts



export interface SessionResponse {
  id: string;
  tutor_id: string;
  student_profile_id: string;
  tutor_name: string;
  student_name: string;
  topic: string;
  scheduled_start: string;
  scheduled_end: string;
  meeting_url: string | null;
  status: SessionStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  ai_plan: SessionPlanDetail | null;
  ai_session_summary: string | null;
  ai_suggested_focus: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Detailed session response containing full populated relation objects.
 * Maps to SessionDetailResponse in FastAPI.
 */
export interface SessionDetailResponse extends SessionResponse {
  tutor?: SessionUserSummary | null;
  student_profile?: SessionStudentProfileSummary | null;
}

/**
 * Generic response payload for state transitions or single-item operations.
 * Maps to SessionActionMessageResponse in FastAPI.
 */
export interface SessionActionMessageResponse {
  success: boolean;
  message: string;
  session_id: string; // UUID
  status?: SessionStatus | null;
}

export type { MessageResponse };