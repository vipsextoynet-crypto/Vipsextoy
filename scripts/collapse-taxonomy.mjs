// scripts/collapse-taxonomy.mjs
//
// Chay SAU apply_categories.py. Doc lai src/data/products.updated.ts (co
// san field "breadcrumb" thuc te tu web cu), quy TOAN BO tag ve dung 26
// danh muc co dinh (khong bao gio phat sinh danh muc moi - tag thuong
// hieu / tag nhom chung deu bi loai), ap lai luat gia >2 trieu cho
// "Do Choi Nam/Nu", va GHI DE lai toan bo mang `categories` ve dung 26
// muc chuan (bo qua bat ky gi apply_categories.py da tu them vao).
//
// CACH DUNG
//   node scripts/collapse-taxonomy.mjs --dry-run
//   node scripts/collapse-taxonomy.mjs
//
// Doc: src/data/products.updated.ts   (KHONG doc/ghi products.ts truc tiep)
// Ghi: src/data/products.ts           (chi khi khong co --dry-run)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_PATH = path.join(ROOT, "src/data/products.updated.ts");
const OUT_PATH = path.join(ROOT, "src/data/products.ts");
const isDry = process.argv.includes("--dry-run");
const PRICE_THRESHOLD = 2_000_000;

// ---------- 26 danh muc CO DINH (dung nguyen, khong doi) ----------
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

// slug THAT tren web cu -> KEY trong SUB. Bat ky slug nao KHONG co trong
// bang nay (nhom chung, thuong hieu: svakom-my, tenga-japan, we-vibe-
// canada, do-cosplay...) deu bi LOAI, khong bao gio thanh danh muc rieng.
const HREF_MAP = {
  "am-dao-gia": "AM_DAO_GIA",
  "am-dao-silicon-tran": "AM_DAO_SILICON_TRAN",
  "may-thu-dam-tu-dong": "MAY_THU_DAM",
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
  "tang-cuong-sinh-ly": "CUONG_DUONG",
  "nuoc-hoa": "NUOC_HOA",
  "gel-boi-tron-am-dao": "GEL_AM_DAO",
  "gel-tang-cam-khoai": "GEL_TANG_CAM_KHOAI",
  "gel-se-khit-am-dao": "GEL_SE_KHIT",
  "dau-mat-xa": "DAU_MAT_XA",
  "gel-boi-tron-hau-mon": "GEL_HAU_MON",
  "bcs-gai-bi": "BCS_GAI_BI",
  "bao-don-den": "BAO_DON_DEN",
  "bup-be-silicon-nhat": "BUP_BE",
  // Duoi day la cac slug THAT su xuat hien trong bao cao cua ban nhung
  // KHONG duoc coi la danh muc (nhom chung hoac thuong hieu) - liet ke
  // ro rang de sau nay de doi chieu, gia tri null = loai bo:
  "sextoy-cho-nam": null, "sextoy-cho-nu": null, "sextoy-cao-cap": null,
  "san-pham-cho-nam": null, "san-pham-cho-nu": null, "sextoy-cho-lgbt": null,
  "bao-cao-su": null, "gel-boi-tron": null, "may-massage": null, "trung-rung": null,
  "do-cosplay": null, "svakom-my": null, "tenga-japan": null, "fleshlight-usa": null,
  "lelo-thuy-dien": null, "we-vibe-canada": null, "nalone-japan": null,
  "docjohnson-usa": null, "easylove-japan": null, "bale-hongkong": null,
  "picobong-thuy-dien": null, "louge-anh": null, "pretty-love": null,
  "lovingworld": null, "fun-germany": null, "trojan-usa": null, "funzone-usa": null,
};

function has(name, ...kws) {
  return kws.some((k) => name.includes(k));
}

