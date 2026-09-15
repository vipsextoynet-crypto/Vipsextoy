"use client";

import { ReactNode } from "react";
import { useSensitive } from "@/lib/sensitive-context";

export default function SensitiveOverlay({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const { revealed, reveal } = useSensitive();

  if (!active || revealed) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none h-full w-full blur-lg brightness-75">
        {children}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          reveal();
        }}
        aria-label="Bấm để xem hình ảnh thực tế"
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-black/40 text-white transition hover:bg-black/50"
      >
        <span className="border border-white/70 px-2 py-0.5 text-sm font-bold tracking-wide sm:px-3 sm:py-1 sm:text-base">
          18+
        </span>
        <span className="text-[10px] tracking-wide sm:text-xs">
          Bấm để xem ảnh
        </span>
      </button>
    </div>
  );
}
