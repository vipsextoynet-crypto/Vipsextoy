// scripts/reformat-long-descriptions.mjs
//
// KHONG dung AI. Doc noi dung longDescription DANG CO SAN trong
// src/data/products.ts (dang text thuong, moi dong 1 y), tu nhan dien:
//   - Dong la TIEU DE (h2): dong NGAN, khong ket thuc bang dau "." hay "!"
//     (vd "Ưu điểm nổi bật", "Vì sao nên chọn X?")
//   - Dong ket thuc bang ":": xem la cau dan nhap truoc 1 danh sach
//   - Nhieu dong ngan lien tiep sau tieu de/dan nhap: gom thanh <ul><li>
//   - Con lai: doan van <p>
// Ra HTML chuan (h2/p/ul/li), giong dinh dang cac san pham da qua AI,
// de toan site nhat quan.
//
// Cach chay:
//   node scripts/reformat-long-descriptions.mjs --dry --limit=5
//   node scripts/reformat-long-descriptions.mjs --limit=100
//   node scripts/reformat-long-descriptions.mjs        (chay het)
//
//   --force  : xu ly lai ca nhung san pham da la HTML roi (mac dinh bo qua)

import fs from "node:fs/promises";
import path from "node:path";

const FILE_PATH = path.resolve("src/data/products.ts");

const args = process.argv.slice(2);
const isDry = args.includes("--dry");
const force = args.includes("--force");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

function isAlreadyHtml(text) {
  return /^\s*</.test(text);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Dong la "tieu de" neu: ngan (<= 70 ky tu) VA khong ket thuc bang "." hoac "!"
// (co the ket thuc bang "?" - cau hoi kieu "Vì sao nên chọn...?" van la tieu de).
function isHeaderLine(line) {
  if (line.length > 70) return false;
  if (/[.!]$/.test(line)) return false;
  return true;
}

function isColonLead(line) {
  return /:$/.test(line);
}

function convertToHtml(rawText) {
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isHeaderLine(line) && !isColonLead(line)) {
      html.push(`<h2>${escapeHtml(line)}</h2>`);
      i++;
      continue;
    }

    // Gom 1 "run" cac dong lien tiep khong phai tieu de (den khi gap tieu
    // de tiep theo hoac het).
    const run = [];
    while (i < lines.length && !(isHeaderLine(lines[i]) && !isColonLead(lines[i]))) {
      run.push(lines[i]);
      i++;
    }

    // Xu ly run: neu co dong ket thuc ":" o dau, tach rieng ra <p>, phan
    // con lai sau do gop thanh <ul>. Neu khong co ":", tu quyet dinh
    // bullet-list hay doan van dua theo do dai trung binh + so luong dong.
    let j = 0;
    while (j < run.length) {
      if (isColonLead(run[j])) {
        html.push(`<p>${escapeHtml(run[j])}</p>`);
        j++;
        const bulletItems = [];
        while (j < run.length && !isColonLead(run[j])) {
          bulletItems.push(run[j]);
          j++;
        }
        if (bulletItems.length > 0) {
          html.push("<ul>" + bulletItems.map((it) => `<li>${escapeHtml(it)}</li>`).join("") + "</ul>");
        }
      } else {
        // Gom cac dong "thuong" lien tiep (khong co dong ket thuc ":" xen giua)
        const plain = [];
        while (j < run.length && !isColonLead(run[j])) {
          plain.push(run[j]);
          j++;
        }
        const looksLikeBulletGroup = plain.length >= 3 && plain.every((l) => l.length <= 130);
        if (looksLikeBulletGroup) {
          html.push("<ul>" + plain.map((it) => `<li>${escapeHtml(it)}</li>`).join("") + "</ul>");
        } else {
          plain.forEach((l) => html.push(`<p>${escapeHtml(l)}</p>`));
        }
      }
    }
  }

  return html.join("\n");
}

async function main() {
  let content = await fs.readFile(FILE_PATH, "utf8");

  const slugMatches = [...content.matchAll(/slug:\s*"([^"]+)"/g)];
  const blocks = slugMatches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : content.length;
    return { slug: m[1], start, end, text: content.slice(start, end) };
  });

  const items = [];
  for (const block of blocks) {
    if (items.length >= limit) break;

    const nameMatch = block.text.match(/name:\s*"([^"]+)"/);
    const descMatch = block.text.match(/longDescription:\s*`([\s\S]*?)`,/);
    const isProduct = /sku:\s*"/.test(block.text);
    if (!nameMatch || !descMatch || !isProduct) continue;
    if (!force && isAlreadyHtml(descMatch[1])) continue; // da la HTML roi, bo qua

    items.push({
      slug: block.slug,
      name: nameMatch[1],
      oldText: descMatch[1],
      descStart: block.start + descMatch.index,
      descFull: descMatch[0],
    });
  }

  console.log(`Tim thay ${items.length} san pham can dinh dang lai.`);

  const ordered = [...items].reverse(); // xu ly nguoc de index khong lech

  if (!isDry && ordered.length > 0) {
    const backupPath = FILE_PATH + `.backup-${Date.now()}`;
    await fs.copyFile(FILE_PATH, backupPath);
    console.log(`Đã sao lưu file gốc tại: ${backupPath}`);
  }

  let done = 0;
  for (const item of ordered) {
    const newHtml = convertToHtml(item.oldText);

    if (isDry) {
      console.log(`\n→ [${done + 1}/${ordered.length}] ${item.slug} (${item.name})`);
      console.log("--- KET QUA (dry run) ---");
      console.log(newHtml.slice(0, 800) + (newHtml.length > 800 ? "..." : ""));
    } else {
      const safe = newHtml.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      const newDescBlock = `longDescription: \`${safe}\`,`;
      content =
        content.slice(0, item.descStart) +
        newDescBlock +
        content.slice(item.descStart + item.descFull.length);
    }
    done++;
  }

  if (isDry) {
    console.log("\n(Dry run — không có gì được ghi vào file)");
  } else {
    await fs.writeFile(FILE_PATH, content, "utf8");
    console.log(`\nĐã định dạng lại ${done}/${ordered.length} sản phẩm và ghi vào ${FILE_PATH}`);
  }
}

main().catch((e) => {
  console.error("Lỗi:", e);
  process.exit(1);
});
