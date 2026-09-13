"use client";

import { useEffect, useState } from "react";

const KEY = "vipextoy_age_ok";

export default function AgeGate() {
  const [show, setShow] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && localStorage.getItem(KEY);
    if (!ok) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm border border-line bg-surface p-8 text-center">
        {denied ? (
          <>
            <p className="font-serif text-xl text-ivory">
              Nội dung này chỉ dành cho người từ 18 tuổi trở lên.
            </p>
            <p className="mt-3 text-sm text-muted">
              Bạn cần đủ 18 tuổi để truy cập vipextoy.com.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-px w-10 bg-gold" />
            <p className="font-serif text-2xl text-ivory">Xác nhận độ tuổi</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              vipextoy.com chứa nội dung và sản phẩm dành cho người trưởng
              thành. Vui lòng xác nhận bạn đã đủ 18 tuổi để tiếp tục.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <button
                onClick={() => {
                  localStorage.setItem(KEY, "1");
                  setShow(false);
                }}
                className="w-full bg-gold py-3 text-sm tracking-wide text-background transition hover:bg-ivory"
              >
                Tôi đã đủ 18 tuổi — Vào trang
              </button>
              <button
                onClick={() => setDenied(true)}
                className="w-full border border-line py-3 text-sm text-muted transition hover:border-muted hover:text-ivory"
              >
                Tôi chưa đủ 18 tuổi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
