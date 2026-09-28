import sharp from "sharp";

for (const n of [1, 2, 3]) {
  await sharp(`public/banners/banner-${n}.png`)
    .resize({ width: 1600 })          // 2x của 648px, đủ nét cho retina
    .webp({ quality: 78 })
    .toFile(`public/banners/banner-${n}.webp`);
  console.log(`banner-${n}.webp xong`);
}