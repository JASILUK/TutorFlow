// src/features/students/StudentDetailPage.tsx
import React, { useState, useTransition } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  CalendarPlus, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

import { useStudent, useSetStudentStatus, useDeleteStudent } from "./hooks";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import StudentOverviewTab from "./components/StudentOverviewTab";
import StudentSessionsTab from "./components/StudentSessionsTab";
import StudentHomeworkTab from "./components/StudentHomeworkTab";
import StudentProfileTab from "./components/StudentProfileTab";
import StudentProgressTab from "./components/StudentProgressTab";

export type StudentTabKey = "overview" | "sessions" | "progress" | "homework" | "profile";

const VALID_TABS: StudentTabKey[] = ["overview", "sessions", "progress", "homework", "profile"];

export const StudentDetailPage: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  // Active Tab determination from search query (?tab=...)
  const tabParam = searchParams.get("tab") as StudentTabKey;
  const activeTab: StudentTabKey = VALID_TABS.includes(tabParam) ? tabParam : "overview";

  // Action Menu & Dialog States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Queries & Mutations
  const { data: student, isPending, isError, error, refetch } = useStudent(profileId);
  const setStatusMutation = useSetStudentStatus();
  const deleteStudentMutation = useDeleteStudent();

  const handleTabChange = (tab: StudentTabKey) => {
    startTransition(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "overview") {
          next.delete("tab");
        } else {
          next.set("tab", tab);
        }
        return next;
      }, { replace: true });
    });
  };

  const handleToggleStatus = async () => {
    if (!profileId || !student) return;
    setIsMenuOpen(false);
    
    // Student active status is resolved through student_user.is_active if present
    const currentActiveState = student.student_user?.is_active ?? true;
    const targetState = !currentActiveState;

    try {
      await setStatusMutation.mutateAsync({
        profileId,
        payload: { is_active: targetState },
      });
      toast.success(
        targetState ? "Student account activated." : "Student account deactivated."
      );
    } catch {
      toast.error("Failed to update student account status.");
    }
  };

  const handleDelete = async () => {
    if (!profileId) return;
    try {
      await deleteStudentMutation.mutateAsync(profileId);
      toast.success("Student account removed.");
      setIsDeleteDialogOpen(false);
      navigate("/dashboard/students", { replace: true });
    } catch {
      toast.error("Unable to delete student. Please try again.");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading Skeleton State                                             */
  /* ------------------------------------------------------------------ */
  if (isPending) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="border-b border-[#E2E8F0] mb-6 flex gap-6">
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-8 w-20 mb-2" />
        </div>
      </PageContainer>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error / Access Safe State                                          */
  /* ------------------------------------------------------------------ */
  if (isError || !student) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#DC2626] border border-red-100 flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A] mb-1">
            Student Not Found
          </h2>
          <p className="text-sm text-[#475569] max-w-md mb-6 leading-relaxed">
            {error instanceof Error
              ? error.message
              : "The requested student profile could not be loaded or you do not have permission to view it."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/students")}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back to Students
            </Button>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const fullName = student.student_user?.full_name || "Student Profile";
  const email = student.student_user?.email || "No email available";
  const isActive = student.student_user?.is_active ?? true;

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PageContainer>
      {/* 1. Contextual Navigation */}
      <Breadcrumbs
        items={[
          { label: "Students", href: "/dashboard/students" },
          { label: fullName },
        ]}
      />

      {/* 2. Primary Student Header Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 sm:p-6 mb-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Identity Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center font-semibold text-base sm:text-lg select-none shrink-0">
              {initials}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] tracking-tight truncate">
                  {fullName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border select-none ${
                    isActive
                      ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                      : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#16A34A]" : "bg-[#DC2626]"
                    }`}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] sm:text-[14px] text-[#475569]">
                <span className="truncate">{email}</span>
                <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                <span className="font-medium text-[#0F172A]">{student.subject}</span>
                <span className="text-[#CBD5E1]" aria-hidden="true">•</span>
                <span>{student.current_level}</span>
              </div>
            </div>
          </div>

          {/* Actions Cluster */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                // Future Task: Open session creation modal scoped to this student
                navigate(`/dashboard/sessions?schedule=${student.id}`);
              }}
              className="gap-2 text-[13px] font-semibold"
            >
              <CalendarPlus size={16} />
              Schedule Session
            </Button>

            {/* Overflow Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Student management options"
                aria-expanded={isMenuOpen}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
              >
                <MoreVertical size={18} />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 z-30 select-none animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleTabChange("profile");
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
                    >
                      <Edit3 size={15} className="text-[#94A3B8]" />
                      Edit Student Details
                    </button>

                    <button
                      type="button"
                      disabled={setStatusMutation.isPending}
                      onClick={handleToggleStatus}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors disabled:opacity-50"
                    >
                      {isActive ? (
                        <>
                          <UserX size={15} className="text-[#94A3B8]" />
                          Deactivate Account
                        </>
                      ) : (
                        <>
                          <UserCheck size={15} className="text-[#94A3B8]" />
                          Activate Account
                        </>
                      )}
                    </button>

                    <div className="my-1 border-t border-[#E2E8F0]/75" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    >
                      <Trash2 size={15} />
                      Delete Student
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation Bar */}
      <div className="border-b border-[#E2E8F0] mb-6 select-none">
        <nav
          className="flex gap-6 -mb-px overflow-x-auto no-scrollbar"
          aria-label="Student Sections"
        >
          {VALID_TABS.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleTabChange(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 capitalize whitespace-nowrap ${
                  isSelected
                    ? "border-[#315FEA] text-[#315FEA] font-semibold"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

    {/* // 2. In the tabpanel section: */}
    <section role="tabpanel" aria-label={`${activeTab} tab content`}>
        {activeTab === "overview" && profileId && (
            <StudentOverviewTab
            profileId={profileId}
            onNavigateTab={handleTabChange}
            />
        )}

        {/* Active Task 3: Sessions Tab */}
        {activeTab === "sessions" && profileId && (
          <StudentSessionsTab profileId={profileId} />
        )}

        {activeTab === "progress" && profileId && (
          <StudentProgressTab profileId={profileId} />
        )}

        {activeTab === "homework" && profileId && (
            <StudentHomeworkTab profileId={profileId} />
          )}

        {activeTab === "profile" && profileId && (
          <StudentProfileTab profileId={profileId} />
        )}
    </section>

      {/* 5. Permanent Deletion Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 text-left space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center border border-red-100">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h3
                id="delete-dialog-title"
                className="text-lg font-semibold text-[#0F172A]"
              >
                Delete student account?
              </h3>
              <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                You are about to permanently delete <strong className="text-[#0F172A]">{fullName}</strong>. 
                All associated profiles, scheduled sessions, live notes, and homework records will be removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={deleteStudentMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteStudentMutation.isPending}
                onClick={handleDelete}
              >
                {deleteStudentMutation.isPending ? "Deleting…" : "Delete Student"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/* Temporary Structured Boundary for Future Tasks (Zero Mock Data)     */
/* ------------------------------------------------------------------ */
interface TabBoundaryProps {
  title: string;
  description: string;
  taskId: string;
}

const TabIntegrationBoundary: React.FC<TabBoundaryProps> = ({
  title,
  description,
  taskId,
}) => (
  <Card className="border-dashed bg-[#F8FAFC]/50 text-left p-8">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-[#0F172A] tracking-tight">{title}</h3>
      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE]/60">
        Ready for {taskId}
      </span>
    </div>
    <p className="text-xs text-[#64748B] leading-relaxed max-w-xl">
      {description}
    </p>
  </Card>
);

export default StudentDetailPage;