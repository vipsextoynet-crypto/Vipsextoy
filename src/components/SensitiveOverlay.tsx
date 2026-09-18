"use client";

import { ReactNode } from "react";
import { MousePointerClick } from "lucide-react";
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
      {/* Ảnh thật vẫn nằm trong DOM để giữ layout / preload, nhưng ẩn hoàn
          toàn (khong hien mot chut nao) cho toi khi khach bam xem. */}
      <div className="invisible h-full w-full">{children}</div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          reveal();
        }}
        aria-label="Bấm để xem hình ảnh sản phẩm thực tế"
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0b0f2e] p-3 transition hover:brightness-110"
      >
        {/* Vòng tròn neon 18+ */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-20 sm:w-20"
          style={{
            borderColor: "#ff2fb0",
            boxShadow: "0 0 10px 2px rgba(255,47,176,0.6), inset 0 0 8px rgba(168,85,247,0.5)",
          }}
        >
          <div
            className="flex h-[85%] w-[85%] items-center justify-center rounded-full border"
            style={{ borderColor: "#a855f7" }}
          >
            <span
              className="text-lg font-extrabold text-white sm:text-2xl"
              style={{ textShadow: "0 0 6px #ff2fb0, 0 0 12px #a855f7" }}
            >
              18+
            </span>
          </div>
        </div>

        {/* Nhãn CLICK TO VIEW IMAGE */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#e0245e] px-2 py-1 text-white shadow sm:gap-2 sm:px-3 sm:py-1.5">
          <MousePointerClick className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          <span className="text-left leading-tight">
            <span className="block text-[8px] font-bold uppercase tracking-wide sm:text-[10px]">
              Click to view image
            </span>
            <span className="block text-[7px] font-medium sm:text-[9px]">
              Bấm để xem hình sản phẩm
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}
