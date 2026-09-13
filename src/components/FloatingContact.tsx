"use client";

import { Phone } from "lucide-react";
import { site } from "@/lib/site";

function ZaloGlyph() {
  return (
    <span className="text-[11px] font-bold tracking-tight">Zalo</span>
  );
}

function TelegramGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 3.5 2.7 10.9c-1.1.45-1.1 1.08-.2 1.35l4.8 1.5 1.85 5.6c.22.6.37.83.76.83.3 0 .43-.14.6-.3l2.7-2.6 4.85 3.6c.6.35 1.03.17 1.2-.55l3.3-15.6c.24-.95-.37-1.4-1.06-1.15Z" />
    </svg>
  );
}

export default function FloatingContact() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <a
        href={site.phoneHref}
        aria-label="Gọi điện"
        className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-red text-white shadow-lg transition hover:opacity-90"
      >
        <Phone size={20} />
      </a>
      <a
        href={site.zaloHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat Zalo"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0068FF] text-white shadow-lg transition hover:opacity-90"
      >
        <ZaloGlyph />
      </a>
      <a
        href={site.telegramHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat Telegram"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#26A5E4] text-white shadow-lg transition hover:opacity-90"
      >
        <TelegramGlyph />
      </a>
    </div>
  );
}
