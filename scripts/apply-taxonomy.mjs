// scripts/apply-taxonomy.mjs
//
// Ban CUOI: gan lai categorySlug (chinh) + extraCategorySlugs (phu) cho
// toan bo san pham trong products.ts, theo thu tu uu tien:
//
//   1) Neu SKU co du lieu THAT trong scripts/source-categories.csv (lay
//      tu chinh vipsextoy.net qua extract-source-categories.mjs) -> dung
//      danh sach tag THAT do (bo qua tag "Sextoy Cao Cap"/"San Pham Cho
//      Nam/Nu" va cac tag ten thuong hieu khong thuoc taxonomy moi).
//   2) SKU khong co du lieu that -> dung bo tu khoa (giu nguyen tu ban
//      truoc, da duoc kiem tra ky).
//   3) Ap dung SAU CUNG: neu gia > 2.000.000d -> de len "Do Choi Nam"
//      hoac "Do Choi Nu" (theo gioi tinh cua danh muc chinh vua chon).
//
// CACH DUNG
//   node scripts/apply-taxonomy.mjs --dry-run
//   node scripts/apply-taxonomy.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_PATH = path.join(ROOT, "src/data/products.ts");
const CSV_PATH = path.join(ROOT, "scripts/source-categories.csv");
const isDry = process.argv.includes("--dry-run");

const PRICE_THRESHOLD = 2_000_000;

// ---------- Danh muc con moi ----------
const SUB = {
  AM_DAO_GIA:          { slug: "am-dao-gia",                       name: "Âm Đạo Giả",                 group: "Sextoy Cho Nam" },
  AM_DAO_SILICON_TRAN: { slug: "am-dao-silicon-tran",               name: "Âm Đạo Silicon Trần",        group: "Sextoy Cho Nam" },
  MAY_THU_DAM:         { slug: "may-thu-dam-tu-dong",               name: "Máy Thủ Dâm Tự Động",        group: "Sextoy Cho Nam" },
  MAY_TAP_DUONG_VAT:   { slug: "may-tap-duong-vat-tang-kich-thuoc", name: "Máy Tập Dương Vật",          group: "Sextoy Cho Nam" },

  DUONG_VAT_GIA:       { slug: "duong-vat-gia-rung",                name: "Dương Vật Giả",              group: "Sextoy Cho Nữ" },
  DO_CHOI_HAU_MON:     { slug: "do-choi-hau-mon",                   name: "Sextoy Hậu Môn",             group: "Sextoy Cho Nữ" },
  BDSM:                { slug: "phu-kien-bdsm",                    name: "Đồ Chơi BDSM",               group: "Sextoy Cho Nữ" },

  LUOI_LIEM:           { slug: "luoi-liem-am-dao",                  name: "Lưỡi Liếm Âm Đạo",           group: "Trứng Rung" },
  TRUNG_RUNG:          { slug: "trung-rung-tinh-yeu",               name: "Trứng Rung Nữ",              group: "Trứng Rung" },

  MASSAGE:             { slug: "may-massage-ca-nhan",               name: "Dụng Cụ Massage, Chày Rung", group: "Máy Massage" },

  CAO_CAP_NAM:         { slug: "do-choi-cao-cap-nam",               name: "Đồ Chơi Nam",                group: "Sextoy Cao Cấp" },
  CAO_CAP_NU:          { slug: "do-choi-cao-cap-nu",                name: "Đồ Chơi Nữ",                 group: "Sextoy Cao Cấp" },

  LGBT_GAY:            { slug: "do-choi-cho-gay",                   name: "Đồ Chơi Cho Gay",            group: "Sextoy Cho LGBT" },
  LGBT_LES:            { slug: "do-choi-cho-less",                  name: "Đồ Chơi Cho Less",           group: "Sextoy Cho LGBT" },

  CHAI_XIT:            { slug: "chai-xit-keo-dai-thoi-gian",        name: "Chai Xịt Lâu Ra",            group: "Tăng Cường Sinh Lý" },
  CUONG_DUONG:         { slug: "cuong-duong",                       name: "Cường Dương",                group: "Tăng Cường Sinh Lý" },

  NUOC_HOA:            { slug: "nuoc-hoa-kich-thich",               name: "Nước Hoa",                    group: null },

  GEL_AM_DAO:          { slug: "gel-boi-tron-am-dao",               name: "Gel Bôi Trơn Âm Đạo",         group: "Gel Bôi Trơn" },
  GEL_TANG_CAM_KHOAI:  { slug: "gel-tang-cam-khoai",                name: "Gel Tăng Cảm Khoái",          group: "Gel Bôi Trơn" },
  GEL_SE_KHIT:         { slug: "gel-se-khit-am-dao",                name: "Gel Se Khít Âm Đạo",          group: "Gel Bôi Trơn" },
  DAU_MAT_XA:          { slug: "dau-mat-xa",                        name: "Dầu Mát Xa",                  group: "Gel Bôi Trơn" },
  GEL_HAU_MON:         { slug: "gel-boi-tron-hau-mon",              name: "Gel Bôi Trơn Hậu Môn",        group: "Gel Bôi Trơn" },

  BCS_GAI_BI:          { slug: "bao-cao-su-chinh-hang",             name: "BCS Gai, Bi",                 group: "Bao Cao Su" },
  BAO_DON_DEN:         { slug: "bao-don-den",                       name: "Bao Đôn Dên",                 group: "Bao Cao Su" },

  BUP_BE:              { slug: "bup-be-silicon-cao-cap",            name: "Búp Bê Silicon",              group: "Búp Bê Silicon" },
  KHAC:                { slug: "chua-phan-loai",                    name: "Sản Phẩm Khác",               group: null },
};

