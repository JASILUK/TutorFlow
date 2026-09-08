// src/components/layout/MobileNavDrawer.tsx
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NavSectionConfig } from "@/config/navigation";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSectionConfig[];
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose, sections }) => {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 left-0 w-[80%] max-w-[300px] bg-white shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        <div className="absolute top-3.5 right-3 z-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
          >
            <X size={18} />
          </button>
        </div>

        <Sidebar
          sections={sections}
          className="w-full h-full border-r-0"
          onItemClick={onClose}
        />
      </div>
    </div>
  );
};