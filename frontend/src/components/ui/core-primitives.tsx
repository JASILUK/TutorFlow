// src/components/ui/core-primitives.tsx
import React from "react";

/* ---------------- Card ---------------- */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    className={`bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] p-5 sm:p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
);

/* ---------------- Button ---------------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 disabled:opacity-60 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-[#315FEA] text-white hover:bg-[#284FC7] active:bg-[#1E3EB4]",
    secondary: "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]",
    outline: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]",
    ghost: "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
    danger: "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 sm:h-10 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/* ---------------- Empty State ---------------- */
export interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-[#CBD5E1] rounded-xl bg-[#F8FAFC]/50">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-4">
      <Icon size={24} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
    <p className="mt-1.5 text-sm text-[#64748B] max-w-sm">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ---------------- Skeleton Loader ---------------- */
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`animate-pulse rounded-md bg-[#E2E8F0]/70 ${className}`}
    {...props}
  />
);