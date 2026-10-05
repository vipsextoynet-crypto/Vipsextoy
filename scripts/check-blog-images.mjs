// scripts/check-blog-images.mjs
//
// Kiem tra MOI anh trong cac bai blog (src/data/blog.ts): anh trong noi dung bai
// (<img src="...">) va anh dai dien (image: "..."), roi cho biet vi sao anh bi
// vo (hien chu thay vi hinh) va tu sua nhung loi an toan:
//
//   1. File khong ton tai o dung duong dan        -> bao + goi y file that
//   2. Sai HOA/THUONG (Windows bo qua, Vercel/Linux thi KHONG): Anh01.WEBP vs anh01.webp
//   3. Sai duoi file: ".web" -> ".webp", ".jpg" <-> ".jpeg" ...
//   4. File CO tren may nhung CHUA co tren GitHub (chua git add / bi .gitignore chan)
//      -> day la nguyen nhan hay gap nhat khi anh hien tren may nhung vo tren web
//   5. File that ten duoi ".web" (khong phai duoi anh chuan) -> co the doi thanh ".webp"
//
// CACH DUNG (trong G:\vipextoy)
//   git pull --rebase --autostash                 # lay blog.ts moi nhat tu admin truoc
//   node scripts/check-blog-images.mjs            # chi BAO CAO, khong sua gi
//   node scripts/check-blog-images.mjs --fix      # tu sua cac loi 2, 3, 5 (sua blog.ts, doi ten file .web -> .webp)
//
// Loi 4 khong tu sua duoc: cuoi bao cao co san cac lenh "git add -f ..." de ban chay.
// Ban sao blog.ts truoc khi sua duoc luu o thu muc tam cua may (duong dan in ra).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG = path.join(ROOT, "src/data/blog.ts");
const PUBLIC = path.join(ROOT, "public");
const FIX = process.argv.includes("--fix");

const GOOD_EXT = new Set(["jpg", "jpeg", "jpe", "jfif", "png", "apng", "webp", "gif", "avif", "bmp", "svg"]);
const ALT_EXT = ["webp", "jpg", "jpeg", "png", "gif", "avif"];
const SKIP_SCAN_DIRS = new Set(["anh1", "anh", "thumbs", "_next"]); // thu muc san pham rat lon, khong chua anh blog

// ---------- doc blog.ts ----------
const raw = fs.readFileSync(BLOG, "utf8");

