import { categories, groupCategories, getProductsByCategory } from "@/data/products";

// Nhóm cha (vd "Sextoy cho nam") chỉ là chuỗi trong groupCategories, chưa có
// slug riêng. Hàm này tạo slug ổn định từ tên nhóm để dùng cho URL /nhom/<slug>.
export function slugifyGroup(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getGroups() {
  return groupCategories(categories).map(({ group, items }) => ({
    name: group,
    slug: slugifyGroup(group),
    items,
  }));
}

export function getGroup(slug: string) {
  return getGroups().find((g) => g.slug === slug);
}

// Toàn bộ sản phẩm của các danh mục con trong 1 nhóm cha (bỏ trùng).
export function getProductsByGroup(items: { slug: string }[]) {
  const seen = new Set<string>();
  const result: ReturnType<typeof getProductsByCategory> = [];
  for (const c of items) {
    for (const p of getProductsByCategory(c.slug)) {
      if (seen.has(p.slug)) continue;
      seen.add(p.slug);
      result.push(p);
    }
  }
  return result;
}
