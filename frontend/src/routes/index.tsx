// src/routes/AppRoutes.tsx
import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  FullScreenLoader,
  ProtectedRoute,
  PublicOnlyRoute,
} from "./Guards";

import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/core-primitives";
import StudentSessionsPage from "@/features/sessions/StudentSessionsPage";

// ============================================================
// LAZY LOADED PAGES
// ============================================================

const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({
    default: m.default,
  }))
);

const StudentsPage = lazy(() =>
  import("@/features/students/StudentsPage").then((m) => ({
    default: m.StudentsPage,
  }))
);

const StudentDetailPage = lazy(() =>
  import("@/features/students/StudentDetailPage").then((m) => ({
    default: m.StudentDetailPage,
  }))
);

const SessionsPage = lazy(() =>
  import("@/features/sessions/SessionsPage").then((m) => ({
    default: m.SessionsPage,
  }))
);

const SessionWorkspace = lazy(() =>
  import("@/features/sessions/SessionWorkspace").then((m) => ({
    default: m.SessionWorkspace,
  }))
);

const CalendarPage = lazy(() =>
  import("@/features/calendar/CalendarPage").then((m) => ({
    default: m.CalendarPage,
  }))
);

const TutorHomeworkPage = lazy(() =>
  import("@/features/homework/TutorHomeworkPage").then((m) => ({
    default: m.TutorHomeworkPage,
  }))
);


const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  }))
);

const StudentHomeworkPage = lazy(() =>
  import("@/features/homework/StudentHomeworkPage").then((m) => ({
    default: m.StudentHomeworkPage,
  }))
);

const TutorDashboardPage = lazy(() =>
  import("@/features/dashboard/TutorDashboardPage").then((m) => ({
    default: m.TutorDashboardPage,
  }))
);

const StudentDashboardPage = lazy(() =>
  import("@/features/dashboard/StudentDashboardPage").then((m) => ({
    default: m.StudentDashboardPage,
  }))
);

// ============================================================
// TEMPORARY DASHBOARD PLACEHOLDERS
// ============================================================

const TutorOverview: React.FC = () => (
  <PageContainer>
    <PageHeader
      title="Tutor Overview"
      description="Review today's agenda, pending debriefs, and recent student progress."
    />

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="md:col-span-2">
        <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
          Today's Sessions
        </h3>
        <p className="text-sm text-[#64748B]">
          Upcoming scheduled tutoring sessions will appear here.
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
          Pending Reviews
        </h3>
        <p className="text-sm text-[#64748B]">
          Sessions awaiting debrief and homework assignments.
        </p>
      </Card>
    </div>
  </PageContainer>
);

const StudentPortalHome: React.FC = () => (
  <PageContainer>
    <PageHeader
      title="My Learning Workspace"
      description="Track upcoming sessions, review lesson notes, and complete assigned exercises."
    />

    <Card>
      <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
        Active Homework & Goals
      </h3>
      <p className="text-sm text-[#64748B]">
        Your upcoming tasks will be organized here.
      </p>
    </Card>
  </PageContainer>
);

// ============================================================
// ROOT DISPATCHER (Role-Aware Redirect)
// ============================================================

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "student") {
    return <Navigate to="/portal" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// ============================================================
// MAIN ROUTES
// ============================================================

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        {/* Root Dynamic Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* ================================================== */}
        {/* PUBLIC AUTH ROUTES                                 */}
        {/* ================================================== */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* ================================================== */}
        {/* SHARED AUTHENTICATED ROUTES (Tutor, Student, Admin) */}
        {/* ================================================== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["tutor", "student", "admin"]} />
          }
        >
          <Route element={<AppShell />}>
            {/* Session Workspace: Accessible to both roles */}
            <Route path="/sessions/:sessionId" element={<SessionWorkspace />} />
            <Route path="/dashboard/sessions/:sessionId" element={<SessionWorkspace />} />

            <Route path="/settings" element={<SettingsPage />} />

            {/* ============================================== */}
            {/* TUTOR & ADMIN EXCLUSIVE ROUTES                 */}
            {/* ============================================== */}
            <Route element={<ProtectedRoute allowedRoles={["tutor", "admin"]} />}>
              <Route path="/dashboard" element={<TutorDashboardPage />} />
              <Route path="/dashboard/students" element={<StudentsPage />} />
              <Route path="/dashboard/students/:profileId" element={<StudentDetailPage />} />
              <Route path="/dashboard/sessions" element={<SessionsPage />} />
              <Route path="/dashboard/calendar" element={<CalendarPage />} />
              <Route path="/dashboard/homework" element={<TutorHomeworkPage />} />
            </Route>

            {/* ============================================== */}
            {/* STUDENT EXCLUSIVE ROUTES                       */}
            {/* ============================================== */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/portal" element={<StudentDashboardPage />} />
              <Route path="/portal/sessions" element={<StudentSessionsPage />} />
              <Route path="/portal/homework" element={<StudentHomeworkPage />} />

            </Route>
          </Route>
        </Route>

        {/* ================================================== */}
        {/* ERROR BOUNDARIES & FALLBACKS                       */}
        {/* ================================================== */}
        <Route
          path="/unauthorized"
          element={
            <div className="flex h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center select-none">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-100 bg-red-50 font-bold text-red-600">
                403
              </div>
              <h1 className="text-2xl font-semibold text-[#0F172A]">Access Restricted</h1>
              <p className="mt-1 max-w-sm text-sm text-[#64748B]">
                You do not have the required permissions to view this resource.
              </p>
            </div>
          }
        />

        <Route
          path="*"
          element={
            <div className="flex h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center select-none">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 font-bold text-[#0F172A]">
                404
              </div>
              <h1 className="text-2xl font-semibold text-[#0F172A]">Page Not Found</h1>
              <p className="mt-1 max-w-sm text-sm text-[#64748B]">
                The requested resource could not be found or has moved.
              </p>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;