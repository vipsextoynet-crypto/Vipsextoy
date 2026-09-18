"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type SkuGroup = { sku: string; files: File[] };
type LogLine = { text: string; kind: "info" | "ok" | "err" };

export default function BulkImagesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<SkuGroup[]>([]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);

  function addLog(text: string, kind: LogLine["kind"] = "info") {
    setLog((prev) => [...prev, { text, kind }]);
  }

  function handlePickFolder(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const map = new Map<string, File[]>();

    for (const file of files) {
      // webkitRelativePath dang: "anh1/AD02/01.jpg" -> lay phan thu 2 lam SKU
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const parts = rel.split("/");
      const sku = parts.length >= 2 ? parts[1] : "khac";

      if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name)) continue; // bo qua file khong phai anh

      if (!map.has(sku)) map.set(sku, []);
      map.get(sku)!.push(file);
    }

    const list: SkuGroup[] = Array.from(map.entries()).map(([sku, fs]) => ({ sku, files: fs }));
    setGroups(list);
    setDone(false);
    setLog([]);
  }

  async function handleUploadAll() {
    if (groups.length === 0) return;
    setRunning(true);
    setDone(false);
    setLog([]);

    const items: { sku: string; urls: string[] }[] = [];

    for (const group of groups) {
      addLog(`Đang tải ${group.files.length} ảnh cho SKU "${group.sku}"...`);
      const urls: string[] = [];

      for (const file of group.files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sku", group.sku);

        try {
          const res = await fetch("/api/admin/products/upload-image", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (!res.ok) {
            addLog(`  Lỗi tải "${file.name}": ${data.error}`, "err");
            continue;
          }
          urls.push(data.url);
        } catch {
          addLog(`  Lỗi kết nối khi tải "${file.name}"`, "err");
        }
      }

      if (urls.length > 0) {
        items.push({ sku: group.sku, urls });
        addLog(`  Xong ${urls.length}/${group.files.length} ảnh cho "${group.sku}"`, "ok");
      } else {
        addLog(`  Không tải được ảnh nào cho "${group.sku}", bỏ qua.`, "err");
      }
    }

    addLog("Đang lưu vào sản phẩm (1 lần commit duy nhất)...");

    try {
      const res = await fetch("/api/admin/products/bulk-apply-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (!res.ok) {
        addLog(`Lỗi lưu: ${data.error}`, "err");
      } else {
        for (const m of data.matched) {
          addLog(`✓ Đã cập nhật ảnh cho: ${m.name} (SKU ${m.sku})`, "ok");
        }
        for (const sku of data.unmatched || []) {
          addLog(`✗ Không tìm thấy sản phẩm có SKU "${sku}"`, "err");
        }
        addLog("Hoàn tất! Website sẽ build lại sau khoảng 1–2 phút.", "ok");
      }
    } catch {
      addLog("Không kết nối được tới server khi lưu.", "err");
    }

    setRunning(false);
    setDone(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/admin/products" className="mb-6 inline-block text-sm text-muted hover:text-ivory">
        ← Quay lại danh sách
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ivory">Tải ảnh theo thư mục</h1>
      <p className="mb-6 text-sm text-muted">
        Chọn thư mục cha (VD: <code>anh1</code>) — bên trong có các thư mục con đặt tên đúng theo{" "}
        <b>mã SKU</b> (VD: <code>AD02</code>). Hệ thống tự khớp SKU với sản phẩm và cập nhật ảnh,
        chỉ build lại web 1 lần cho toàn bộ.
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        // @ts-expect-error - webkitdirectory chua co trong type chuan cua React
        webkitdirectory="true"
        directory=""
        onChange={handlePickFolder}
        className="mb-4 block w-full text-sm text-ivory"
      />

      {groups.length > 0 && (
        <div className="mb-6 border border-line bg-surface p-4">
          <p className="mb-2 text-sm text-ivory">Tìm thấy {groups.length} mã SKU:</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
            {groups.map((g) => (
              <li key={g.sku}>
                {g.sku} — {g.files.length} ảnh
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUploadAll}
        disabled={groups.length === 0 || running}
        className="mb-6 w-full bg-cta py-3 text-sm font-medium tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {running ? "Đang xử lý..." : `Tải lên & cập nhật (${groups.length} SKU)`}
      </button>

      {log.length > 0 && (
        <div className="max-h-80 overflow-y-auto border border-line bg-surface2 p-3 text-xs">
          {log.map((line, i) => (
            <p
              key={i}
              className={
                line.kind === "ok"
                  ? "text-green-400"
                  : line.kind === "err"
                  ? "text-red-400"
                  : "text-muted"
              }
            >
              {line.text}
            </p>
          ))}
        </div>
      )}

      {done && (
        <p className="mt-4 text-sm text-muted">
          Có thể đóng trang này hoặc chọn thư mục khác để tải tiếp.
        </p>
      )}
    </main>
  );
}
