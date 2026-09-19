// Vercel cho phep dat "prefix" tuy y khi noi Blob store vao project, nen ten
// bien moi truong thuc te co the la BLOB_READ_WRITE_TOKEN, hoac bi trung
// tien to thanh BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN, hoac ten khac hoan
// toan tuy nguoi cau hinh. Thay vi bat nguoi dung phai sua dung 1 ten cung,
// ham nay TU DONG DO trong toan bo process.env de tim ra:
//  - token tinh (bat ky bien nao ket thuc bang "_READ_WRITE_TOKEN")
//  - storeId (bat ky bien nao ket thuc bang "_STORE_ID")
// Nho vay du ban dat prefix gi luc ket noi Blob tren Vercel, code van chay.

function findEnvValueEndingWith(suffix: string): string | undefined {
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith(suffix) && value) return value;
  }
  return undefined;
}

export function findBlobToken(): string | undefined {
  return findEnvValueEndingWith("_READ_WRITE_TOKEN");
}

export function findBlobStoreId(): string | undefined {
  return findEnvValueEndingWith("_STORE_ID");
}

// Options can truyen vao put()/list() cua @vercel/blob de dam bao dung
// store/token du ten bien la gi. Uu tien token tinh (don gian, chac chan
// hoat dong); neu khong co thi dung storeId + OIDC (VERCEL_OIDC_TOKEN la
// bien he thong cua Vercel, luon co san, khong bi anh huong boi prefix).
export function getBlobAuthOptions(): { token: string } | { storeId: string } | null {
  const token = findBlobToken();
  if (token) return { token };

  const storeId = findBlobStoreId();
  if (storeId && process.env.VERCEL_OIDC_TOKEN) return { storeId };

  return null;
}

export function hasVercelBlob(): boolean {
  return getBlobAuthOptions() !== null;
}