const GENDER_OF = {
  AM_DAO_GIA: "nam", AM_DAO_SILICON_TRAN: "nam", MAY_THU_DAM: "nam", MAY_TAP_DUONG_VAT: "nam",
  CHAI_XIT: "nam", CUONG_DUONG: "nam", LGBT_GAY: "nam", BAO_DON_DEN: "nam",
  DUONG_VAT_GIA: "nu", TRUNG_RUNG: "nu", LUOI_LIEM: "nu", GEL_SE_KHIT: "nu", LGBT_LES: "nu",
};

// href thuc te tren vipsextoy.net -> KEY trong SUB. "null" = bo qua co
// tinh (nhom chung/thuong hieu, khong du cu the de gan).
const HREF_MAP = {
  "am-dao-gia": "AM_DAO_GIA",
  "may-thu-dam-tu-dong": "MAY_THU_DAM",
  "am-dao-silicon-tran": "AM_DAO_SILICON_TRAN",
  "may-tap-duong-vat": "MAY_TAP_DUONG_VAT",
  "duong-vat-gia": "DUONG_VAT_GIA",
  "sextoy-hau-mon": "DO_CHOI_HAU_MON",
  "do-choi-bdsm": "BDSM",
  "trung-rung-nu": "TRUNG_RUNG",
  "luoi-liem-am-dao": "LUOI_LIEM",
  "dung-cu-massage-chay-rung": "MASSAGE",
  "do-choi-cho-gay": "LGBT_GAY",
  "do-choi-cho-less": "LGBT_LES",
  "chai-xit-lau-ra": "CHAI_XIT",
  "nuoc-hoa": "NUOC_HOA",
  "gel-boi-tron-am-dao": "GEL_AM_DAO",
  "gel-tang-cam-khoai": "GEL_TANG_CAM_KHOAI",
  "gel-se-khit-am-dao": "GEL_SE_KHIT",
  "dau-mat-xa": "DAU_MAT_XA",
  "gel-boi-tron-hau-mon": "GEL_HAU_MON",
  "bcs-gai-bi": "BCS_GAI_BI",
  "bao-don-den": "BAO_DON_DEN",
  // Cac tag NHOM CHUNG (khong cu the) - bo qua, tru truong hop dac biet
  // xu ly rieng trong resolveRealTags() ben duoi.
  "sextoy-cho-nam": null, "sextoy-cho-nu": null, "sextoy-cao-cap": null,
  "san-pham-cho-nam": null, "san-pham-cho-nu": null, "sextoy-cho-lgbt": null,
  "may-massage": null, "gel-boi-tron": null, "trung-rung": null,
};

