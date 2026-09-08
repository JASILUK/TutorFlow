// src/components/layout/UserMenu.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TF";

  const handleNavigateToSettings = () => {
    setIsOpen(false);
    navigate("/settings");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
      >
        <div className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center text-xs font-semibold select-none">
          {initials}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-[13px] font-medium text-[#0F172A] leading-tight">
            {user?.full_name || "User"}
          </span>
          <span className="text-[11px] text-[#94A3B8] capitalize leading-none mt-0.5">
            {user?.role || "Tutor"}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[#94A3B8] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-[#E2E8F0]/60 md:hidden">
            <p className="text-[13px] font-medium text-[#0F172A] truncate">{user?.full_name}</p>
            <p className="text-[11px] text-[#94A3B8] truncate">{user?.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleNavigateToSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            <Settings size={16} className="text-[#94A3B8]" />
            Settings
          </button>

          <div className="my-1 border-t border-[#E2E8F0]/80" />

          <button
            type="button"
            role="menuitem"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
          >
            <LogOut size={16} />
            {logoutMutation.isPending ? "Signing out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;