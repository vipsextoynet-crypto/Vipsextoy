// scripts/apply-product-details.mjs
//
// Doc file scripts/_details_state/product_details.jsonl (do
// download_product_details.py tao ra) va ghi noi dung "Chi tiet" vao field
// longDescription cua tung san pham trong src/data/products.ts, khop theo
// MA SKU (code lay tu vipsextoy.net phai TRUNG voi sku dang dung trong
// products.ts thi moi khop duoc).
//
// CACH DUNG (trong G:\vipextoy)
//   node scripts/apply-product-details.mjs --dry-run   # xem truoc, KHONG ghi gi
//   node scripts/apply-product-details.mjs             # ghi vao products.ts o may
//   node scripts/apply-product-details.mjs --push      # ghi + commit + push
//
// Mac dinh CHI dien cho san pham CHUA CO longDescription (khong ghi de
// noi dung da co san, vd da tao bang AI truoc do). Dung --force de ghi
// de tat ca.
//
// LUU Y: field longDescription phai da co trong "type Product" (trong
// src/data/products.ts) va duoc hien o trang san pham - neu chua co,
// xem lai phan huong dan da lam truoc do (them field vao type + hien
// o src/app/product/[slug]/page.tsx).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-details2");
const INPUT_JSONL = path.join(ROOT, "scripts/_details_state/product_details.jsonl");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const PUSH = args.includes("--push");
const FORCE = args.includes("--force");

function git(gitArgs) {
  try {
    const out = execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (out.trim()) console.log(out.trim());
  } catch (e) {
    console.error(`\nLenh "git ${gitArgs.join(" ")}" bi loi:\n${(e.stdout ?? "") + (e.stderr ?? "")}`.trim());
    process.exit(1);
  }
}

function loadDetails() {
  if (!fs.existsSync(INPUT_JSONL)) {
    console.error(`Khong tim thay ${INPUT_JSONL}`);
    console.error("Chay download_product_details.py truoc de tao file nay.");
    process.exit(1);
  }
  const map = new Map(); // sku viet thuong -> { detail, name, url }
  const lines = fs.readFileSync(INPUT_JSONL, "utf8").split("\n").filter(Boolean);
  let withDetail = 0;
  let withoutDetail = 0;
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!obj.code) continue;
    if (!obj.detail) {
      withoutDetail++;
      continue;
    }
    withDetail++;
    map.set(String(obj.code).toLowerCase(), obj);
  }
  console.log(`Doc duoc ${lines.length} dong: ${withDetail} co noi dung "Chi tiet", ${withoutDetail} khong tim thay.`);
  return map;
}

function splitProductBlocks(source) {
  const blocks = [];
  const regex = /  \{\n(?:.*\n)*?  \},\n/g;
  let m;
  while ((m = regex.exec(source)) !== null) blocks.push({ text: m[0], start: m.index, end: regex.lastIndex });
  return blocks;
}

function extractField(blockText, field) {
  const m = blockText.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1] : null;
}

function hasLongDescription(blockText) {
  return /longDescription:\s*`/.test(blockText);
}

function setLongDescriptionField(blockText, content) {
  const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const literal = `longDescription: \`${escaped}\``;
  if (/longDescription:\s*`(?:[^`\\]|\\.)*`/.test(blockText)) {
    return blockText.replace(/longDescription:\s*`(?:[^`\\]|\\.)*`/, literal);
  }
  return blockText.replace(/\n(  \},\n)$/, `\n    ${literal},\n$1`);
}

function main() {
  const details = loadDetails();

  const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const crlf = raw.includes("\r\n");
  let source = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  const blocks = splitProductBlocks(source);

  const applied = [];
  const noMatch = [];

  for (const b of blocks) {
    const sku = extractField(b.text, "sku");
    if (!sku) continue;
    const entry = details.get(sku.toLowerCase());
    if (!entry) continue;

    if (!FORCE && hasLongDescription(b.text)) continue;

    const newText = setLongDescriptionField(b.text, entry.detail);
    if (newText === b.text) continue;
    applied.push({ sku, block: b, newText });
  }

  // SKU co trong file JSONL nhung KHONG khop voi san pham nao trong products.ts
  const skusInFile = new Set(blocks.map((b) => (extractField(b.text, "sku") || "").toLowerCase()).filter(Boolean));
  for (const [code] of details) {
    if (!skusInFile.has(code)) noMatch.push(code);
  }

  console.log(`\n${DRY ? "[XEM TRUOC - CHUA GHI GI] " : ""}Se dien longDescription cho: ${applied.length} san pham`);
  applied.slice(0, 20).forEach((a) => console.log(`  ${a.sku}: ${a.newText.match(/longDescription:\s*`([^`]*)/)?.[1]?.length ?? "?"} ky tu`));
  if (applied.length > 20) console.log(`  ... va ${applied.length - 20} san pham khac`);

  if (noMatch.length) {
    console.log(`\nCo ${noMatch.length} ma (tu vipsextoy.net) KHONG khop voi sku nao trong products.ts:`);
    console.log(`  ${noMatch.slice(0, 30).join(", ")}${noMatch.length > 30 ? " ..." : ""}`);
    console.log("  -> co the khac quy uoc dat SKU, kiem tra thu cong neu can.");
  }

  if (DRY) return;
  if (!applied.length) {
    console.log("\nKhong co gi de ghi.");
    return;
  }

  let out = source;
  for (const a of [...applied].sort((x, y) => y.block.start - x.block.start)) {
    out = out.slice(0, a.block.start) + a.newText + out.slice(a.block.end);
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`\nDa sao luu ban truoc khi sua: ${BACKUP_PATH}`);
  }
  fs.writeFileSync(PRODUCTS_PATH, crlf ? out.replace(/\n/g, "\r\n") : out, "utf8");
  console.log(`Da dien ${applied.length} san pham trong src/data/products.ts`);

  if (!PUSH) {
    console.log("\nChua day len GitHub. Chay:");
    console.log("  git add src/data/products.ts");
    console.log('  git commit -m "dien mo ta chi tiet tu vipsextoy.net"');
    console.log("  git pull --rebase --autostash");
    console.log("  git push");
    return;
  }

  console.log("\nDang commit + push...");
  git(["add", "src/data/products.ts"]);
  git(["commit", "-m", `dien mo ta chi tiet tu vipsextoy.net (${applied.length} san pham)`]);
  git(["pull", "--rebase", "--autostash"]);
  git(["push"]);
  console.log("\nXong. Vao Vercel > Deployments, doi ban moi bao Ready (1-2 phut) roi Ctrl+F5.");
}

main();