function has(name, ...kws) {
  return kws.some((k) => name.includes(k));
}

// ---------- Bo tu khoa du phong (giong ban truoc, da kiem tra) ----------
function classifyByKeyword(name, currentSlug) {
  const n = name.toLowerCase();
  if (has(n, "nước hoa")) return "NUOC_HOA";
  if (has(n, "cường dương") || has(n, "kamagra")) return "CUONG_DUONG";
  if (has(n, "xịt") && (has(n, "lâu ra") || has(n, "kéo dài thời gian") || has(n, "chống xuất tinh") || has(n, "xuất tinh sớm")))
    return "CHAI_XIT";
  if (has(n, "se khít")) return "GEL_SE_KHIT";
  if (has(n, "dầu mát xa") || has(n, "dầu massage")) return "DAU_MAT_XA";
  if (has(n, "gel") && (has(n, "tăng cảm khoái") || has(n, "kích thích cực khoái") || has(n, "hưng phấn")))
    return "GEL_TANG_CAM_KHOAI";
  if (has(n, "gel") && has(n, "hậu môn")) return "GEL_HAU_MON";
  if (has(n, "gel bôi trơn") || (has(n, "gel") && has(n, "bôi trơn")) || has(n, "chất bôi trơn"))
    return "GEL_AM_DAO";
  if (has(n, "đôn dên") || has(n, "bao đôn")) return "BAO_DON_DEN";
  if (has(n, "bao cao su") || has(n, "bcs ")) return "BCS_GAI_BI";
  if (currentSlug === "do-choi-cho-lgbt") {
    if (has(n, "cho gay") || has(n, "(gay") || has(n, "cho nam")) return "LGBT_GAY";
    if (has(n, "les") || has(n, "cho nữ")) return "LGBT_LES";
    return "LGBT_GAY";
  }
  if (has(n, "máy thủ dâm") || has(n, "cốc thủ dâm tự động") || (has(n, "âm đạo") && has(n, "tự động") && (has(n, "rung") || has(n, "thụt"))))
    return "MAY_THU_DAM";
  if (has(n, "âm đạo silicon trần") || has(n, "âm đạo trần")) return "AM_DAO_SILICON_TRAN";
  if (has(n, "âm đạo giả") || has(n, "cốc thủ dâm") || has(n, "âm đạo")) return "AM_DAO_GIA";
  if (has(n, "máy tập dương vật") || has(n, "tăng kích thước dương vật") || has(n, "tập to dương vật") || has(n, "dụng cụ tập"))
    return "MAY_TAP_DUONG_VAT";
  if (currentSlug === "phu-kien-bdsm") return "BDSM";
  if (has(n, "hậu môn")) return "DO_CHOI_HAU_MON";
  if (has(n, "búp bê") || has(n, "bán thân")) return "BUP_BE";
  if (has(n, "lưỡi liếm") || has(n, "máy liếm") || has(n, "vòng rung lưỡi") || has(n, "rung lưỡi"))
    return "LUOI_LIEM";
  if (has(n, "trứng") || has(n, "hình thỏi son") || has(n, "hình trái đào") || (has(n, "mini") && has(n, "rung")))
    return "TRUNG_RUNG";
  if (has(n, "điểm g")) return "DUONG_VAT_GIA";
  if (has(n, "dương vật")) return "DUONG_VAT_GIA";
  if (has(n, "chày rung") || has(n, "massage") || has(n, "mát xa") || has(n, "máy rung"))
    return "MASSAGE";
  if (currentSlug === "chua-phan-loai") return "KHAC";
  return "KHAC";
}

