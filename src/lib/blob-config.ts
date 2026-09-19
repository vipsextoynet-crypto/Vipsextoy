// Vercel doi mac dinh cach ket noi Blob: ban moi (2026) dung OIDC tu dong
// xoay vong (bien VERCEL_OIDC_TOKEN + BLOB_STORE_ID), KHONG con luon tao san
// BLOB_READ_WRITE_TOKEN nhu truoc nua (bien do gio la tuy chon "fallback").
// Ham nay kiem tra ca 2 kieu de khong bao nham "chua bat Blob" khi thuc ra
// da noi dung, chi la theo co che moi.
export function hasVercelBlob(): boolean {
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}
