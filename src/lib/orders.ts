import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import { getBlobAuthOptions } from "@/lib/blob-config";

export type OrderItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  icon?: string;
  image?: string;
};

export type Order = {
  orderId: string;
  createdAt: string;
  items: OrderItem[];
  customer: { name: string; phone: string; address: string; note?: string };
  payment: "cod" | "bank" | string;
  total: number;
};

const BLOB_PATH = "orders.json";

// Tren Vercel, o dia serverless chi doc/tam thoi -> khong the dung de luu don
// hang lau dai. Dung Vercel Blob (kho luu tru cua chinh Vercel) de luu that,
// khong bi mat, khong gay build lai (khac voi cach commit len GitHub).
//
// CACH BAT: vao Vercel -> project -> tab Storage -> Create Database -> chon
// Blob -> Connect vao project nay. Vercel se tu them bien BLOB_READ_WRITE_TOKEN
// vao Environment Variables, khong can lam gi them. Deploy lai 1 lan la xong.
//
// Khi chay local (npm run dev) va chua co BLOB_READ_WRITE_TOKEN, tu dong
// dung file data/orders.json nhu cu de tien test, khong anh huong gi.

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "orders.json");

function hasBlob(): boolean {
  return getBlobAuthOptions() !== null;
}

// ---------- Fallback file (chi dung khi chay local, khong co Blob) ----------

function ensureLocalFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf-8");
  } catch {
    // Vercel: o dia chi doc ngoai /tmp -> bo qua, khong crash trang.
  }
}

function getOrdersLocal(): Order[] {
  ensureLocalFile();
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

function addOrderLocal(order: Order) {
  ensureLocalFile();
  const orders = getOrdersLocal();
  orders.unshift(order);
  fs.writeFileSync(FILE, JSON.stringify(orders, null, 2), "utf-8");
}

// ---------- Vercel Blob (dung tren production) ----------

async function getOrdersBlob(): Promise<Order[]> {
  const authOptions = getBlobAuthOptions();
  if (!authOptions) return [];

  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1, ...authOptions });
    const found = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!found) return [];

    const res = await fetch(found.url, { cache: "no-store" });
    if (!res.ok) return [];

    return (await res.json()) as Order[];
  } catch (e) {
    console.error("[orders] Không đọc được từ Vercel Blob:", e);
    return [];
  }
}

async function addOrderBlob(order: Order): Promise<void> {
  const orders = await getOrdersBlob();
  orders.unshift(order);

  const authOptions = getBlobAuthOptions();
  if (!authOptions) throw new Error("Vercel Blob chưa được cấu hình.");

  await put(BLOB_PATH, JSON.stringify(orders, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    ...authOptions,
  });
}

// ---------- API dung o noi khac trong app ----------

export async function getOrders(): Promise<Order[]> {
  if (hasBlob()) return getOrdersBlob();
  return getOrdersLocal();
}

export async function addOrder(order: Order): Promise<void> {
  if (hasBlob()) {
    await addOrderBlob(order);
    return;
  }
  addOrderLocal(order);
}
