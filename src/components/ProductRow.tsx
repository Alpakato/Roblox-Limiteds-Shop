'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ProductCard from './ProductCard'
import type { Item } from '@/types/catalog'
import Link from 'next/link'

export default function ProductRow({
  title,
  items,
  viewAllHref = '/view-all',
}: {
  title: string
  items: Item[]
  viewAllHref?: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateNavState = () => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanLeft(scrollLeft > 0)
    setCanRight(scrollLeft + clientWidth < scrollWidth - 1)
  }

  useEffect(() => {
    updateNavState()
    const el = trackRef.current
    if (!el) return
    const onScroll = () => updateNavState()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => updateNavState())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const scrollByDir = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const step = Math.max(200, Math.floor(el.clientWidth * 0.9))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const onWheelToX: React.WheelEventHandler<HTMLDivElement> = (e) => {
    const el = trackRef.current
    if (!el) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' })
      e.preventDefault()
    }
  }

  const onKeyNav: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'ArrowRight') scrollByDir(1)
    if (e.key === 'ArrowLeft') scrollByDir(-1)
  }

  const showNav = useMemo(() => (items?.length ?? 0) > 0, [items])

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90">
          {title}
        </h2>
        <Link
          className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
          href={viewAllHref}
        >
          View All →
        </Link>
      </div>

      <div className="relative">
        {showNav && (
          <button
            type="button"
            aria-label="เลื่อนไปซ้าย"
            onClick={() => scrollByDir(-1)}
            disabled={!canLeft}
            className={[
              'absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full',
              'bg-white/10 backdrop-blur px-3 py-2 text-white',
              'ring-1 ring-white/20 hover:bg-white/20 transition',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'hidden sm:flex',
            ].join(' ')}
          >
            ←
          </button>
        )}

        {showNav && (
          <button
            type="button"
            aria-label="เลื่อนไปขวา"
            onClick={() => scrollByDir(1)}
            disabled={!canRight}
            className={[
              'absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full',
              'bg-white/10 backdrop-blur px-3 py-2 text-white',
              'ring-1 ring-white/20 hover:bg-white/20 transition',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'hidden sm:flex',
            ].join(' ')}
          >
            →
          </button>
        )}

        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 z-[5]',
            canLeft ? 'bg-gradient-to-r from-[#0b0f1a] to-transparent' : '',
          ].join(' ')}
        />
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 z-[5]',
            canRight ? 'bg-gradient-to-l from-[#0b0f1a] to-transparent' : '',
          ].join(' ')}
        />

        <div
          ref={trackRef}
          onWheel={onWheelToX}
          onKeyDown={onKeyNav}
          tabIndex={0}
          className={[
            'no-scrollbar flex gap-4 overflow-x-auto pb-2',
            'snap-x snap-mandatory scroll-smooth',
            'pr-4',
          ].join(' ')}
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((i) => (
            <div key={i.id} className="snap-start" style={{ scrollSnapAlign: 'start' }}>
              <ProductCard item={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