// Bo tu khoa du phong - dung khi 1 san pham khong co the nao trong
// breadcrumb khop voi HREF_MAP (vd chi co tag thuong hieu, hoac khong co
// breadcrumb luon).
function classifyByKeyword(name) {
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
  if (has(n, "búp bê") || has(n, "bán thân")) return "BUP_BE";
  if (has(n, "máy thủ dâm") || has(n, "cốc thủ dâm tự động") || (has(n, "âm đạo") && has(n, "tự động") && (has(n, "rung") || has(n, "thụt"))))
    return "MAY_THU_DAM";
  if (has(n, "âm đạo silicon trần") || has(n, "âm đạo trần")) return "AM_DAO_SILICON_TRAN";
  if (has(n, "âm đạo giả") || has(n, "cốc thủ dâm") || has(n, "âm đạo")) return "AM_DAO_GIA";
  if (has(n, "máy tập dương vật") || has(n, "tăng kích thước dương vật") || has(n, "tập to dương vật") || has(n, "dụng cụ tập"))
    return "MAY_TAP_DUONG_VAT";
  if (has(n, "hậu môn")) return "DO_CHOI_HAU_MON";
  if (has(n, "lưỡi liếm") || has(n, "máy liếm") || has(n, "rung lưỡi")) return "LUOI_LIEM";
  if (has(n, "trứng") || has(n, "hình thỏi son") || has(n, "hình trái đào") || (has(n, "mini") && has(n, "rung")))
    return "TRUNG_RUNG";
  if (has(n, "điểm g") || has(n, "dương vật")) return "DUONG_VAT_GIA";
  if (has(n, "chày rung") || has(n, "massage") || has(n, "mát xa") || has(n, "máy rung")) return "MASSAGE";
  return "KHAC";
}

function applyPriceOverride(key, name, price) {
  if (!price || price <= PRICE_THRESHOLD) return key;
  if (key === "KHAC" || key === "BUP_BE" || key === "NUOC_HOA") return key;
  const n = name.toLowerCase();
  let gender = GENDER_OF[key];
  if (!gender) gender = has(n, "cho nam", "nam giới") ? "nam" : "nu";
  return gender === "nam" ? "CAO_CAP_NAM" : "CAO_CAP_NU";
}

// Doc field breadcrumb: [[{"name":..,"slug":..}, ...], [...], ...] tu 1
// block san pham (van con dang JSON-trong-JS, parse bang JSON.parse sau
// khi cat dung doan).
function extractBreadcrumbTags(blockText) {
  const m = blockText.match(/breadcrumb:\s*(\[\[.*?\]\]),\n/s);
  if (!m) return [];
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const tags = [];
  for (const level of data) {
    for (const item of level) {
      if (item && item.slug) tags.push(item.slug);
    }
  }
  return tags;
}

