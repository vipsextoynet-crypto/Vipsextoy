// "/thumbs/anh1/X/01.webp" -> "/thumbs/sm/anh1/X/01.webp" (ban 260px do
// scripts/make-thumbs.mjs tao). Chi ap dung cho anh thumbnail noi bo.
export function smallThumb(thumb?: string) {
  if (!thumb || !thumb.startsWith("/thumbs/")) return undefined;
  return thumb.replace(/^\/thumbs\//, "/thumbs/sm/");
}
