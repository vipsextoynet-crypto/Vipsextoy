"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ExternalLink } from "lucide-react";

type ChatMessage = { role: "user" | "model"; text: string; products?: any[] };

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: "Chào bạn 👋 Bạn cần tìm sản phẩm gì để shop gửi danh sách ạ?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, text: m.text }))
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages(prev => [
          ...prev,
          { role: "model", text: data.reply, products: data.products || [] }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: "model", text: "Hệ thống bận, bạn vui lòng thử lại hoặc nhắn Zalo shop nhé!" }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "model", text: "Lỗi kết nối, vui lòng thử lại!" }
      ]);
    }
    setLoading(false);
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between bg-pink-600 px-4 py-3 text-white font-semibold">
            <span>Tư vấn cùng AI</span>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-pink-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100"
                  }`}
                >
                  {m.text}
                </div>

                {/* HIỂN THỊ THẺ SẢN PHẨM NẾU CÓ DỮ LIỆU */}
                {m.products && m.products.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {m.products.map((prod: any) => (
                      <a
                        key={prod.id}
                        href={prod.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm hover:border-pink-500 transition group"
                      >
                        <img
                          src={prod.image || "/placeholder.png"}
                          alt={prod.name}
                          className="h-12 w-12 rounded-lg object-cover border"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium text-gray-900 truncate text-xs group-hover:text-pink-600">
                            {prod.name}
                          </p>
                          <p className="text-sm font-bold text-pink-600 mt-0.5">
                            {Number(prod.price).toLocaleString("vi-VN")} đ
                          </p>
                        </div>
                        <ExternalLink size={16} className="text-gray-400 group-hover:text-pink-600 mr-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="text-xs text-gray-400 italic">Shop đang nhắn...</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t bg-white p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Nhập câu hỏi..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600 text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white shadow-xl hover:scale-105 transition"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}