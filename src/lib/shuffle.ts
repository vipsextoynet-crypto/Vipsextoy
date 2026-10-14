// Xao tron on dinh: cung 1 "hat giong" (seed) => luon ra cung 1 thu tu.
// Dung de doi san pham trang chu moi ngay nhung trong cung ngay moi nguoi (va Googlebot)
// deu thay giong nhau.
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hat giong theo NGAY (gio Viet Nam, UTC+7) => doi san pham moi ngay.
export function todaySeed(): number {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return vn.getUTCFullYear() * 10000 + (vn.getUTCMonth() + 1) * 100 + vn.getUTCDate();
}

// Bam chuoi thanh so, de moi danh muc co thu tu xao khac nhau.
export function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
