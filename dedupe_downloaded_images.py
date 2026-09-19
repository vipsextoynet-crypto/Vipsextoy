# -*- coding: utf-8 -*-
"""
DEDUPE ANH DA TAI THEO NOI DUNG (HASH)
========================================
Don dep nhanh cac anh TRUNG NOI DUNG da lo tai truoc do trong:

    G:\\vipextoy\\public\\anh1

Boi canh: crawler cu dedupe theo URL, nhung mot so san pham nhung lai
CHINH anh gallery vao vung mo ta chi tiet (.dtct/.html201.dtct) voi URL
hoi khac (khac thu muc /1/, khac hoa/thuong...) nen bi tai lai thanh
"anh khac". Script nay quet lai cac thu muc san pham DA CO, gom anh
theo hash noi dung file, giu lai 1 ban cho moi hash, phan con lai
CHUYEN VAO THUNG RAC CACH LY (khong xoa vinh vien ngay) de khong bao
gio mat du lieu neu lo phat hien nham.

AN TOAN:
  - Mac dinh KHONG xoa vinh vien — chi MOVE cac file trung vao thu muc
    _duplicates_removed nam canh INPUT_DIR, giu nguyen cau truc
    <ma_san_pham>/<ten_file_goc> de de doi lai neu can.
  - Co DRY RUN: xem truoc se lam gi ma khong dong vao dia.
  - Sau khi xoa trung, co the danh so lai file con lai cho lien tuc
    (01,02,03,...) — TUY CHON, mac dinh CO BAT (RENUMBER=True), thuc
    hien bang rename an toan (qua ten tam truoc).
  - Ghi bao cao chi tiet ra file .txt de doi chieu sau nay.
"""

import os
import re
import sys
import json
import shutil
import hashlib
import tempfile
from pathlib import Path
from datetime import datetime

# ============================================================
# CAU HINH
# ============================================================

DEFAULT_INPUT_DIR = r"G:\vipextoy\public\anh1"

# Thu muc chua ban dedupe cu (neu ban khong biet no o dau, de mac dinh
# la thu muc con "_duplicates_removed" ngay canh INPUT_DIR).
QUARANTINE_DIR_NAME = "_duplicates_removed"

# True: chi MOVE file trung vao quarantine (AN TOAN, khuyen nghi).
# False: XOA VINH VIEN luon (chi bat sau khi da kiem tra ky quarantine
# va chac chan khong can nua).
MOVE_TO_QUARANTINE = True

# Sau khi loai bo file trung, danh so lai cac file con lai trong moi
# thu muc san pham cho lien tuc (01, 02, 03...).
RENUMBER_AFTER_DEDUPE = True

# Cac thu muc/ten file bo qua khi quet (khong phai thu muc san pham).
SKIP_DIR_PREFIXES = ("_", ".")

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp")

REPORT_FILENAME = "_dedupe_report.txt"


# ============================================================
# TIEN ICH
# ============================================================

def sha256_of_file(path: Path, chunk_size=1024 * 1024):
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def is_product_dir(path: Path):
    if not path.is_dir():
        return False
    if path.name.startswith(SKIP_DIR_PREFIXES):
        return False
    return True


def list_product_dirs(input_dir: Path):
    if not input_dir.exists():
        return []
    return sorted([p for p in input_dir.iterdir() if is_product_dir(p)])


def list_image_files(product_dir: Path):
    files = []
    for p in product_dir.iterdir():
        if not p.is_file():
            continue
        if p.name.startswith(SKIP_DIR_PREFIXES):
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        files.append(p)
    return files


def sort_key_for_keeper(path: Path):
    """
    Trong 1 nhom trung noi dung, uu tien GIU LAI file co so thu tu nho
    nhat trong ten (01.jpg truoc 05.jpg), vi thuong day la anh xuat
    hien som nhat / tu gallery chinh. Neu khong parse duoc so, xep sau
    cung theo ten.
    """
    match = re.match(r"^(\d+)", path.stem)
    if match:
        return (0, int(match.group(1)), path.name.lower())
    return (1, 0, path.name.lower())


# ============================================================
# QUARANTINE (thay vi xoa vinh vien)
# ============================================================

