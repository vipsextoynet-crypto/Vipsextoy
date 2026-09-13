import fs from "fs";
import path from "path";

export type OrderItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  icon?: string;
};

export type Order = {
  orderId: string;
  createdAt: string;
  items: OrderItem[];
  customer: { name: string; phone: string; address: string; note?: string };
  payment: "cod" | "bank" | string;
  total: number;
};

// NOTE: lưu bằng file JSON — đơn giản, không cần database, phù hợp chạy
// trên 1 server Node cố định (VPS, hosting riêng). Nếu sau này deploy lên
// nền tảng serverless (Vercel...) thì ổ đĩa không được giữ lại lâu dài,
// lúc đó nên đổi sang một database thật (Postgres/SQLite/Supabase...).
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "orders.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf-8");
}

export function getOrders(): Order[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export function addOrder(order: Order) {
  ensureFile();
  const orders = getOrders();
  orders.unshift(order); // đơn mới nhất lên đầu
  fs.writeFileSync(FILE, JSON.stringify(orders, null, 2), "utf-8");
}
