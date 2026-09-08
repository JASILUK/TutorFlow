// src/components/layout/Breadcrumbs.tsx
import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumbs" className="mb-3 select-none">
      <ol className="flex items-center gap-1.5 text-[13px] text-[#94A3B8]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="hover:text-[#475569] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-[#475569]" : ""}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={14} className="text-[#CBD5E1]" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};