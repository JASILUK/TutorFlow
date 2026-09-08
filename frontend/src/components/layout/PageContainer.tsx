// src/components/layout/PageContainer.tsx
import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "default" | "full" | "narrow";
  className?: string;
}

const maxWidthMap = {
  narrow: "max-w-4xl",
  default: "max-w-7xl",
  full: "max-w-full",
};

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = "default",
  className = "",
}) => {
  return (
    <div className={`w-full mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};