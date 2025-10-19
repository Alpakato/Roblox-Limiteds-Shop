'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCatalog } from '@/app/hooks/useCatalog'
import { useCart } from '@/app/context/CartContext'
import FakeUrgency from '@/components/FakeUrgency' // ถ้ายังไม่มี ให้คอมเมนต์บรรทัดนี้/เอาออกได้
import type { Item } from '@/types/catalog'

// ✅ ช่วย parse/format ราคา
function parsePrice(s?: string | null) {
  if (!s || s === '-' || s.toLowerCase() === 'free') return 0
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}
function formatPrice(s?: string | null) {
  const n = parsePrice(s)
  if (n === 0) return 'Free'
  return `฿${n.toLocaleString()}`
}

// ✅ ป้ายสีตามแท็ก
function TagBadge({ tag }: { tag: 'LIMITED' | 'UGC' }) {
  const tone =
    tag === 'LIMITED'
      ? 'from-emerald-400/70 to-emerald-300/40 text-emerald-100 ring-emerald-300/30'
      : 'from-cyan-400/70 to-cyan-300/40 text-cyan-100 ring-cyan-300/30'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold
                      bg-gradient-to-b ${tone} ring-1`}>
      {tag === 'LIMITED' ? 'LIMITED' : 'UGC'}
    </span>
  )
}

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams() as { id?: string }
  const id = params?.id ?? ''
  const { add } = useCart()

  // โหลดแคตตาล็อก (ใช้แคชตัวเดิมจาก useCatalog)
  const { roblox, ugc, loading, data } = useCatalog('')

  // หา item ตาม id
  const item: Item | null = useMemo(() => {
    if (!id) return null
    const all = [...roblox, ...ugc]
    return all.find((x) => x.id === id) ?? null
  }, [id, roblox, ugc])

  // สินค้าใกล้เคียง (จากแท็กเดียวกัน)
  const related = useMemo(() => {
    if (!item) return [] as Item[]
    const pool = item.tag === 'LIMITED' ? roblox : ugc
    return pool.filter((x) => x.id !== item.id).slice(0, 12)
  }, [item, roblox, ugc])

  // เอฟเฟกต์บินเข้า cart
  const imgRef = useRef<HTMLImageElement | null>(null)
  const onAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!item) return
    // เรียก context เพิ่มของลงตะกร้า
    add(item as any)
    // แจ้ง header ทำเอฟเฟกต์บินเข้า cart
    document.dispatchEvent(
      new CustomEvent('cart:add', {
        detail: { sourceEl: imgRef.current },
      })
    )
  }

  // Loading state
  if (loading && !data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-square rounded-lg bg-white/5 animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
            <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-10 w-40 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </main>
    )
  }

  // Not found
  if (!item) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-white/70">ไม่พบสินค้าที่คุณต้องการ</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/15 hover:bg-white/15"
        >
          ← กลับหน้าแรก
        </button>
      </main>
    )
  }

  const priceText = formatPrice(item.price)

  return (
    <main>
      {/* Hero / breadcrumb เล็ก ๆ */}
      <section className="bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0b1220] border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <nav className="text-[13px] text-white/60">
            <Link href="/" className="hover:text-white/90">หน้าแรก</Link>
            <span className="mx-2 opacity-50">/</span>
            <Link
              href={`/view-all?cat=${item.tag === 'LIMITED' ? 'roblox' : 'ugc'}`}
              className="hover:text-white/90"
            >
              {item.tag === 'LIMITED' ? 'Roblox Limiteds' : 'UGC Limiteds'}
            </Link>
            <span className="mx-2 opacity-50">/</span>
            <span className="text-white/90">{item.title}</span>
          </nav>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-white/90">
            {item.title}
          </h1>
          <p className="mt-1 text-white/60 text-sm">by <span className="text-white/80">{item.by}</span></p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ภาพสินค้า */}
          <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 md:p-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-black/30 ring-1 ring-white/10">
              {/* ใช้ <img> ให้ตรงกับที่โปรเจกต์ใช้อยู่ */}
              <img
                ref={imgRef}
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
            {/* สต็อกปลอม / urgency */}
            {/* ถ้าไม่มี FakeUrgency ให้คอมเมนต์สองบรรทัดนี้ได้ */}
            <div className="mt-2">
              <FakeUrgency id={item.id} />
            </div>
          </div>

          {/* รายละเอียด */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TagBadge tag={item.tag} />
              <span className="text-xs text-white/50">ID: {item.id}</span>
            </div>

            <div className="text-3xl font-bold">{priceText}</div>

            <ul className="text-sm text-white/70 space-y-1">
              <li>ผู้ขาย/ผู้สร้าง: <span className="text-white/90">{item.by}</span></li>
              <li>หมวด: {item.tag === 'LIMITED' ? 'Roblox Limited' : 'UGC Limited'}</li>
              {/* คุณอยากโชว์ field อื่นๆ เพิ่มได้ เช่น rarity, release date ถ้ามีใน schema */}
            </ul>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onAddToCart}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-black font-semibold px-4 py-2
                           shadow-[0_0_0_3px_rgba(16,185,129,0.25)] hover:bg-emerald-300 active:translate-y-px"
              >
                <span className="i-lucide-plus" aria-hidden />
                เพิ่มลงตะกร้า
              </button>

              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15 hover:bg-white/15"
              >
                ไปที่ตะกร้า →
              </Link>
            </div>

            {/* หมายเหตุเดโม่ */}
            <p className="text-xs text-white/50 pt-1">
              *เดโม: ไม่มีการชำระเงินจริง ข้อมูลใช้เพื่อการทดลองเท่านั้น
            </p>
          </div>
        </div>

        {/* สินค้าใกล้เคียง */}
        {related.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90">สินค้าใกล้เคียง</h2>
              <Link
                href={`/view-all?cat=${item.tag === 'LIMITED' ? 'roblox' : 'ugc'}`}
                className="text-sm text-cyan-300 hover:text-cyan-200"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/item/${r.id}`}
                  className="group rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition"
                >
                  <div className="aspect-square overflow-hidden bg-black/30">
                    <img
                      src={r.image}
                      alt={r.title}
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition"
                    />
                  </div>
                  <div className="p-2">
                    <div className="text-[13px] text-white/90 line-clamp-1">{r.title}</div>
                    <div className="text-[12px] text-white/50">{formatPrice(r.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