function extraByKeyword(name, primaryKey) {
  const n = name.toLowerCase();
  const extras = [];
  if (primaryKey !== "AM_DAO_SILICON_TRAN" && has(n, "trần") && (has(n, "âm đạo") || has(n, "cốc thủ dâm")))
    extras.push("AM_DAO_SILICON_TRAN");
  if (primaryKey !== "GEL_TANG_CAM_KHOAI" && has(n, "gel") &&
      (has(n, "tăng khoái cảm") || has(n, "kích thích cực khoái") || has(n, "hưng phấn")))
    extras.push("GEL_TANG_CAM_KHOAI");
  const isDoubleDildo = has(n, "dương vật") && (has(n, "2 đầu") || has(n, "hai đầu"));
  const isHarnessForMen = has(n, "rỗng ruột") || has(n, "cho nam");
  if (primaryKey !== "LGBT_LES" && isDoubleDildo && !isHarnessForMen) extras.push("LGBT_LES");
  return extras;
}

// ---------- Doc du lieu THAT tu source-categories.csv ----------
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^"((?:[^"]|"")*)","((?:[^"]|"")*)","((?:[^"]|"")*)"$/);
    if (!m) continue;
    const unesc = (s) => s.replace(/""/g, '"');
    rows.push({ sku: unesc(m[1]), tags: unesc(m[2]), url: unesc(m[3]) });
  }
  return rows;
}

function resolveRealTags(tagsStr) {
  // tagsStr dang: "Ten[href] | Ten[href] | ..."
  const items = tagsStr.split("|").map((s) => s.trim()).filter(Boolean);
  const hrefs = items.map((it) => {
    const m = it.match(/\[([^\]]+)\]$/);
    return m ? m[1] : null;
  }).filter(Boolean);

  const keys = [];
  for (const href of hrefs) {
    if (!(href in HREF_MAP)) continue; // thuong hieu la, khong thuoc taxonomy
    const key = HREF_MAP[href];
    if (key && !keys.includes(key)) keys.push(key);
  }

  // Xu ly rieng cac tag NHOM CHUNG khi khong co tag cu the nao khac trong
  // cung nhom do (dung nhu vi du SL12: chi co "tang-cuong-sinh-ly" don le).
  if (keys.length === 0) {
    if (hrefs.includes("tang-cuong-sinh-ly")) keys.push("CUONG_DUONG");
    else if (hrefs.includes("bao-cao-su")) keys.push("BCS_GAI_BI");
    else if (hrefs.includes("trung-rung")) keys.push("TRUNG_RUNG");
  }

  return keys; // co the rong -> se fallback ve tu khoa
}

function applyPriceOverride(key, name, price) {
  if (price <= PRICE_THRESHOLD) return key;
  if (key === "KHAC" || key === "BUP_BE" || key === "NUOC_HOA") return key;
  const n = name.toLowerCase();
  let gender = GENDER_OF[key];
  if (!gender) gender = has(n, "cho nam", "nam giới") ? "nam" : "nu";
  return gender === "nam" ? "CAO_CAP_NAM" : "CAO_CAP_NU";
}

// ---------- Main ----------
const csvRows = fs.existsSync(CSV_PATH) ? parseCsv(fs.readFileSync(CSV_PATH, "utf8")) : [];
const realTagsBySku = new Map();
for (const row of csvRows) {
  if (!row.sku) continue;
  realTagsBySku.set(row.sku, resolveRealTags(row.tags));
}
console.log(`Doc duoc ${realTagsBySku.size} SKU co du lieu THAT tu source-categories.csv\n`);

