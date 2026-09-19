"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

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
        <div className="fixed bottom-24 right-6 z-50 flex h-[30rem] w-80 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-pink-600 px-4 py-3 text-white">
            <p className="text-sm font-semibold">Tư vấn cùng AI</p>
            <button onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            <div className="max-w-[85%] rounded-lg bg-gray-100 p-3 text-gray-800">
              Chào bạn 👋 Mình là trợ lý tư vấn của shop. Bạn cần tìm sản phẩm gì ạ?
            </div>

            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                {/* Nội dung tin nhắn văn bản */}
                {m.content && (
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      m.role === "user"
                        ? "ml-auto bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.content}
                  </div>
                )}

                {/* Render thẻ Sản Phẩm nếu AI sử dụng Tool Calling */}
                {m.toolInvocations?.map((tool) => {
                  if (tool.toolName === "searchProducts" && tool.state === "result") {
                    const productsList = tool.result;
                    return (
                      <div key={tool.toolCallId} className="grid gap-2 pt-1">
                        {productsList.map((prod: any) => (
                          <a
                            key={prod.id}
                            href={prod.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition"
                          >
                            {prod.image && (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 overflow-hidden">
                              <p className="font-medium text-gray-900 truncate">{prod.name}</p>
                              <p className="text-xs font-semibold text-pink-600">
                                {prod.price.toLocaleString("vi-VN")} đ
                              </p>
                            </div>
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
              <div className="text-xs text-gray-400 italic">Shop đang nhắn...</div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Nhập yêu cầu (VD: trứng rung dưới 500k)..."
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Button Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg hover:opacity-90 transition"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}