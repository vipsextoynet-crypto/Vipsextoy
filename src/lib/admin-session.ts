// Quan ly session dang nhap admin bang token ky HMAC (khong can database
// rieng cho session). Dung Web Crypto (globalThis.crypto.subtle) de chay
// duoc ca tren Edge middleware va Node route handler.

const COOKIE_NAME = "vipextoy_admin_session";
const SESSION_HOURS = 12;

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "vipextoy-doi-secret-nay-trong-env";
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ exp })));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = await hmac(payload);
  if (expectedSig !== sig) return false;

  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return typeof data.exp === "number" && Date.now() < data.exp;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
