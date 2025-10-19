'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // --- Progressive render config ---
  const INITIAL = Math.min(8, items.length) // เริ่มโชว์ 8 ชิ้น (หรือเท่าที่มีถ้าน้อยกว่า)
  const STEP = 6                             // โหลดเพิ่มครั้งละ 6 ชิ้น
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL)

  // รีเซ็ตเมื่อรายการเปลี่ยน
  useEffect(() => {
    setVisibleCount(Math.min(INITIAL, items.length))
  }, [items])

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])

  const updateNavState = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanLeft(scrollLeft > 0)
    setCanRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

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
  }, [updateNavState])

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

  // --- Lazy grow: ใช้ IntersectionObserver ภายในแทร็กแนวนอน ---
  useEffect(() => {
    const root = trackRef.current
    const target = sentinelRef.current
    if (!root || !target) return

    // preload ล่วงหน้าเล็กน้อยด้วย rootMargin ด้านขวา
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return

        // เพิ่มทีละ STEP จนกว่าจะครบทั้งหมด
        setVisibleCount((curr) => {
          if (curr >= items.length) return curr
          const next = Math.min(curr + STEP, items.length)
          return next
        })
      },
      {
        root,
        // กระตุ้นก่อนถึงปลาย ~40% ของความกว้างตัวเลื่อน
        rootMargin: '0px 40% 0px 0px',
        threshold: 0.01,
      }
    )

    io.observe(target)
    return () => {
      io.disconnect()
    }
  }, [items.length])

  // ปรับปรุง: ถ้าเลื่อนไปสุดแล้ว (และยังเหลือที่ต้องโหลด) ให้ดันเพิ่มด้วย
  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const onScrollEdge = () => {
      const atRightEdge = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      if (atRightEdge && visibleCount < items.length) {
        setVisibleCount((c) => Math.min(c + STEP, items.length))
      }
    }
    el.addEventListener('scroll', onScrollEdge, { passive: true })
    return () => el.removeEventListener('scroll', onScrollEdge)
  }, [items.length, visibleCount])

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
          {visibleItems.map((i) => (
            <div key={i.id} className="snap-start" style={{ scrollSnapAlign: 'start' }}>
              <ProductCard item={i} />
            </div>
          ))}

          {/* Sentinel สำหรับกระตุ้นโหลดเพิ่ม */}
          <div
            ref={sentinelRef}
            aria-hidden
            className="shrink-0 w-px h-1"
          />
        </div>
      </div>
    </section>
  )
}
