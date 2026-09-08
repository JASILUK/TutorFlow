import React from "react";
import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TutorFlowLogo } from "@/components/brand/TutorFlowLogo";
import { NavSectionConfig } from "@/config/navigation";

interface SidebarProps {
  sections: NavSectionConfig[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  isCollapsed = false,
  onToggleCollapse,
  className = "",
  onItemClick,
}) => {
  return (
    <aside
      className={`bg-white border-r border-[#E2E8F0] flex flex-col shrink-0 select-none transition-[width] duration-200 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-64"
      } ${className}`}
    >
      {/* Sidebar Header */}
      <div
        className={`h-[60px] flex items-center border-b border-[#E2E8F0]/60 shrink-0 ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4 sm:px-5"
        }`}
      >
        {isCollapsed ? (
          /* COLLAPSED STATE: Shows mark normally, switches to expand button on hover */
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="group relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#EEF2FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
          >
            {/* Default: Flow Mark */}
            <img
              src="/brand/tutorflow/tutorflow-mark.svg"
              alt="TutorFlow"
              className="h-7 w-7 object-contain transition-opacity duration-150 group-hover:opacity-0 pointer-events-none"
            />

            {/* Hover: Open Button Icon */}
            <PanelLeftOpen
              size={20}
              strokeWidth={1.8}
              className="absolute text-[#315FEA] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            />
          </button>
        ) : (
          /* EXPANDED STATE: Full logo on left, close toggle on right */
          <>
            <TutorFlowLogo />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="hidden md:flex p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30"
              >
                <PanelLeftClose size={18} strokeWidth={1.8} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation Sections */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6 overflow-x-hidden"
        aria-label="Main Navigation"
      >
        {sections.map((section, idx) => (
          <div key={section.title || idx} className="space-y-1">
            {section.title && !isCollapsed && (
              <p className="px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 truncate">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.exact}
                  onClick={onItemClick}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center h-[40px] rounded-lg text-[14px] font-medium transition-colors duration-150 ${
                      isCollapsed ? "justify-center px-0" : "px-3 gap-3"
                    } ${
                      isActive
                        ? "bg-[#EEF2FF] text-[#315FEA] font-semibold"
                        : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.75}
                        className={`shrink-0 ${
                          isActive ? "text-[#315FEA]" : "text-[#94A3B8] group-hover:text-[#475569]"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Hover Tooltip when collapsed */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2 py-1 bg-[#0F172A] text-white text-xs font-medium rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Status Pill */}
      <div className="p-3 border-t border-[#E2E8F0]/60 shrink-0">
        {isCollapsed ? (
          <div
            title="Session Sync: Live"
            className="w-full flex justify-center py-1.5"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-emerald-100 animate-pulse" />
          </div>
        ) : (
          <div className="px-2.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]/50 flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#475569]">
              Session Sync
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#16A34A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              Live
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;