def move_to_quarantine(file_path: Path, quarantine_dir: Path, product_code: str):
    dest_dir = quarantine_dir / product_code
    dest_dir.mkdir(parents=True, exist_ok=True)

    dest_path = dest_dir / file_path.name
    if dest_path.exists():
        # tranh de len neu quarantine da co file trung ten tu truoc.
        stem, suffix = dest_path.stem, dest_path.suffix
        n = 1
        while dest_path.exists():
            dest_path = dest_dir / f"{stem}__dup{n}{suffix}"
            n += 1

    shutil.move(str(file_path), str(dest_path))
    return dest_path


# ============================================================
# RENAME AN TOAN (khong bao gio de mat file vi trung ten khi danh so lai)
# ============================================================

def renumber_folder(product_dir: Path, kept_files_in_order):
    """
    Danh lai so cho danh sach file con lai (da sap theo thu tu goc),
    thanh 01.ext, 02.ext, ... Dung 2 buoc: rename sang ten tam duy
    nhat truoc, roi rename sang ten cuoi, de tranh truong hop hoan doi
    so thu tu de len nhau giua cac file.
    """
    temp_names = []
    for f in kept_files_in_order:
        fd, tmp_path = tempfile.mkstemp(dir=str(product_dir), prefix=".tmp_renum_", suffix=f.suffix)
        os.close(fd)
        os.remove(tmp_path)  # chi muon mot ten duy nhat chua ton tai
        os.replace(str(f), tmp_path)
        temp_names.append(Path(tmp_path))

    final_map = []
    for i, tmp_f in enumerate(temp_names, start=1):
        final_name = product_dir / f"{i:02d}{tmp_f.suffix.lower()}"
        os.replace(str(tmp_f), str(final_name))
        final_map.append(final_name)

    return final_map


# ============================================================
# XU LY 1 THU MUC SAN PHAM
# ============================================================

def dedupe_product_dir(product_dir: Path, quarantine_dir: Path, dry_run: bool, report_lines):
    files = list_image_files(product_dir)
    if len(files) < 2:
        return {"groups": 0, "removed": 0, "kept": len(files), "bytes_freed": 0}

    groups = {}
    errors = []

    for f in files:
        try:
            h = sha256_of_file(f)
        except Exception as e:
            errors.append(f"{f}: {e}")
            continue
        groups.setdefault(h, []).append(f)

    dup_groups = {h: fl for h, fl in groups.items() if len(fl) > 1}

    removed = 0
    bytes_freed = 0
    kept_files = []

    for h, group in groups.items():
        group_sorted = sorted(group, key=sort_key_for_keeper)
        keeper = group_sorted[0]
        kept_files.append(keeper)

        dups = group_sorted[1:]
        for dup in dups:
            size = dup.stat().st_size
            report_lines.append(
                f"[{product_dir.name}] TRÙNG: giữ '{keeper.name}', "
                f"bỏ '{dup.name}' (hash={h[:12]}..., {size} bytes)"
            )
            if not dry_run:
                if MOVE_TO_QUARANTINE:
                    dest = move_to_quarantine(dup, quarantine_dir, product_dir.name)
                    report_lines.append(f"    -> chuyển vào: {dest}")
                else:
                    dup.unlink()
                    report_lines.append("    -> đã xóa vĩnh viễn")
            removed += 1
            bytes_freed += size

    if not dry_run and RENUMBER_AFTER_DEDUPE and dup_groups:
        kept_files_in_order = sorted(
            [p for p in kept_files if p.exists()],
            key=sort_key_for_keeper,
        )
        renamed = renumber_folder(product_dir, kept_files_in_order)
        report_lines.append(
            f"[{product_dir.name}] Đã đánh số lại {len(renamed)} file còn "
            f"lại: {', '.join(p.name for p in renamed)}"
        )

    if errors:
        for e in errors:
            report_lines.append(f"[{product_dir.name}] LỖI đọc file: {e}")

    return {
        "groups": len(dup_groups),
        "removed": removed,
        "kept": len(groups),
        "bytes_freed": bytes_freed,
    }


# ============================================================
# MAIN
# ============================================================

