// src/components/ui/CollapsibleCardSection.tsx
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleCardSectionProps {
  children: React.ReactNode;
  maxCollapsedHeight?: number; // default 260px
  expandLabel?: string;
  collapseLabel?: string;
}

export const CollapsibleCardSection: React.FC<CollapsibleCardSectionProps> = ({
  children,
  maxCollapsedHeight = 260,
  expandLabel = "Show full details",
  collapseLabel = "Show less",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if content height actually exceeds the clamp limit
  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > maxCollapsedHeight);
    }
  }, [children, maxCollapsedHeight]);

  return (
    <div className="relative">
      {/* Content wrapper with smooth height transition */}
      <div
        ref={contentRef}
        style={{
          maxHeight: !isOverflowing || isExpanded ? "none" : `${maxCollapsedHeight}px`,
        }}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          !isExpanded && isOverflowing ? "relative" : ""
        }`}
      >
        {children}

        {/* Soft bottom fade gradient when clamped */}
        {!isExpanded && isOverflowing && (
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Expand/Collapse Toggle Button */}
      {isOverflowing && (
        <div className="pt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#315FEA] hover:text-[#284FC7] bg-[#EEF2FF] hover:bg-[#E0E7FF] transition-colors shadow-2xs"
          >
            <span>{isExpanded ? collapseLabel : expandLabel}</span>
            {isExpanded ? (
              <ChevronUp size={13} className="transition-transform" />
            ) : (
              <ChevronDown size={13} className="transition-transform" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};