#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
rolimons_build_next_assets.py
- ดึงรายการ LIMITED ทั้งหมดจาก Rolimon's API
- ขอรูปทาง Roblox Thumbnails API
- วางไฟล์สำหรับ Next.js:
    <NEXT_PUBLIC>/images/rolimons/*.png
    <NEXT_PUBLIC>/data/items.json     (สคีมาตรงกับหน้าบ้านเดิม + เพิ่ม price:number, currency, displayPrice)
    <NEXT_PUBLIC>/data/products.json  (ออปชัน --emit-products, สคีมาตรงกับ Product)
- รองรับ Windows/Mac/Linux

ออปชันใหม่:
--price-source rap|value   เลือกใช้ราคา RAP หรือ Value (ดีฟอลต์ rap)
--currency "R$"            หน่วยสกุล (ดีฟอลต์ R$ = Robux)
--default-stock 0          ค่า stock เริ่มต้น (สำหรับ products.json)
--emit-products            สร้างไฟล์ products.json ที่ตรงกับ type Product
--no-download              ไม่ดาวน์โหลดรูป (ใช้ URL ของ Roblox ตรง ๆ)
"""

from __future__ import annotations
import os, json, time, argparse
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests
from tqdm import tqdm

# --- Endpoints ---
ROLIMONS_ITEM_API = "https://www.rolimons.com/itemapi/itemdetails"  # LIMITED ทั้งหมด
RBX_THUMB_API     = "https://thumbnails.roblox.com/v1/assets"        # รูปจาก Roblox
RBX_THUMB_SIZE    = "420x420"                                        # ขนาดรูป

HEADERS = {
    "User-Agent": "RolimonsDBBuilder/1.1 (+contact:you@example.com)",
    "Accept": "application/json, text/plain, */*",
}

def fetch_rolimons_items() -> Dict[str, Any]:
    r = requests.get(ROLIMONS_ITEM_API, headers=HEADERS, timeout=60)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError("Rolimons API replied success=false")
    # data["items"] = { "1029025": [Name, Acronym, Rap, Value, DefaultValue, Demand, Trend, Projected, Hyped, Rare], ... }
    return data

def build_thumb_urls(asset_ids: List[str]) -> Dict[str, str]:
    """ขอ URL รูปจาก Roblox Thumbnails API (Batch เป็นชุด ๆ)"""
    urls: Dict[str, str] = {}
    CHUNK = 100
    for i in range(0, len(asset_ids), CHUNK):
        chunk = asset_ids[i : i + CHUNK]
        params = {
            "assetIds": ",".join(chunk),
            "size": RBX_THUMB_SIZE,
            "format": "Png",
            "isCircular": "false",
        }
        rr = requests.get(RBX_THUMB_API, params=params, headers=HEADERS, timeout=60)
        rr.raise_for_status()
        j = rr.json()
        for item in j.get("data", []):
            aid = str(item.get("targetId"))
            image_url = item.get("imageUrl")
            if aid and image_url:
                urls[aid] = image_url
        time.sleep(0.25)  # สุภาพกับ API
    return urls

def download_image(url: str, out_dir: Path, filename_noext: str) -> str:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{filename_noext}.png"
    # ถ้ามีแล้วข้าม
    if path.exists() and path.stat().st_size > 0:
        return "/" + str(path).replace("\\", "/").split("/public/")[-1]
    with requests.get(url, headers=HEADERS, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 14):
                if chunk:
                    f.write(chunk)
    # คืนพาธแบบ public URL (ขึ้นต้นด้วย /)
    return "/" + str(path).replace("\\", "/").split("/public/")[-1]

def safe_int(x: Any) -> Optional[int]:
    try:
        if x is None: return None
        if isinstance(x, (int, float)): return int(x)
        s = str(x).strip().replace(",", "")
        return int(float(s))
    except Exception:
        return None

def price_from_fields(fields: List[Any], source: str) -> Optional[int]:
    """
    fields layout (ตามเอกสารของ Rolimon's):
      0: Name
      1: Acronym
      2: Rap
      3: Value
      4: DefaultValue
      5: Demand
      6: Trend
      7: Projected
      8: Hyped
      9: Rare
    """
    if not fields:
        return None
    rap = safe_int(fields[2]) if len(fields) > 2 else None
    val = safe_int(fields[3]) if len(fields) > 3 else None
    if source == "rap":
        return rap if rap is not None else val
    else:  # "value"
        return val if val is not None else rap

def fmt_price(n: Optional[int], currency: str) -> str:
    if n is None:
        return "-"
    return f"{n:,} {currency}"

def build_catalog_json(records: List[dict]) -> dict:
    """
    โครงสร้าง items.json (คง categories + robloxLimiteds + ugcLimiteds เดิม)
    เพิ่มในแต่ละ item:
      - price (number | 0 ถ้าไม่ทราบ)
      - currency (string)
      - displayPrice (string สวย ๆ)
    """
    return {
        "categories": [
            { "key": "all", "label": "All" },
            { "key": "limited", "label": "Roblox Limiteds" },
            { "key": "ugc", "label": "UGC Limiteds" }
        ],
        "robloxLimiteds": records,
        "ugcLimiteds": []
    }

