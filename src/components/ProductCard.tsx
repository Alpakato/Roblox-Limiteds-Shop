'use client'

import { useMemo, useRef } from 'react'
import { Item } from '@/types/catalog'
import { useCart } from '@/app/context/CartContext'
import FakeUrgency from '@/components/FakeUrgency'
import { emitCartAdd } from '@/app/lib/flyToCart'

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
  return (h >>> 0)
}

export default function ProductCard({ item }: { item: Item }) {
  const { add } = useCart()
  const imgRef = useRef<HTMLImageElement | null>(null)
  const basePrice = parsePrice(item.price)

  // Promo ลดราคาสุ่ม
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
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const hasDiscount =
  !!item.discountPct ||
  (
    item.priceBefore != null &&
    num(String(item.price)) < num(String(item.priceBefore))
  ) ||
  (Array.isArray((item as any).badges) && (item as any).badges.includes('SALE'));

  return (
    <div
      className="
        group relative w-64 shrink-0 snap-start
        bg-gradient-to-br from-white/5 via-white/10 to-white/5
        p-[1px] rounded-2xl
        hover:scale-[1.02] transition-all duration-300
        shadow-[0_0_12px_rgba(0,0,0,.4)]
        h-[360px]
      "
    >
      {/* inner */}
      <div className="rounded-2xl flex h-full flex-col bg-black/30 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        {/* รูปสินค้า */}
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

        {/* เนื้อหา */}
        <div className="flex flex-1 flex-col p-3">
          {/* ชื่อ/ผู้ขาย + pill */}
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

          {/* ราคา + ปุ่ม (จัด space คงที่) */}
          <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-3">
            {/* กล่องราคาคงที่สองบรรทัด */}
            <div className="h-11 flex flex-col justify-end [font-variant-numeric:tabular-nums]">
              {basePrice === 0 ? (
                <>
                  {/* บรรทัดบน (placeholder) */}
                  <div className="text-[11px] leading-tight text-white/50 line-through invisible select-none">
                    -
                  </div>
                  {/* บรรทัดล่าง (จริง) */}
                  <div className="text-base font-extrabold tracking-tight text-cyan-300 leading-tight">
                    Free
                  </div>
                </>
              ) : promo ? (
                <>
                  <div className="text-[11px] leading-tight text-white/50 line-through">
                    {item.price ?? '-'}
                  </div>
                  <div className="text-base font-extrabold tracking-tight text-cyan-300 leading-tight">
                    {promo.discounted.toLocaleString()}
                  </div>
                </>
              ) : (
                <>
                  {/* บรรทัดบน (placeholder) */}
                  <div className="text-[11px] leading-tight text-white/50 line-through invisible select-none">
                    {item.price ?? '-'}
                  </div>
                  {/* บรรทัดล่าง (จริง) */}
                  <div className="text-base font-semibold text-cyan-300 leading-tight">
                    {item.price ?? '-'}
                  </div>
                </>
              )}
            </div>

            <button
              className="
                px-3 py-1.5 text-xs font-semibold rounded-lg
                bg-white/10 text-white hover:bg-white/20 active:scale-[.98]
                ring-1 ring-white/15
                transition
              "
              aria-label={`Add ${item.title} to cart`}
              onClick={() => {
                add({ id: item.id, title: item.title, image: item.image, price: payPrice, qty: 1 })
                emitCartAdd({ sourceEl: imgRef.current })
              }}
            >
              Add to cart
            </button>
          </div>

          {/* เวลาโปรฯ (กันพื้นที่ไว้คงที่) */}
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
