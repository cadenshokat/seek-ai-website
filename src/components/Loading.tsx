import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | number;

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: Size;
  fullscreen?: boolean;
  vertical?: boolean;
}

function toPx(size: Size = "md") {
  if (typeof size === "number") return size;
  switch (size) {
    case "xs":
      return 16;
    case "sm":
      return 20;
    case "md":
      return 28;
    case "lg":
      return 40;
    case "xl":
      return 56;
    default:
      return 28;
  }
}

export default function Loading({
  label = "Loading…",
  size = "md",
  fullscreen = false,
  vertical = false,
  className,
  ...props
}: LoadingProps) {
  const px = toPx(size);

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        vertical && "flex-col gap-3 text-center",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <Spinner px={px} />
      {label ? <span className="select-none">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );

  if (!fullscreen) return content;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm">
      {content}
    </div>
  );
}

function Spinner({ px }: { px: number }) {
  // Modern, minimal spinner: gradient arc + subtle glow, rotates smoothly.
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      className="animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
        <filter id="loading-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.25" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.12"
      />

      {/* Active arc */}
      <path
        d="M44 24a20 20 0 0 0-20-20"
        fill="none"
        stroke="url(#loading-gradient)"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#loading-glow)"
      />
    </svg>
  );
}
