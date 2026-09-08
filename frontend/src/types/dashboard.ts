// src/types/dashboard.ts
import { SessionStatus } from "@/types/sessions";

/* =============================================================================
   1. TUTOR DASHBOARD TYPES (GET /dashboard/tutor)
   ============================================================================= */

export interface TutorDashboardSummary {
  total_students: number;
  sessions_today: number;
  upcoming_sessions: number;
}

export interface DashboardSessionItem {
  id: string;
  student_profile_id: string;
  student_name: string;
  topic: string;
  scheduled_start: string; // ISO 8601 UTC string
  scheduled_end: string;   // ISO 8601 UTC string
  status: SessionStatus;
  meeting_url: string | null;
}

export interface StudentsNeedingAttentionItem {
  student_profile_id: string;
  student_name: string;
  reason: string;
  session_id: string | null;
  topic: string | null;
}

export interface HomeworkTaskSummaryItem {
  id: string;
  session_id: string;
  student_profile_id: string;
  student_name: string;
  title: string;
  created_at: string; // ISO 8601 UTC string
}

export interface TutorHomeworkSummary {
  total_pending: number;
  recent_pending: HomeworkTaskSummaryItem[];
}

export interface TutorDashboardResponse {
  summary: TutorDashboardSummary;
  today_sessions: DashboardSessionItem[];
  upcoming_sessions: DashboardSessionItem[];
  students_needing_attention: StudentsNeedingAttentionItem[];
  recent_sessions: DashboardSessionItem[];
  homework_summary: TutorHomeworkSummary;
}

/* =============================================================================
   2. STUDENT DASHBOARD TYPES (GET /dashboard/student)
   ============================================================================= */

export interface StudentNextSessionItem {
  id: string;
  topic: string;
  scheduled_start: string; // ISO 8601 UTC string
  scheduled_end: string;   // ISO 8601 UTC string
  tutor_name: string;
  status: SessionStatus;
  meeting_url: string | null;
}

export interface StudentRecentSessionItem {
  id: string;
  topic: string;
  scheduled_start: string; // ISO 8601 UTC string
  scheduled_end: string;   // ISO 8601 UTC string
  tutor_name: string;
  status: SessionStatus;
  meeting_url: string | null;
}

export interface StudentDashboardHomeworkItem {
  id: string;
  session_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  created_at: string; // ISO 8601 UTC string
}

export interface StudentDashboardHomework {
  pending_count: number;
  recent: StudentDashboardHomeworkItem[];
}

export interface StudentDashboardProgress {
  total_sessions_completed: number;
  latest_ai_focus: string | null;
}

export interface StudentDashboardResponse {
  next_session: StudentNextSessionItem | null;
  homework: StudentDashboardHomework;
  progress: StudentDashboardProgress;
  recent_sessions: StudentRecentSessionItem[];
}