def main():
    ap = argparse.ArgumentParser(description="Build Next.js public assets (items.json + images) from Rolimon's API")
    ap.add_argument("--next-public", required=True, help="พาธโฟลเดอร์ public ของโปรเจกต์ Next.js (เช่น D:/work/shop/public)")
    ap.add_argument("--by-default", default="ROBLOX", help="ค่าดีฟอลต์ของฟิลด์ 'by'")
    ap.add_argument("--no-download", action="store_true", help="ไม่ดาวน์โหลดรูป (จะใช้ URL ของ Roblox โดยตรง)")
    ap.add_argument("--price-source", choices=["rap","value"], default="rap", help="ใช้ราคาจาก RAP หรือ Value (ดีฟอลต์ rap)")
    ap.add_argument("--currency", default="R$", help="หน่วยสกุลของราคา (เช่น R$)")
    ap.add_argument("--default-stock", type=int, default=0, help="ค่า stock ดีฟอลต์เมื่อสร้าง products.json")
    ap.add_argument("--emit-products", action="store_true", help="เขียนไฟล์ data/products.json (สคีมา Product)")
    args = ap.parse_args()

    next_public = Path(args.next_public).resolve()
    data_dir = next_public / "data"
    img_dir  = next_public / "images" / "rolimons"

    data_dir.mkdir(parents=True, exist_ok=True)
    img_dir.mkdir(parents=True, exist_ok=True)

    print("1) ดึงรายการ LIMITED ทั้งหมดจาก Rolimon's…")
    api = fetch_rolimons_items()
    items_map: Dict[str, List[Any]] = api.get("items", {})
    asset_ids = list(items_map.keys())

    print(f" - ได้ {len(asset_ids)} รายการ")

    print("2) ขอ URL รูปจาก Roblox Thumbnails API…")
    id_to_thumb = build_thumb_urls(asset_ids)

    print("3) สร้างเรคคอร์ด + ดาวน์โหลดรูป (ถ้าต้องการ)…")
    records: List[dict] = []
    products: List[dict] = []

    for aid in tqdm(asset_ids, desc="map items", unit="item"):
        fields = items_map.get(aid, [])
        name = fields[0] if fields else None
        title = name or f"Item {aid}"

        # เลือกแหล่งราคา
        price_num = price_from_fields(fields, args.price_source)
        price_num_out = price_num if price_num is not None else 0
        price_label = fmt_price(price_num, args.currency)

        image_url = id_to_thumb.get(aid)

        # เตรียม image (ดาวน์โหลดหรือไม่ดาวน์โหลด)
        if args.no_download:
            image_for_both = image_url
        else:
            if image_url:
                image_for_both = download_image(image_url, img_dir, aid)
            else:
                image_for_both = None

        # โครง item เดิม (เพิ่ม price, currency, displayPrice)
        item = {
            "id": f"rblx-{aid}",
            "title": title,
            "by": args.by_default,
            "tag": "LIMITED",
            # เดิมเป็น "-" ตอนนี้ใส่เลขจริง + display สวย ๆ
            "price": price_num_out,             # ✅ number เพื่อคำนวณในหน้า Next ได้
            "currency": args.currency,          # ✅ หน่วย
            "displayPrice": price_label,        # ✅ สำหรับโชว์อย่างเดียว
            "image": image_for_both,
            # Optional fields เก็บเผื่อใช้
            # "source": f"https://www.rolimons.com/item/{aid}",
            # "assetId": int(aid),
            # "priceSource": args.price_source,  # "rap"|"value"
        }
        records.append(item)

        # บิลด์ Product record (ตาม type Product) — ใช้ตอน --emit-products
        product = {
            "id": f"rblx-{aid}",
            "name": title,
            "price": price_num_out,
            "currency": args.currency,
            "description": f"Roblox Limited • {title}",
            "image": image_for_both or "",
            "stock": args.default_stock,
            # "model": None,  # จะไม่ใส่ ถ้าไม่ต้องการ field นี้
        }
        products.append(product)

    print("4) เขียนไฟล์ items.json สำหรับหน้าบ้าน…")
    catalog = build_catalog_json(records)
    out_json = data_dir / "items.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    if args.emit_products:
        print("5) เขียนไฟล์ products.json (สคีมา Product)…")
        out_products = data_dir / "products.json"
        with open(out_products, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        print(f" - PRODUCTS : {out_products}")

    print("\n✅ เสร็จเรียบร้อย พร้อมใช้งานใน Next.js")
    print(f" - JSON : {out_json}")
    if args.emit_products:
        print(f" - (เสริม) PRODUCTS JSON : {data_dir / 'products.json'}")
    if not args.no_download:
        print(f" - IMG  : {img_dir} (อ้างด้วย path เริ่มด้วย /images/rolimons/...)")
    else:
        print(" - IMG  : ใช้ URL จาก Roblox โดยตรง (ไม่ได้ดาวน์โหลด)")
    print("\nหน้าเว็บโหลดได้จาก /data/items.json (หรือ /data/products.json ถ้าเปิด --emit-products)")

if __name__ == "__main__":
    main()
