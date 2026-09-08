// src/components/brand/TutorFlowLogo.tsx
import React from "react";

interface TutorFlowLogoProps {
  className?: string;
  onClick?: () => void;
}

export const TutorFlowLogo: React.FC<TutorFlowLogoProps> = ({ className = "", onClick }) => {
  return (
    <img
      src="/brand/tutorflow/tutorflow-logo.png"
      alt="TutorFlow"
      onClick={onClick}
      className={`h-8 w-auto object-contain shrink-0 select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};