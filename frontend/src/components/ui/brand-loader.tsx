import * as React from "react";

export interface BrandLoaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * sm: 18px (buttons, tight inline indicators)
   * md: 28px (cards, modal sections)
   * lg: 44px (route transitions, splash screens)
   * xl: 60px (large branded initialization)
   */
  size?: "sm" | "md" | "lg" | "xl";
  /** Accessible label. Also shown visibly when showLabel is true. */
  label?: string;
  /** Render the label as visible text next to the spinner. */
  showLabel?: boolean;
  /**
   * primary: Brand Blue (#315FEA) on light backgrounds
   * white: Crisp white for dark or primary filled buttons
   */
  variant?: "primary" | "white";
  /** Rotation speed */
  speed?: "fast" | "normal";
}

const SIZE_MAP: Record<NonNullable<BrandLoaderProps["size"]>, { px: number; stroke: number }> = {
  sm: { px: 18, stroke: 2.5 },
  md: { px: 28, stroke: 3.0 },
  lg: { px: 44, stroke: 3.5 },
  xl: { px: 60, stroke: 4.0 },
};

const TEXT_CLASS: Record<NonNullable<BrandLoaderProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export const BrandLoader = React.forwardRef<HTMLDivElement, BrandLoaderProps>(
  (
    {
      size = "md",
      label = "Loading…",
      showLabel = false,
      variant = "primary",
      speed = "normal",
      className = "",
      ...props
    },
    ref
  ) => {
    const { px, stroke } = SIZE_MAP[size];
    const isWhite = variant === "white";

    const ringTrack = isWhite ? "rgba(255, 255, 255, 0.25)" : "rgba(49, 95, 234, 0.15)";
    const ringHead = isWhite ? "#FFFFFF" : "#315FEA";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2.5 select-none ${className}`}
        {...props}
      >
        <div
          className="relative shrink-0 flex items-center justify-center"
          style={{ width: px, height: px }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`w-full h-full transform-gpu tf-spinner-rotate ${
              speed === "fast" ? "tf-speed-fast" : "tf-speed-normal"
            }`}
          >
            {/* Ambient Background Track */}
            <circle
              cx="18"
              cy="18"
              r="14"
              stroke={ringTrack}
              strokeWidth={stroke}
            />

            {/* Leading Spinner Arc */}
            <circle
              cx="18"
              cy="18"
              r="14"
              stroke={ringHead}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray="60 100"
            />
          </svg>
        </div>

        {showLabel ? (
          <span
            className={`font-medium ${TEXT_CLASS[size]} tracking-tight select-none`}
            style={{
              color: isWhite ? "#FFFFFF" : "#475569",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {label}
          </span>
        ) : (
          <span className="sr-only">{label}</span>
        )}

        <style>{`
          .tf-spinner-rotate {
            animation-name: tfSpinRotate;
            animation-iteration-count: infinite;
            animation-timing-function: linear;
          }

          .tf-speed-fast {
            animation-duration: 0.65s;
          }

          .tf-speed-normal {
            animation-duration: 0.85s;
          }

          @keyframes tfSpinRotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .tf-spinner-rotate {
              animation-duration: 2s;
            }
          }
        `}</style>
      </div>
    );
  }
);

BrandLoader.displayName = "BrandLoader";

export default BrandLoader;