function resolveKeys(hrefs) {
  const keys = [];
  for (const href of hrefs) {
    const key = HREF_MAP[href];
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

// ---------- Doc file, tach block san pham ----------
const source = fs.readFileSync(SRC_PATH, "utf8");
const productsStart = source.indexOf("export const products");
const slugMatches = [...source.slice(productsStart).matchAll(/  \{\n    slug: "([^"]+)"/g)]
  .map((m) => ({ ...m, index: m.index + productsStart }));
const blocks = slugMatches.map((m, i) => {
  const start = m.index;
  const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : source.length;
  return { start, end, text: source.slice(start, end) };
});

const stats = {};
const extraStats = {};
let fromBreadcrumb = 0;
let fromKeyword = 0;
let newProductsSource = source.slice(productsStart);
let offsetShift = 0;

for (const block of blocks) {
  const nameMatch = block.text.match(/name:\s*"((?:[^"\\]|\\.)*)"/);
  const priceMatch = block.text.match(/price:\s*(\d+)/);
  if (!nameMatch) continue;

  const name = nameMatch[1].replace(/\\"/g, '"');
  const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

  const hrefs = extractBreadcrumbTags(block.text);
  const keys = resolveKeys(hrefs);

  let primaryKey, extraKeys;
  if (keys.length > 0) {
    primaryKey = keys[0];
    extraKeys = keys.slice(1);
    fromBreadcrumb++;
  } else {
    primaryKey = classifyByKeyword(name);
    extraKeys = [];
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
    .replace(/category:\s*"(?:[^"\\]|\\.)*"/, `category: "${target.name}"`)
    // bo field breadcrumb - chi la du lieu lam viec, khong dung o UI
    .replace(/\n\s*breadcrumb:\s*\[\[.*?\]\],/s, "");

  if (extraSlugs.length > 0) {
    const extraLiteral = `extraCategorySlugs: [${extraSlugs.map((s) => `"${s}"`).join(", ")}]`;
    if (/extraCategorySlugs:\s*\[[^\]]*\]/.test(newBlockText)) {
      newBlockText = newBlockText.replace(/extraCategorySlugs:\s*\[[^\]]*\]/, extraLiteral);
    } else {
      newBlockText = newBlockText.replace(/(categorySlug:\s*"[^"]+",\n)/, `$1    ${extraLiteral},\n`);
    }
  } else {
    // khong con danh muc phu -> bo field cu neu co, tranh sot rac
    newBlockText = newBlockText.replace(/\n\s*extraCategorySlugs:\s*\[[^\]]*\],/, "");
  }

  const relStart = block.start - productsStart + offsetShift;
  const relEnd = block.end - productsStart + offsetShift;
  newProductsSource = newProductsSource.slice(0, relStart) + newBlockText + newProductsSource.slice(relEnd);
  offsetShift += newBlockText.length - block.text.length;
}

// ---------- Xay lai TOAN BO mang categories (dung 26 muc, khong hon) ----------
const seenGroups = new Set();
const catLines = [];
for (const sub of Object.values(SUB)) {
  catLines.push(
    `  {\n    slug: "${sub.slug}",\n    name: "${sub.name}",\n` +
      (sub.group ? `    group: "${sub.group}",\n` : "") +
      `    shortDescription: "Bộ sưu tập ${sub.name.toLowerCase()} chính hãng tại Vipsextoy.",\n` +
      `    seoDescription: "${sub.name} tại Vipsextoy — chất liệu an toàn, giao hàng kín đáo toàn quốc, chỉ dành cho khách hàng từ 18 tuổi trở lên.",\n  },`
  );
}
const newCategoriesBlock =
  "export const categories: Category[] = [\n" + catLines.join("\n") + "\n];";

const header = source.slice(0, productsStart);
const newHeader = header.replace(
  /export const categories: Category\[\] = \[[\s\S]*?\n\];/,
  newCategoriesBlock
);

const finalSource = newHeader + newProductsSource;

// ---------- Bao cao ----------
console.log(`Tong san pham: ${blocks.length}`);
console.log(`  - Khop qua breadcrumb (da loai brand/nhom chung): ${fromBreadcrumb}`);
console.log(`  - Fallback tu khoa (khong co breadcrumb khop): ${fromKeyword}\n`);
console.log("=== SO LUONG THEO 26 DANH MUC CO DINH (+phu) ===");
for (const [key, sub] of Object.entries(SUB)) {
  const extra = extraStats[key] || 0;
  const note = extra > 0 ? `  (+${extra} tu danh muc khac)` : "";
  console.log(`${(stats[key] || 0).toString().padStart(4)}  ${sub.group ? `[${sub.group}] ` : ""}${sub.name}  (${sub.slug})${note}`);
}
console.log(`\nSo danh muc trong mang categories: ${Object.keys(SUB).length} (co dinh, khong the phat sinh them)`);

if (!isDry) {
  if (fs.existsSync(OUT_PATH)) {
    fs.copyFileSync(OUT_PATH, OUT_PATH + ".backup-collapse-" + Date.now());
  }
  fs.writeFileSync(OUT_PATH, finalSource, "utf8");
  console.log(`\nDa ghi ${OUT_PATH}`);
} else {
  console.log("\n[--dry-run] Chua ghi gi.");
}
