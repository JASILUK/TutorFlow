// src/components/layout/Topbar.tsx
import React from "react";
import { Menu, Bell } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { TutorFlowLogo } from "@/components/brand/TutorFlowLogo";

interface TopbarProps {
  onOpenMobileNav: () => void;
  titleContext?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileNav, titleContext }) => {
  return (
    <header className="h-[60px] bg-white border-b border-[#E2E8F0] px-4 md:px-8 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Mobile trigger & context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="md:hidden p-1.5 -ml-1 text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
        >
          <Menu size={20} />
        </button>

        <div className="md:hidden">
          <TutorFlowLogo />
        </div>

        {titleContext && (
          <div className="hidden md:flex items-center gap-2 text-sm text-[#94A3B8]">
            <span className="font-medium text-[#0F172A]">{titleContext}</span>
          </div>
        )}
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 relative"
        >
          <Bell size={18} strokeWidth={1.8} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#315FEA] ring-2 ring-white" />
        </button>

        <div className="h-5 w-px bg-[#E2E8F0] mx-1" aria-hidden="true" />

        <UserMenu />
      </div>
    </header>
  );
};