def human_size(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main():
    print("=" * 70)
    print("DEDUPE ẢNH ĐÃ TẢI THEO NỘI DUNG (HASH)")
    print("=" * 70)

    input_text = input(f"Nhập thư mục ảnh cần dọn [{DEFAULT_INPUT_DIR}]: ").strip()
    input_dir = Path(input_text or DEFAULT_INPUT_DIR)

    if not input_dir.exists():
        print(f"LỖI: không tồn tại: {input_dir}")
        sys.exit(1)

    quarantine_dir = input_dir.parent / QUARANTINE_DIR_NAME

    print()
    print(f"INPUT       : {input_dir}")
    print(f"Quarantine  : {quarantine_dir}  "
          f"({'sẽ dùng' if MOVE_TO_QUARANTINE else 'KHÔNG dùng — sẽ XÓA VĨNH VIỄN'})")
    print(f"Đánh số lại sau khi dedupe : {RENUMBER_AFTER_DEDUPE}")
    print()

    product_dirs = list_product_dirs(input_dir)
    print(f"Tìm thấy {len(product_dirs)} thư mục sản phẩm.")
    print()

    print("Bước 1: chạy thử (DRY RUN) để xem trước — KHÔNG đụng vào ổ đĩa.")
    print()

    dry_report = []
    dry_total_groups = dry_total_removed = dry_total_bytes = 0

    for pd in product_dirs:
        stats = dedupe_product_dir(pd, quarantine_dir, dry_run=True, report_lines=dry_report)
        dry_total_groups += stats["groups"]
        dry_total_removed += stats["removed"]
        dry_total_bytes += stats["bytes_freed"]

    print(f"Số sản phẩm có ảnh trùng : {sum(1 for l in dry_report if 'TRÙNG' in l) and len({l.split(']')[0] for l in dry_report if 'TRÙNG' in l})}")
    print(f"Số nhóm ảnh trùng        : {dry_total_groups}")
    print(f"Số file sẽ bị loại bỏ    : {dry_total_removed}")
    print(f"Dung lượng sẽ giải phóng : {human_size(dry_total_bytes)}")
    print()

    if dry_total_removed == 0:
        print("Không tìm thấy ảnh trùng nội dung nào. Không cần làm gì thêm.")
        return

    show_detail = input("Xem chi tiết danh sách trùng? (y/n) [n]: ").strip().lower()
    if show_detail == "y":
        print()
        for line in dry_report:
            print(line)
        print()

    confirm = input(
        f"XÁC NHẬN: {'chuyển' if MOVE_TO_QUARANTINE else 'XÓA VĨNH VIỄN'} "
        f"{dry_total_removed} file trùng? (gõ đúng chữ CO để tiếp tục): "
    ).strip()

    if confirm != "CO":
        print("Đã hủy. Không có gì bị thay đổi.")
        return

    print()
    print("Đang xử lý thật...")
    print()

    real_report = []
    total_groups = total_removed = total_bytes = 0

    for pd in product_dirs:
        stats = dedupe_product_dir(pd, quarantine_dir, dry_run=False, report_lines=real_report)
        if stats["removed"] > 0:
            print(f"[{pd.name}] loại {stats['removed']} ảnh trùng "
                  f"({stats['groups']} nhóm, giữ {stats['kept']} ảnh duy nhất)")
        total_groups += stats["groups"]
        total_removed += stats["removed"]
        total_bytes += stats["bytes_freed"]

    report_path = input_dir / REPORT_FILENAME
    try:
        with report_path.open("w", encoding="utf-8") as f:
            f.write(f"DEDUPE REPORT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Input: {input_dir}\n")
            f.write(f"Quarantine: {quarantine_dir if MOVE_TO_QUARANTINE else '(đã xóa vĩnh viễn, không có quarantine)'}\n")
            f.write("=" * 70 + "\n")
            for line in real_report:
                f.write(line + "\n")
            f.write("=" * 70 + "\n")
            f.write(f"Tổng nhóm trùng : {total_groups}\n")
            f.write(f"Tổng file loại  : {total_removed}\n")
            f.write(f"Dung lượng giải phóng : {human_size(total_bytes)}\n")
    except Exception as e:
        print(f"[CẢNH BÁO] Không ghi được report: {e}")

    print()
    print("=" * 70)
    print("HOÀN TẤT")
    print("=" * 70)
    print(f"Tổng nhóm trùng          : {total_groups}")
    print(f"Tổng file đã loại bỏ     : {total_removed}")
    print(f"Dung lượng giải phóng    : {human_size(total_bytes)}")
    if MOVE_TO_QUARANTINE:
        print(f"Các file trùng nằm ở     : {quarantine_dir}")
        print("(Kiểm tra kỹ, thấy ổn thì có thể tự xóa quarantine sau.)")
    print(f"Báo cáo chi tiết         : {report_path}")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print("Đã dừng bởi người dùng. Chưa xử lý xong có thể chạy lại an toàn")
        print("(script chỉ dedupe theo trạng thái hiện tại của thư mục).")
        sys.exit(1)
