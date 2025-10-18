#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
rolimons_build_next_assets.py
- ดึงรายการ LIMITED ทั้งหมดจาก Rolimon's API
- ขอรูปทาง Roblox Thumbnails API
- วางไฟล์สำหรับ Next.js:
    <NEXT_PUBLIC>/images/rolimons/*.png
    <NEXT_PUBLIC>/data/items.json     (สคีมาตรงกับหน้าบ้าน: categories + robloxLimiteds + ugcLimiteds)
- รองรับ Windows/Mac/Linux
"""

from __future__ import annotations
import os, json, time, argparse
from pathlib import Path
from typing import Dict, Any, List
import requests
from tqdm import tqdm

# --- Endpoints ---
ROLIMONS_ITEM_API = "https://www.rolimons.com/itemapi/itemdetails"  # LIMITED ทั้งหมด
RBX_THUMB_API     = "https://thumbnails.roblox.com/v1/assets"        # รูปจาก Roblox
RBX_THUMB_SIZE    = "420x420"                                        # ขนาดรูป

HEADERS = {
    "User-Agent": "RolimonsDBBuilder/1.0 (+contact:you@example.com)",
    "Accept": "application/json, text/plain, */*",
}

def fetch_rolimons_items() -> Dict[str, Any]:
    r = requests.get(ROLIMONS_ITEM_API, headers=HEADERS, timeout=60)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError("Rolimons API replied success=false")
    return data  # {"success": true, "items": { "1029025": [Name, Acronym, Rap, Value, DefaultValue, Demand, Trend, Projected, Hyped, Rare], ... } }

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

def build_catalog_json(records: List[dict]) -> dict:
    """
    สร้างสคีมาให้ตรงกับหน้าบ้าน:
    {
      "categories": [
        { "key": "all", "label": "All" },
        { "key": "limited", "label": "Roblox Limiteds" },
        { "key": "ugc", "label": "UGC Limiteds" }
      ],
      "robloxLimiteds": [ ...Item... ],
      "ugcLimiteds": []
    }
    โดย Item ตรงกับที่พี่ใช้: { id, title, by, tag, price, image }
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
    for aid in tqdm(asset_ids, desc="map items", unit="item"):
        fields = items_map.get(aid, [])
        name = fields[0] if fields else None
        title = name or f"Item {aid}"

        image_url = id_to_thumb.get(aid)
        # แปลงเป็น Item schema ของหน้าบ้าน
        item = {
            "id": f"rblx-{aid}",
            "title": title,
            "by": args.by_default,
            "tag": "LIMITED",
            "price": "-",                # ไม่มีราคาจาก endpoint นี้ → ใช้ "-" ไปก่อน
            "image": None,               # จะใส่ด้านล่าง
            # เก็บข้อมูลเผื่อ (ไม่ได้ใช้ใน UI ตอนนี้):
            # "source": f"https://www.rolimons.com/item/{aid}",
            # "assetId": int(aid),
        }

        if args.no_download:
            item["image"] = image_url  # ใช้ URL ตรงจาก Roblox (โหลดช้ากว่าเล็กน้อย)
        else:
            if image_url:
                # ดาวน์โหลดเก็บใน public/images/rolimons/<assetId>.png
                item["image"] = download_image(image_url, img_dir, aid)
            else:
                item["image"] = None

        records.append(item)

    print("4) เขียนไฟล์ items.json สำหรับหน้าบ้าน…")
    catalog = build_catalog_json(records)

    out_json = data_dir / "items.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print("\n✅ เสร็จเรียบร้อย พร้อมใช้งานใน Next.js")
    print(f" - JSON : {out_json}")
    if not args.no_download:
        print(f" - IMG  : {img_dir} (ถูกอ้างด้วย path เริ่มด้วย /images/rolimons/...)")
    else:
        print(" - IMG  : ใช้ URL จาก Roblox โดยตรง (ไม่ได้ดาวน์โหลด)")
    print("\nนำหน้าเว็บไปโหลดจาก /data/items.json ได้ทันทีครับ")

if __name__ == "__main__":
    main()
