import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { BrandLoader } from "@/components/ui/brand-loader";

// Ensure this matches the actual file extension present in public/
const LOGO_ASSET_PATH = "/brand/tutorflow/tutorflow-logo.png";

export const FullScreenLoader: React.FC = () => {
  const [revealed, setRevealed] = useState(false);
  const [markEntered, setMarkEntered] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setRevealed(true);
      setMarkEntered(true);
      return;
    }

    // Phase 1: Logo Reveal
    const t1 = setTimeout(() => setRevealed(true), 50);
    // Phase 2: Flow Mark Entrance after reveal (850ms)
    const t2 = setTimeout(() => setMarkEntered(true), 850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden p-6 select-none"
      style={{
        backgroundColor: "#F8FAFC",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <AmbientBackground />

      <div className="relative z-10 flex flex-col items-center">
        {/* 1. Complete Logo Reveal (Left -> Right) */}
        <div
          className="mb-10 transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            clipPath: revealed ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
            opacity: revealed ? 1 : 0,
          }}
        >
          <img
            src={LOGO_ASSET_PATH}
            alt="TutorFlow"
            className="h-9 sm:h-10 w-auto object-contain pointer-events-none"
            loading="eager"
          />
        </div>

        {/* 2. Flow Mark Entrance */}
        <div
          className="transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: markEntered ? 1 : 0,
            transform: markEntered ? "scale(1)" : "scale(0.94)",
          }}
        >
          <BrandLoader size="lg" variant="primary" speed="fast" />
        </div>

        <p
          className="mt-5 text-[13px] sm:text-[14px] font-medium select-none"
          style={{ color: "#475569" }}
          aria-hidden="true"
        >
          Initializing your workspace…
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Ambient background                                                */
/* ------------------------------------------------------------------ */

function AmbientBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(49, 95, 234, 0.05) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

export default FullScreenLoader;

/* ------------------------------------------------------------------ */
/*  Public Only Route Guard (Preserved)                               */
/* ------------------------------------------------------------------ */

export const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated && user) {
    if (user.role === "student") {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/* ------------------------------------------------------------------ */
/*  Protected Route Guard (Preserved)                                 */
/* ------------------------------------------------------------------ */

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};