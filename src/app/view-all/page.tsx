'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCatalog } from '@/app/hooks/useCatalog'
import type { Item } from '@/types/catalog'
import FakeUrgency from '@/components/FakeUrgency'
import { useCart } from '@/app/context/CartContext'

const PAGE_SIZE = 24 // จำนวนที่โหลดเพิ่มต่อรอบ

function parsePrice(s?: string | null) {
  if (!s || s === '-' || s.toLowerCase() === 'free') return 0
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** คอมโพเนนต์ “หน้า” ตัวหลัก — ไม่มีการเรียก useSearchParams เอง */
export default function ViewAllPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-white/70">Loading…</div>}>
      <ViewAllInner />
    </Suspense>
  )
}

/** คอมโพเนนต์ลูก ที่เรียก useSearchParams ได้ เพราะถูกห่อด้วย <Suspense> แล้ว */
function ViewAllInner() {
  const params = useSearchParams()
  const [q, setQ] = useState('')
  const cat = params.get('cat') as 'roblox' | 'ugc' | null // 'roblox' | 'ugc' | null
  const { data, roblox, ugc } = useCatalog(q)
  const { add } = useCart()

  // รวมรายการตามหมวด / ค้นหา
  const items = useMemo<Item[]>(() => {
    if (cat === 'roblox') return roblox
    if (cat === 'ugc') return ugc
    const r = data?.robloxLimiteds ?? []
    const u = data?.ugcLimiteds ?? []
    return [...r, ...u]
  }, [cat, data, roblox, ugc])

  // ----- Infinite Scroll state -----
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  // รีเซ็ตเมื่อเปลี่ยนหมวด/ผลลัพธ์ค้นหา
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [cat, q, items.length])

  const hasMore = visibleCount < items.length
  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  )

  // IntersectionObserver: เห็น sentinel เมื่อไหร่ เพิ่ม visibleCount
  useEffect(() => {
    if (!hasMore) return
    const el = loaderRef.current
    if (!el) return

    const onIntersect: IntersectionObserverCallback = (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !isLoadingMore) {
        setIsLoadingMore(true)
        const t = setTimeout(() => {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length))
          setIsLoadingMore(false)
        }, 300)
        // หมายเหตุ: return ที่นี่ไม่มีผลกับ useEffect cleanup
      }
    }

    const io = new IntersectionObserver(onIntersect, {
      root: null,
      rootMargin: '0px 0px 400px 0px',
      threshold: 0.01,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, isLoadingMore, items.length])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">ดูสินค้าทั้งหมด</h1>
        <div className="text-sm text-white/60">{items.length} รายการ</div>

        <div className="ml-auto flex items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.48-5.34C15.21 5.01 12.2 2 8.6 2S2 5.01 2 8.39 5.01 14.78 8.6 14.78c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19z"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา…"
            className="w-48 bg-transparent py-2 text-sm outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visibleItems.map((i) => (
          <div key={i.id} className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <img src={i.image} alt={i.title} className="h-40 w-full object-cover" />
            <div className="p-3">
              <div className="line-clamp-1 font-semibold text-white/90">{i.title}</div>
              <div className="mt-0.5 text-xs text-white/60">
                By <span className="text-white/80">{i.by}</span>
              </div>
              <FakeUrgency id={i.id} />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-cyan-300">{(i as any).price ?? '-'}</div>
                <button
                  onClick={() =>
                    add({
                      id: i.id,
                      title: i.title,
                      image: i.image,
                      price: parsePrice((i as any).price),
                      qty: 1,
                    })
                  }
                  className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Skeleton โหลดเพิ่ม */}
        {isLoadingMore &&
          Array.from({ length: Math.min(PAGE_SIZE, items.length - visibleItems.length) }).map(
            (_ , idx) => (
              <div
                key={`skeleton-${idx}`}
                className="animate-pulse overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10"
              >
                <div className="h-40 w-full bg-white/10" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-8 w-full rounded bg-white/10" />
                </div>
              </div>
            )
          )}
      </div>

      {/* Sentinel สำหรับ IntersectionObserver */}
      <div ref={loaderRef} className="h-10" />

      {/* ข้อความท้ายถ้าหมดแล้ว */}
      {!hasMore && items.length > 0 && (
        <div className="py-6 text-center text-sm text-white/50">— สิ้นสุดรายการ —</div>
      )}
    </main>
  )
}
