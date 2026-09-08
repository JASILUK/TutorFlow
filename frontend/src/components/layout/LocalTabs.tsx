// src/components/layout/LocalTabs.tsx
import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface LocalTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const LocalTabs: React.FC<LocalTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div className={`border-b border-[#E2E8F0] mb-6 ${className}`}>
      <nav className="flex gap-6 -mb-px overflow-x-auto no-scrollbar" aria-label="Local Sections">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`pb-3 text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "border-[#315FEA] text-[#315FEA] font-semibold"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? "bg-[#EEF2FF] text-[#315FEA]" : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};