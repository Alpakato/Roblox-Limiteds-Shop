'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCatalog } from '@/app/hooks/useCatalog'
import type { Item } from '@/types/catalog'
import FakeUrgency from '@/components/FakeUrgency'
import { useCart } from '@/app/context/CartContext'
import { emitCartAdd } from '@/app/lib/flyToCart'

const PAGE_SIZE = 24 // จำนวนที่โหลดเพิ่มต่อรอบ

const Tag = ({ text, tone = 'emerald' }: { text: string; tone?: 'emerald' | 'cyan' }) => {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
    cyan: 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${toneMap[tone]}`}>
      {text}
    </span>
  )
}

function parsePrice(s?: string | null) {
  if (!s || s === '-' || s.toLowerCase() === 'free') return 0
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function stableHash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** แสดงราคาแบบมีไอคอน Robux นำหน้า (ไอคอนขาว) */
function Price({
  amount,
  type = 'normal', // 'normal' | 'strike' | 'discounted' | 'free'
}: {
  amount: number
  type?: 'normal' | 'strike' | 'discounted' | 'free'
}) {
  const style = {
    normal:
      'text-white font-semibold text-base leading-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]',
    strike:
      'text-white/40 text-[10px] leading-tight line-through',
    discounted:
      'text-cyan-200/90 text-sm font-semibold leading-tight',
    free:
      'text-base font-extrabold tracking-tight text-cyan-300 leading-tight',
  }[type]

  const iconSize = type === 'strike' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <div className={`inline-flex items-center gap-1 [font-variant-numeric:tabular-nums] ${style}`}>
      <img
        src="/icon/robux.svg"
        alt="Robux"
        className={`${iconSize} translate-y-[.5px] opacity-90 invert brightness-0`}
        aria-hidden
      />
      <span>{amount.toLocaleString()}</span>
    </div>
  )
}

/** คอมโพเนนต์ “หน้า” ตัวหลัก — ไม่มีการเรียก useSearchParams เอง */
export default function ViewAllPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6 text-white/70">Loading…</div>}>
      <ViewAllInner />
    </Suspense>
  )
}

/** Card หนึ่งใบใน Grid — ดีไซน์เดียวกับ ProductCard.tsx แต่ทำให้กว้างเต็มคอลัมน์ของ grid */
function ProductGridCard({ item }: { item: Item }) {
  const { add } = useCart()
  const router = useRouter()
  const imgRef = useRef<HTMLImageElement | null>(null)

  const basePrice = parsePrice(item.price)

  const promo = useMemo(() => {
    if (basePrice <= 0) return null
    const h = stableHash(item.id)
    const show = (h % 100) < 40
    if (!show) return null
    const pctList = [10, 15, 20, 25, 30, 35, 40]
    const pct = pctList[h % pctList.length]
    const discounted = Math.max(1, Math.round(basePrice * (100 - pct) / 100))
    const mins = 5 + (h % 10)
    const endsAt = Date.now() + mins * 60 * 1000
    return { pct, discounted, endsAt }
  }, [item.id, basePrice])

  const payPrice = promo?.discounted ?? basePrice

  function num(v: unknown): number {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^0-9.]/g, ''))
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }

  const hasDiscount =
    !!(item as any).discountPct ||
    ((item as any).priceBefore != null && num(String(item.price)) < num(String((item as any).priceBefore))) ||
    (Array.isArray((item as any).badges) && (item as any).badges.includes('SALE')) ||
    !!promo

  // ไปหน้า Finish (ยืนยันการซื้อ) พร้อมพารามิเตอร์สินค้า + จำนวน Robux ที่จะตัด
  const goFinishNow = () => {
    const params = new URLSearchParams({
      id: item.id,
      name: item.title,
      price: String(payPrice),
      currency: 'R$',
      qty: '1',
      image: item.image || '',
      description: item.by ? `By ${item.by}` : '',
      robuxSpend: String(payPrice),
      returnTo: '/', // ปรับปลายทางหลังยืนยันได้
    })
    emitCartAdd({ sourceEl: imgRef.current })
    router.push(`/finish?${params.toString()}`)
  }

  const addToCart = () => {
    add({
      id: item.id,
      title: item.title,
      image: item.image,
      price: payPrice,
      qty: 1,
    })
    emitCartAdd({ sourceEl: imgRef.current })
  }

  return (
    <div
      className="
        group relative w-full
        bg-gradient-to-br from-white/5 via-white/10 to-white/5
        p-[1px] rounded-2xl
        hover:scale-[1.02] transition-all duration-300
        shadow-[0_0_12px_rgba(0,0,0,.4)]
        h-[360px]
      "
    >
      <div className="rounded-2xl flex h-full flex-col bg-black/30 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <div className="relative h-40 w-full overflow-hidden">
          <img
            ref={imgRef}
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
          <div className="absolute left-2 top-2 flex gap-1">
            {item.tag === 'LIMITED' && <Tag text="LIMITED" tone="emerald" />}
            {item.tag === 'UGC' && <Tag text="UGC" tone="cyan" />}
          </div>
          {promo && (
            <div className="absolute right-2 top-2 rounded-md bg-rose-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              -{promo.pct}%
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <div className="flex flex-col">
            <div className="h-5 leading-5 font-semibold text-white/90 overflow-hidden text-ellipsis whitespace-nowrap">
              {item.title}
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-white/60">
              By <span className="text-white/80">{item.by}</span>
            </div>
            <div className="mt-2 h-8">
              <FakeUrgency id={item.id} hasDiscount={hasDiscount} />
            </div>
          </div>

          <div className="flex-1" />

          <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="h-11 flex flex-col justify-end">
              {basePrice === 0 ? (
                <>
                  <div className="text-[11px] leading-tight text-white/50 line-through invisible select-none">-</div>
                  <div className="text-base font-extrabold tracking-tight text-cyan-300 leading-tight">Free</div>
                </>
              ) : promo ? (
                <>
                  <Price amount={basePrice} type="strike" />
                  <Price amount={payPrice} type="discounted" />
                </>
              ) : (
                <>
                  <div className="text-[11px] leading-tight text-white/50 line-through invisible select-none">-</div>
                  <Price amount={basePrice} type="normal" />
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="
                  px-3 py-1.5 text-xs font-semibold rounded-lg
                  bg-white/10 text-white hover:bg-white/20 active:scale-[.98]
                  ring-1 ring-white/15 transition
                "
                onClick={addToCart}
                aria-label={`Add ${item.title} to cart`}
              >
                เพิ่มลงตะกร้า
              </button>
              <button
                className="
                  px-3 py-1.5 text-xs font-semibold rounded-lg
                  bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 active:scale-[.98]
                  ring-1 ring-cyan-400/30 transition
                "
                onClick={goFinishNow}
                aria-label={`Finish ${item.title} now`}
              >
                ยืนยันการซื้อ
              </button>
            </div>
          </div>

          <div className="mt-2 h-4 text-[10px]">
            {promo ? (
              <span className="text-emerald-300/90">
                โปรฯ หมดใน ~{Math.max(1, Math.round((promo.endsAt - Date.now()) / 60000))} นาที
              </span>
            ) : (
              <span className="invisible select-none">placeholder</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** คอมโพเนนต์ลูก ที่เรียก useSearchParams ได้ เพราะถูกห่อด้วย <Suspense> แล้ว */
function ViewAllInner() {
  const params = useSearchParams()
  const [q, setQ] = useState('')
  const cat = params.get('cat') as 'roblox' | 'ugc' | null // 'roblox' | 'ugc' | null
  const { data, roblox, ugc } = useCatalog(q)

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
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])

  // IntersectionObserver: เห็น sentinel เมื่อไหร่ เพิ่ม visibleCount
  useEffect(() => {
    if (!hasMore) return
    const el = loaderRef.current
    if (!el) return

    const onIntersect: IntersectionObserverCallback = (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !isLoadingMore) {
        setIsLoadingMore(true)
        setTimeout(() => {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length))
          setIsLoadingMore(false)
        }, 300)
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
          <ProductGridCard key={i.id} item={i} />
        ))}

        {/* Skeleton โหลดเพิ่ม */}
        {isLoadingMore &&
          Array.from({ length: Math.min(PAGE_SIZE, items.length - visibleItems.length) }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="animate-pulse overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 h-[360px]"
            >
              <div className="h-40 w-full bg-white/10" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-8 w-full rounded bg-white/10" />
              </div>
            </div>
          ))}
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
