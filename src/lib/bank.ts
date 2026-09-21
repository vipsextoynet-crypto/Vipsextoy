// Thong tin tai khoan nhan tien chuyen khoan - DIEN 3 DONG DUOI DAY roi commit.
//
// bankId  : ma ngan hang theo VietQR (viet thuong), vi du:
//           vcb (Vietcombank), tcb (Techcombank), mbbank (MB), acb, bidv,
//           vpb (VPBank), tpb (TPBank), icb (VietinBank), agribank, stb (Sacombank),
//           ocb, shb, msb, vib, hdbank ... Hoac dung ma BIN 6 so (vd 970436 = Vietcombank).
//           Danh sach day du: https://api.vietqr.io/v2/banks  (cot "code" hoac "bin")
// accountNo   : so tai khoan (chi gom chu so)
// accountName : TEN CHU TAI KHOAN, viet HOA, khong dau, dung nhu tren the/app ngan hang
// bankLabel   : ten ngan hang hien cho khach doc (tuy y)
//
// De TRONG bankId/accountNo/accountName -> tinh nang QR tu tat, checkout van chay nhu cu.

export const bank = {
  bankId: "VCB",
  accountNo: "0251002765446",
  accountName: "NGO THANH TU",
  bankLabel: "Vietcombank",
};

export const bankConfigured = Boolean(bank.bankId && bank.accountNo && bank.accountName);

// Anh QR VietQR (dich vu mien phi img.vietqr.io) da dien san so tien + noi dung chuyen khoan.
export function vietQrUrl(amount: number, memo: string): string {
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: memo,
    accountName: bank.accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(
    bank.accountNo
  )}-compact2.png?${params.toString()}`;
}