const source = fs.readFileSync(FILE_PATH, "utf8");
const slugMatches = [...source.matchAll(/  \{\n    slug: "([^"]+)"/g)];
const blocks = slugMatches.map((m, i) => {
  const start = m.index;
  const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : source.length;
  return { start, end, text: source.slice(start, end) };
});

const stats = {};
const extraStats = {};
let fromReal = 0;
let fromKeyword = 0;
let newSource = source;
let offsetShift = 0;

for (const block of blocks) {
  const nameMatch = block.text.match(/name:\s*"((?:[^"\\]|\\.)*)"/);
  const priceMatch = block.text.match(/price:\s*(\d+)/);
  const skuMatch = block.text.match(/sku:\s*"([^"]+)"/);
  const curCatSlugMatch = block.text.match(/categorySlug:\s*"([^"]+)"/);
  if (!nameMatch || !priceMatch || !skuMatch || !curCatSlugMatch) continue;

  const name = nameMatch[1].replace(/\\"/g, '"');
  const price = parseInt(priceMatch[1], 10);
  const sku = skuMatch[1];
  const currentSlug = curCatSlugMatch[1];

  let primaryKey, extraKeys;
  const realKeys = realTagsBySku.get(sku);
  if (realKeys && realKeys.length > 0) {
    primaryKey = realKeys[0];
    extraKeys = realKeys.slice(1);
    fromReal++;
  } else {
    primaryKey = classifyByKeyword(name, currentSlug);
    extraKeys = extraByKeyword(name, primaryKey);
    fromKeyword++;
  }

  primaryKey = applyPriceOverride(primaryKey, name, price);
  extraKeys = extraKeys.filter((k) => k !== primaryKey);

  const target = SUB[primaryKey];
  const extraSlugs = [...new Set(extraKeys.map((k) => SUB[k].slug))];

  stats[primaryKey] = (stats[primaryKey] || 0) + 1;
  extraKeys.forEach((k) => { extraStats[k] = (extraStats[k] || 0) + 1; });

  let newBlockText = block.text
    .replace(/categorySlug:\s*"[^"]+"/, `categorySlug: "${target.slug}"`)
    .replace(/category:\s*"(?:[^"\\]|\\.)*"/, `category: "${target.name}"`);

  if (extraSlugs.length > 0) {
    const extraLiteral = `extraCategorySlugs: [${extraSlugs.map((s) => `"${s}"`).join(", ")}]`;
    if (/extraCategorySlugs:\s*\[[^\]]*\]/.test(newBlockText)) {
      newBlockText = newBlockText.replace(/extraCategorySlugs:\s*\[[^\]]*\]/, extraLiteral);
    } else {
      newBlockText = newBlockText.replace(/(categorySlug:\s*"[^"]+",\n)/, `$1    ${extraLiteral},\n`);
    }
  }

  if (newBlockText === block.text) continue;
  if (!isDry) {
    const realStart = block.start + offsetShift;
    const realEnd = block.end + offsetShift;
    newSource = newSource.slice(0, realStart) + newBlockText + newSource.slice(realEnd);
    offsetShift += newBlockText.length - block.text.length;
  }
}

console.log(`Tong san pham: ${blocks.length}`);
console.log(`  - Dung du lieu THAT (site goc): ${fromReal}`);
console.log(`  - Dung tu khoa du phong: ${fromKeyword}\n`);

console.log("=== SO LUONG THEO DANH MUC CHINH (+phu) ===");
for (const [key, sub] of Object.entries(SUB)) {
  const extra = extraStats[key] || 0;
  const note = extra > 0 ? `  (+${extra} tu danh muc khac)` : "";
  console.log(`${(stats[key] || 0).toString().padStart(4)}  ${sub.group ? `[${sub.group}] ` : ""}${sub.name}  (${sub.slug})${note}`);
}

if (!isDry) {
  fs.writeFileSync(FILE_PATH + ".backup-taxonomy-final-" + Date.now(), source, "utf8");
  fs.writeFileSync(FILE_PATH, newSource, "utf8");
  console.log("\nDa ghi that vao " + FILE_PATH);
} else {
  console.log("\n[--dry-run] Chua ghi gi.");
}
