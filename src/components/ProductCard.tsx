'use client'

import { useRef } from 'react'
import { Item } from '@/types/catalog'
import { useCart } from '@/app/context/CartContext'
import FakeUrgency from '@/components/FakeUrgency'
import { emitCartAdd } from '@/app/lib/flyToCart'

const Tag = ({ text, tone = 'emerald' }: { text: string; tone?: 'emerald' | 'cyan' }) => {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
    cyan: 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${toneMap[tone]}`}>{text}</span>
}

function parsePrice(s?: string | null) {
  if (!s || s === '-' || s.toLowerCase() === 'free') return 0
  const n = Number(String(s).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function ProductCard({ item }: { item: Item }) {
  const { add } = useCart()
  const imgRef = useRef<HTMLImageElement | null>(null)

  return (
    <div className="group relative w-60 shrink-0 snap-start overflow-hidden rounded-xl bg-white/3 backdrop-blur-sm ring-1 ring-white/10 hover:ring-white/20 hover:shadow-lg hover:shadow-black/40 transition-all">
      <div className="relative h-36 w-full bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {item.tag === 'LIMITED' && <Tag text="LIMITED" tone="emerald" />}
          {item.tag === 'UGC' && <Tag text="UGC" tone="cyan" />}
        </div>
      </div>

      <div className="p-3">
        <div className="line-clamp-1 font-semibold text-white/90">{item.title}</div>
        <div className="mt-1 text-xs text-white/60">
          By <span className="text-white/80">{item.by}</span>
        </div>

        <FakeUrgency id={item.id} />

        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-cyan-300">
            {item.price === 'Free' ? 'Free' : item.price ?? '-'}
          </div>
          <button
            className="px-2 py-1 text-xs font-semibold rounded-md bg-white/10 text-white hover:bg-white/20 active:scale-[.98] transition"
            onClick={(e) => {
              add({
                id: item.id,
                title: item.title,
                image: item.image,
                price: parsePrice(item.price),
                qty: 1,
              })
              // ยิงอีเวนต์ให้ Header ทำเอฟเฟกต์
              emitCartAdd({ sourceEl: imgRef.current })
            }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}
