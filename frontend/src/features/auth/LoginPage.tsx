import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useLoginMutation } from "@/features/auth/hooks/useAuthMutations";
import { BrandLoader } from "@/components/ui/brand-loader";

/* ------------------------------------------------------------------ */
/*  Validation Schema                                                 */
/* ------------------------------------------------------------------ */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ------------------------------------------------------------------ */
/*  Canonical TutorFlow Logo Lockup                                   */
/* ------------------------------------------------------------------ */
interface LogoProps {
  className?: string;
}

function TutorFlowLogo({ className = "" }: LogoProps) {
  return (
    <img
      src="/brand/tutorflow/tutorflow-logo.png"
      alt="TutorFlow"
      className={`h-9 w-auto object-contain shrink-0 select-none ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Pedagogical Ambient Mesh Background (Continuous Workspace Fabric)  */
/* ------------------------------------------------------------------ */
function GlobalWorkspaceBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* Precision 24px session graph grid */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 232, 240, 0.6) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Primary continuous session curve traversing across the screen */}
      <svg
        className="absolute w-full h-full opacity-[0.28]"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M -100 700 C 300 700, 450 220, 720 220 S 1100 600, 1540 380"
          stroke="#315FEA"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <path
          d="M -50 820 C 350 820, 520 340, 800 340 S 1200 720, 1600 500"
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      </svg>

      {/* Restrained brand focal lighting */}
      <div
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #315FEA 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, #60A5FA 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subtle Pedagogical Flow System (Teaching -> Learning -> Progress) */
/* ------------------------------------------------------------------ */
function BrandArchitectureGraphic() {
  return (
    <div
      className="relative w-full my-auto select-none pointer-events-none"
      aria-hidden="true"
    >
      <div className="relative h-44 w-full overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 460 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tfFlowBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#315FEA" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#315FEA" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="tfPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#315FEA" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 10 140 C 130 140, 180 40, 290 40 S 370 120, 450 90"
            stroke="#E2E8F0"
            strokeWidth="1.25"
            strokeDasharray="4 4"
            fill="none"
          />
          <path
            d="M -20 110 C 110 110, 150 25, 260 25 S 350 145, 480 80"
            stroke="url(#tfFlowBaseGrad)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M -20 110 C 110 110, 150 25, 260 25 S 350 145, 480 80"
            stroke="url(#tfPulseGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="tf-ambient-pulse"
          />
          <circle cx="150" cy="58" r="3.5" fill="#315FEA" fillOpacity="0.8" />
          <circle cx="150" cy="58" r="8" stroke="#315FEA" strokeOpacity="0.2" strokeWidth="1" />
          <circle cx="305" cy="85" r="3" fill="#60A5FA" fillOpacity="0.8" />
          <circle cx="305" cy="85" r="7" stroke="#60A5FA" strokeOpacity="0.2" strokeWidth="1" />
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 pt-3 border-t border-[#E2E8F0]/75">
        {[
          { step: "Teaching", num: "01" },
          { step: "Learning", num: "02" },
          { step: "Feedback", num: "03" },
          { step: "Progress", num: "04" },
        ].map((item, idx) => (
          <div key={item.step} className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#94A3B8] tracking-wider">
              {item.num}
            </span>
            <span
              className={`text-[12px] font-medium tracking-tight ${
                idx === 0 ? "text-[#0F172A] font-semibold" : "text-[#64748B]"
              }`}
            >
              {item.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Login Page Component                                         */
/* ------------------------------------------------------------------ */
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const isLoading = loginMutation.isPending;

  return (
    <div
      className="relative min-h-dvh w-full flex overflow-x-hidden bg-[#F8FAFC] selection:bg-[#EEF2FF] selection:text-[#315FEA]"
      style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      {/* Global Architectural Background Grid across both columns */}
      <GlobalWorkspaceBackground />

      {/* ============================================================= */}
      {/*  LEFT PANEL — Brand Architecture (Desktop / Tablet)           */}
      {/* ============================================================= */}
      <aside
        className="hidden md:flex md:w-[42%] lg:w-[40%] relative flex-col justify-between p-10 lg:p-14 overflow-hidden border-r shrink-0 select-none bg-[#F8FAFC]/80 backdrop-blur-[2px] border-[#E2E8F0] z-10"
      >
        <div className="relative z-10 tf-enter-1">
          <TutorFlowLogo />
        </div>
        <div className="relative z-10 flex flex-col my-auto max-w-sm w-full py-8">
          <div className="space-y-3 mb-6 tf-enter-2">
            <h1
              className="text-[28px] lg:text-[32px] font-semibold leading-[1.22] tracking-tight text-[#0F172A]"
            >
              Teaching flows.
              <br />
              <span className="text-[#315FEA]">Learning grows.</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[#475569]">
              A focused workspace for better tutoring sessions, meaningful
              progress, and smarter follow-up.
            </p>
          </div>
          <div className="tf-enter-3">
            <BrandArchitectureGraphic />
          </div>
        </div>
        <div
          className="relative z-10 flex items-center justify-between text-[12px] pt-4 border-t border-[#E2E8F0]/70 select-none text-[#94A3B8]"
        >
          <span>© 2026 TutorFlow. All rights reserved.</span>
          <span className="font-mono text-[11px] text-[#64748B]">Auth v1.0</span>
        </div>
      </aside>

      {/* ============================================================= */}
      {/*  RIGHT PANEL — Elevated SaaS Authentication Workspace         */}
      {/* ============================================================= */}
      <main className="relative flex-1 flex flex-col justify-center items-center px-4 sm:px-8 md:px-10 lg:px-12 py-10 sm:py-14 min-h-dvh z-10">
        <div className="w-full max-w-[420px] tf-enter-form">
          {/* Mobile Branded Header */}
          <div className="md:hidden flex justify-start mb-6 px-1 select-none">
            <TutorFlowLogo />
          </div>

          {/* Structured Authentication Card */}
          <div className="w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_8px_30px_-4px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.03)] px-6 py-7 sm:px-8 sm:py-9">
            {/* Header Block with Session Protocol Indicator */}
            <header className="mb-7">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#315FEA] select-none">
                  Workspace Authentication
                </span>
                
              </div>

              <h2 className="text-[23px] sm:text-[25px] font-semibold tracking-tight text-[#0F172A] leading-[1.2] mb-1.5">
                Sign in to TutorFlow
              </h2>
              <p className="text-[14px] text-[#475569] leading-[22px]">
                Enter your registered email and password.
              </p>
            </header>

            {/* Form Fields */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col"
              noValidate
            >
              {/* Email Input Group */}
              <div className="flex flex-col mb-[18px]">
                <label
                  htmlFor="email"
                  className="text-[13px] font-medium text-[#0F172A] mb-[6px] select-none"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  placeholder="name@example.com"
                  disabled={isLoading}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full h-[44px] px-[14px] text-[15px] text-[#0F172A] bg-white rounded-[8px] border outline-none transition-[border-color,box-shadow,opacity] duration-150 placeholder:text-[#94A3B8] disabled:opacity-65 disabled:cursor-not-allowed ${
                    errors.email
                      ? "border-[#DC2626] focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:shadow-[0_0_0_3px_rgba(49,95,234,0.10)]"
                  }`}
                  {...register("email")}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-[12px] font-medium text-[#DC2626] mt-[5px] tf-error-appear"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input Group */}
              <div className="flex flex-col mb-[22px]">
                <label
                  htmlFor="password"
                  className="text-[13px] font-medium text-[#0F172A] mb-[6px] select-none"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className={`w-full h-[44px] pl-[14px] pr-[44px] text-[15px] text-[#0F172A] bg-white rounded-[8px] border outline-none transition-[border-color,box-shadow,opacity] duration-150 placeholder:text-[#94A3B8] disabled:opacity-65 disabled:cursor-not-allowed ${
                      errors.password
                        ? "border-[#DC2626] focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] focus:border-[#315FEA] focus:shadow-[0_0_0_3px_rgba(49,95,234,0.10)]"
                    }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-[4px] w-[36px] h-[36px] flex items-center justify-center rounded-[6px] text-[#94A3B8] hover:text-[#475569] hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 active:bg-[#F1F5F9] transition-colors duration-150 disabled:pointer-events-none"
                  >
                    {showPassword ? (
                      <EyeOff size={17} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Eye size={17} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-[12px] font-medium text-[#DC2626] mt-[5px] tf-error-appear"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[44px] flex items-center justify-center gap-2.5 px-4 text-[14px] font-semibold text-white bg-[#315FEA] hover:bg-[#284FC7] active:bg-[#1E3EB4] rounded-[8px] shadow-sm transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-[#315FEA]/20 disabled:bg-[#284FC7] disabled:opacity-80 disabled:cursor-not-allowed select-none"
              >
                {isLoading ? (
                  <>
                    <BrandLoader size="sm" variant="white" speed="fast" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Bottom Security Context */}
            <div className="mt-6 pt-5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#94A3B8] select-none">
              <span>Encrypted Session</span>
              <span className="font-mono text-[#64748B]">TutorFlow ID v1.0</span>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================= */}
      {/*  Keyframes & Motion Tokens                                    */}
      {/* ============================================================= */}
      <style>{`
        .tf-enter-1 {
          animation: tfFadeInUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .tf-enter-2 {
          animation: tfFadeInUp 400ms cubic-bezier(0.16, 1, 0.3, 1) 70ms forwards;
          opacity: 0;
        }
        .tf-enter-3 {
          animation: tfFadeInUp 400ms cubic-bezier(0.16, 1, 0.3, 1) 140ms forwards;
          opacity: 0;
        }
        .tf-enter-form {
          animation: tfFadeInUp 420ms cubic-bezier(0.16, 1, 0.3, 1) 90ms forwards;
        }

        @keyframes tfFadeInUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tf-ambient-pulse {
          stroke-dasharray: 120 400;
          animation: tfAmbientRun 6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change: stroke-dashoffset;
        }

        @keyframes tfAmbientRun {
          0% {
            stroke-dashoffset: 520;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        .tf-error-appear {
          animation: tfErrorIn 160ms ease-out forwards;
        }

        @keyframes tfErrorIn {
          from {
            opacity: 0;
            transform: translateY(-2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tf-enter-1,
          .tf-enter-2,
          .tf-enter-3,
          .tf-enter-form,
          .tf-error-appear {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .tf-ambient-pulse {
            animation: none !important;
            stroke-dasharray: none !important;
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}