const slugMarks = [...raw.matchAll(/\bslug:\s*["'`]([^"'`]+)["'`]/g)].map((m) => ({ pos: m.index, slug: m[1] }));
const slugAt = (pos) => {
  let cur = "(khong ro bai)";
  for (const s of slugMarks) {
    if (s.pos <= pos) cur = s.slug;
    else break;
  }
  return cur;
};

const refs = [];
for (const m of raw.matchAll(/\bsrc=\\?["']([^"'\\<>\s][^"'\\<>]*)\\?["']/g)) {
  refs.push({ path: m[1], pos: m.index, kind: "anh trong bai" });
}
for (const m of raw.matchAll(/\bimage:\s*(["'`])([^"'`\n]+)\1/g)) {
  refs.push({ path: m[2], pos: m.index, kind: "anh dai dien" });
}
const local = refs
  .filter((r) => r.path.startsWith("/") && !r.path.startsWith("//") && !/^https?:/i.test(r.path))
  .map((r) => ({ ...r, slug: slugAt(r.pos), rel: safeDecode(r.path.replace(/^\/+/, "").split(/[?#]/)[0]) }));

function safeDecode(p) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

console.log(`blog.ts: ${(raw.length / 1024).toFixed(0)} KB | ${slugMarks.length} bai | ${refs.length} tham chieu anh (${local.length} anh noi bo)\n`);

// ---------- kiem tra ton tai CHINH XAC (phan biet hoa/thuong) ----------
function exactPath(rel) {
  let cur = PUBLIC;
  for (const seg of rel.split("/").filter(Boolean)) {
    let names;
    try {
      names = fs.readdirSync(cur);
    } catch {
      return null;
    }
    if (!names.includes(seg)) return null;
    cur = path.join(cur, seg);
  }
  return cur;
}
const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

// chi muc ten file (khong dau duoi, chu thuong) -> cac duong dan, de goi y khi sai thu muc
let nameIndex = null;
function buildNameIndex() {
  nameIndex = new Map();
  const walk = (dir, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!rel && SKIP_SCAN_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
      } else if (/\.[A-Za-z0-9]+$/.test(e.name)) {
        const key = e.name.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase();
        const list = nameIndex.get(key) || [];
        list.push(rel ? `${rel}/${e.name}` : e.name);
        nameIndex.set(key, list);
      }
    }
  };
  walk(PUBLIC, "");
}

// Tim file that co the la file dang bi tham chieu sai.
function suggest(rel) {
  const segs = rel.split("/").filter(Boolean);
  const file = segs.pop() || "";
  // 1) sua hoa/thuong tung cap thu muc, roi thu cac duoi khac
  let cur = PUBLIC;
  let fixedDir = [];
  let dirOk = true;
  for (const seg of segs) {
    let names = [];
    try {
      names = fs.readdirSync(cur);
    } catch {
      dirOk = false;
      break;
    }
    const hit = names.find((n) => n === seg) || names.find((n) => n.toLowerCase() === seg.toLowerCase());
    if (!hit) {
      dirOk = false;
      break;
    }
    fixedDir.push(hit);
    cur = path.join(cur, hit);
  }
  const out = new Set();
  if (dirOk) {
    const names = fs.readdirSync(cur);
    const base = file.replace(/\.[A-Za-z0-9]+$/, "");
    const ext = (file.match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase() || "";
    const exts = [ext, ...ALT_EXT].filter(Boolean);
    for (const e of exts) {
      const want = `${base}.${e}`.toLowerCase();
      const hit = names.find((n) => n.toLowerCase() === want);
      if (hit) out.add([...fixedDir, hit].join("/"));
    }
  }
  if (out.size) return [...out];
  // 2) sai ca thu muc: tim theo ten file tren toan bo public/ (tru anh san pham)
  if (!nameIndex) buildNameIndex();
  const key = file.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase();
  return (nameIndex.get(key) || []).slice(0, 5);
}

// ---------- git: file nao da len GitHub ----------
const trackedDirs = new Map();
function isTracked(relFile) {
  const top = relFile.split("/").slice(0, 2).join("/"); // vd anhblog/ten-thu-muc
  const key = `public/${top}`;
  if (!trackedDirs.has(key)) {
    let set = new Set();
    try {
      const out = execFileSync("git", ["ls-files", "-z", "--", key], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
      set = new Set(out.split("\0").filter(Boolean));
    } catch {
      set = null; // khong chay duoc git
    }
    trackedDirs.set(key, set);
  }
  const set = trackedDirs.get(key);
  return set === null ? null : set.has(`public/${relFile}`);
}
function isIgnored(relFile) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", `public/${relFile}`], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ---------- phan loai ----------
const results = [];
const seen = new Set();
for (const r of local) {
  const id = `${r.slug}|${r.rel}`;
  if (seen.has(id)) continue;
  seen.add(id);

  const ext = (r.rel.match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase() || "";
  const exact = exactPath(r.rel);

  if (exact && isFile(exact)) {
    if (ext === "web" || (ext && !GOOD_EXT.has(ext))) {
      results.push({ ...r, status: "DUOI-LA", note: `file that ton tai nhung duoi ".${ext}" khong phai duoi anh chuan`, to: r.rel.replace(/\.[A-Za-z0-9]+$/, ".webp") });
    } else {
      const tracked = isTracked(r.rel);
      if (tracked === false) {
        results.push({ ...r, status: "CHUA-LEN-GITHUB", note: isIgnored(r.rel) ? "co tren may nhung bi .gitignore chan (can git add -f)" : "co tren may nhung chua git add" });
      } else results.push({ ...r, status: "OK" });
    }
    continue;
  }
  if (!ext) {
    // Thu muc (anh dai dien dang /anhblog/ten-thu-muc): can co it nhat 1 anh ben trong.
    if (exact && fs.statSync(exact).isDirectory()) {
      const has = fs.readdirSync(exact).some((n) => GOOD_EXT.has((n.split(".").pop() || "").toLowerCase()));
      results.push({ ...r, status: has ? "OK" : "LOI", note: has ? "" : "thu muc rong (khong co anh)" });
      continue;
    }
  }
  const cand = suggest(r.rel);
  if (cand.length === 1) results.push({ ...r, status: "SUA-DUOC", to: cand[0], note: "file that: /" + cand[0] });
  else results.push({ ...r, status: "LOI", note: cand.length ? "co the la: " + cand.map((c) => "/" + c).join(" | ") : "khong tim thay file nao tren may" });
}

// ---------- bao cao ----------
const bad = results.filter((r) => r.status !== "OK");
const label = {
  LOI: "VO ANH",
  "SUA-DUOC": "SAI TEN/HOA-THUONG/DUOI (tu sua duoc)",
  "DUOI-LA": "DUOI KHONG PHAI ANH CHUAN",
  "CHUA-LEN-GITHUB": "CHUA LEN GITHUB",
};
console.log(`Ket qua: ${results.length - bad.length} anh OK, ${bad.length} anh co van de.\n`);
const bySlug = new Map();
for (const r of bad) {
  if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
  bySlug.get(r.slug).push(r);
}
for (const [slug, list] of bySlug) {
  console.log(`BAI: ${slug}`);
  for (const r of list) console.log(`  [${label[r.status]}] ${r.path}\n      -> ${r.note}`);
  console.log();
}

// ---------- sua ----------
if (FIX) {
  const fixes = bad.filter((r) => r.status === "SUA-DUOC" || r.status === "DUOI-LA");
  if (!fixes.length) {
    console.log("--fix: khong co loi nao tu sua duoc.");
  } else {
    let text = raw;
    const backup = path.join(os.tmpdir(), `blog.ts.backup-images-${Date.now()}`);
    fs.writeFileSync(backup, raw, "utf8");
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const f of fixes) {
      let newRel = f.to;
      if (f.status === "DUOI-LA") {
        // doi ten file that .web -> .webp (neu chua co file .webp trung ten)
        const from = exactPath(f.rel);
        const dest = from.replace(/\.[A-Za-z0-9]+$/, ".webp");
        if (fs.existsSync(dest)) {
          console.log(`  Bo qua ${f.rel}: da co san ${path.basename(dest)}, hay xu ly tay.`);
          continue;
        }
        fs.renameSync(from, dest);
        console.log(`  Da doi ten file: ${path.basename(from)} -> ${path.basename(dest)}`);
      }
      const oldPath = f.path;
      const newPath = "/" + newRel;
      const re = new RegExp(`(?<=["'])${esc(oldPath)}(?=\\\\?["'?#])`, "g");
      const before = text;
      text = text.replace(re, () => newPath);
      console.log(`  ${before === text ? "KHONG tim thay" : "Da sua"} trong blog.ts: ${oldPath} -> ${newPath}`);
    }
    if (text !== raw) {
      fs.writeFileSync(BLOG + ".tmp", text, "utf8");
      fs.renameSync(BLOG + ".tmp", BLOG);
      console.log(`\nDa ghi blog.ts. Ban sao truoc khi sua: ${backup}`);
    }
  }
} else if (bad.some((r) => r.status === "SUA-DUOC" || r.status === "DUOI-LA")) {
  console.log("Chay lai voi --fix de tu sua cac loi 'tu sua duoc' (se co ban sao luu).\n");
}

// ---------- lenh git add ----------
const dirs = new Set();
for (const r of results) {
  if (r.status === "CHUA-LEN-GITHUB" || r.status === "OK") {
    if (r.status === "CHUA-LEN-GITHUB") dirs.add(path.posix.dirname(`public/${r.rel}`));
  }
}
if (FIX) {
  for (const f of bad.filter((r) => r.status === "SUA-DUOC" || r.status === "DUOI-LA")) {
    const rel = f.to.replace(/^\//, "");
    dirs.add(path.posix.dirname(`public/${rel}`));
  }
}
if (dirs.size) {
  console.log("\nDe dua anh len GitHub (anh bi .gitignore chan van them duoc nho -f), chay:");
  for (const d of dirs) console.log(`  git add -f "${d}"`);
  console.log('  git add -A\n  git commit -m "Sua anh bai blog"\n  git pull --rebase origin main\n  git push');
}
if (!bad.length) console.log("Tat ca anh trong blog deu OK tren may va da len GitHub.");
