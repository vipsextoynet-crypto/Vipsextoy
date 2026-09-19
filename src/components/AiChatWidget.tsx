"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ExternalLink } from "lucide-react";

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-pink-600 px-4 py-3 text-white font-semibold">
            <span>Tư vấn cùng AI</span>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          {/* Body Chat */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm bg-gray-50">
            <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white p-3 text-gray-800 shadow-sm border border-gray-100">
              Chào bạn 👋 Bạn cần tìm mẫu sản phẩm nào để shop gửi danh sách ạ?
            </div>

            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                {m.content && (
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-pink-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100"
                    }`}
                  >
                    {m.content}
                  </div>
                )}

                {/* VẼ THẺ SẢN PHẨM Ở ĐÂY */}
                {m.toolInvocations?.map((tool) => {
                  if (tool.toolName === "searchProducts" && tool.state === "result") {
                    return (
                      <div key={tool.toolCallId} className="space-y-2 pt-1">
                        {tool.result.map((prod: any) => (
                          <a
                            key={prod.id}
                            href={prod.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm hover:border-pink-500 hover:shadow-md transition group"
                          >
                            <img
                              src={prod.image || "/placeholder.png"}
                              alt={prod.name}
                              className="h-14 w-14 rounded-lg object-cover border border-gray-100"
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
                    );
                  }
                  return null;
                })}
              </div>
            ))}

            {isLoading && (
              <div className="text-xs text-gray-400 italic">Shop đang tìm sản phẩm...</div>
            )}
          </div>

          {/* Form Nhập */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t bg-white p-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Nhập yêu cầu (VD: mẫu dưới 500k)..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600 text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Button Mở Chat */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white shadow-xl hover:scale-105 transition"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}