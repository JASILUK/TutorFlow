import { SessionResponse } from "@/types/sessions";
import { HomeworkTaskResponse } from "@/types/homework";

// =============================================================================
// 1. LESSON PLAN TYPES
// =============================================================================

export interface LessonStepDetail {
  step: number;
  title: string;
  duration_minutes: number;
  description: string;
}

export interface SessionPlanDetail {
  learning_objectives: string[];
  lesson_outline: LessonStepDetail[];
  practice_questions: string[];
}

// =============================================================================
// 2. SESSION DEBRIEF TYPES
// =============================================================================

export interface SessionDebriefResponse {
  session_id: string;
  status: string;
  ai_session_summary: string;
  ai_suggested_focus: string;
  homework_created: HomeworkTaskResponse[];
}

// =============================================================================
// 3. STUDENT PROGRESS TYPES
// =============================================================================

export interface StudentProgressResponse {
  id: string;
  student_profile_id: string;
  overall_summary: string;
  strengths: string[];
  areas_to_improve: string[];
  recommended_focus: string;
  updated_at: string;
}