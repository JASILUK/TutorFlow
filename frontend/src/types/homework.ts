export interface HomeworkSessionSummary {
  id: string;
  topic: string;
  scheduled_start: string;
}

export interface HomeworkTaskBase {
  title: string;
  description: string;
}

export interface HomeworkCreateRequest extends HomeworkTaskBase {
  session_id: string;
}

export interface HomeworkUpdateRequest {
  title?: string;
  description?: string;
}

export interface HomeworkCompleteRequest {
  is_completed: boolean;
}

export interface HomeworkTaskResponse {
  id: string;
  session_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  session?: HomeworkSessionSummary | null;
}

export interface HomeworkSummaryCounts {
  total: number;
  pending_count: number;
  completed_count: number;
}

export interface HomeworkDashboardResponse {
  counts: HomeworkSummaryCounts;
  items: HomeworkTaskResponse[];
}

export interface HomeworkListParams {
  student_profile_id?: string;
  session_id?: string;
  is_completed?: boolean;
  limit?: number;
  offset?: number;
}