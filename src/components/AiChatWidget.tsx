"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type ChatMessage = { role: "user" | "model"; text: string };

const GREETING: ChatMessage = {
  role: "model",
  text: "Chào bạn 👋 Mình là trợ lý tư vấn của shop. Bạn đang tìm sản phẩm cho nhu cầu gì để mình gợi ý phù hợp nhé?",
};

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    // Lọc bỏ tin nhắn chào ban đầu (role: model) nếu nó đứng ở đầu mảng
    // giúp payload gửi lên API luôn bắt đầu bằng lượt thoại của "user"
    const apiMessages = next.filter((m, index) => !(index === 0 && m.role === "model"));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
      } else {
        setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
      }
    } catch {
      setError("Không kết nối được, vui lòng thử lại.");
    }
    setLoading(false);
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl sm:w-96">
          <div className="flex items-center justify-between bg-gold px-4 py-3 text-white">
            <p className="text-sm font-semibold">Tư vấn cùng AI</p>
            <button onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-cta text-white"
                    : "bg-surface2 text-ivory"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-lg bg-surface2 px-3 py-2 text-sm text-muted">
                Đang trả lời...
              </div>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Nhập câu hỏi..."
              className="flex-1 border border-line bg-surface2 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/50"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              aria-label="Gửi"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-white disabled:opacity-60"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tư vấn cùng AI"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-white shadow-lg transition hover:opacity-90"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>
    </>
  );
}