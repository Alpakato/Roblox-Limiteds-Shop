'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/app/context/CartContext'
import { useCatalog } from '@/app/hooks/useCatalog'
import { flyToCart } from '@/app/lib/flyToCart'

export default function Header() {
  const { count } = useCart()
  const [query, setQuery] = useState('')
  const { roblox, ugc, loading } = useCatalog(query)
  const results = [...roblox, ...ugc].slice(0, 6)

  // เอฟเฟกต์ตะกร้า
  const cartRef = useRef<HTMLAnchorElement | null>(null)
  const [bump, setBump] = useState(false)
  const [plusOne, setPlusOne] = useState(0)

  useEffect(() => {
    const onAdd = (e: Event) => {
      const anyE = e as CustomEvent
      const srcEl = anyE?.detail?.sourceEl as HTMLElement | null
      const tgtEl = cartRef.current
      if (srcEl && tgtEl) flyToCart(srcEl, tgtEl)
      setBump(true)
      setPlusOne((n) => n + 1)
      const t = setTimeout(() => setBump(false), 450)
      void t
    }
    document.addEventListener('cart:add', onAdd as EventListener)
    return () => document.removeEventListener('cart:add', onAdd as EventListener)
  }, [])

  // === Robux pill ===
  const [robux, setRobux] = useState<number>(0)

  useEffect(() => {
    // อ่านตอน mount
    const readNow = () => {
      try {
        const raw = localStorage.getItem('robux')
        const cur = Number(raw ?? '0')
        const safe = Number.isFinite(cur) ? cur : 0
        setRobux(safe)
        if (raw === null) localStorage.setItem('robux', String(safe))
        // ถ้าเจอธง -> rebroadcast แล้วลบทิ้ง (กันพลาดอีเวนต์ช่วงเปลี่ยนหน้า)
        if (localStorage.getItem('robux_needs_broadcast') === '1') {
          window.dispatchEvent(new CustomEvent('robux:set', { detail: { value: safe } }))
          localStorage.removeItem('robux_needs_broadcast')
        }
        console.log('[robux][header] mount ->', { value: safe })
      } catch {}
    }
    readNow()

    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'robux' && e.newValue !== null) {
        const v = Number(e.newValue)
        if (!Number.isNaN(v)) {
          console.log('[robux][header] storage event', { value: v })
          setRobux(v)
        }
      }
    }
    window.addEventListener('storage', onStorage)

    // same-tab custom events
    const onRobuxSet = (e: Event) => {
      const val = (e as CustomEvent)?.detail?.value
      console.log('[robux][header] event robux:set', { value: val })
      if (typeof val === 'number' && Number.isFinite(val)) {
        setRobux(val)
        localStorage.setItem('robux', String(val))
      }
    }
    const onRobuxAdd = (e: Event) => {
      const delta = (e as CustomEvent)?.detail?.delta
      console.log('[robux][header] event robux:add', { delta })
      if (typeof delta === 'number' && Number.isFinite(delta)) {
        setRobux((prev) => {
          const next = Math.max(0, prev + delta)
          localStorage.setItem('robux', String(next))
          console.log('[robux][header] add -> next', { prev, delta, next })
          return next
        })
      }
    }

    window.addEventListener('robux:set', onRobuxSet as EventListener)
    window.addEventListener('robux:add', onRobuxAdd as EventListener)

    // โฟกัส/visible -> sync ซ้ำ (กันพลาด)
    const syncFromLocal = () => {
      try {
        const raw = localStorage.getItem('robux')
        const cur = Number(raw ?? '0')
        const safe = Number.isFinite(cur) ? cur : 0
        setRobux(safe)
        if (localStorage.getItem('robux_needs_broadcast') === '1') {
          window.dispatchEvent(new CustomEvent('robux:set', { detail: { value: safe } }))
          localStorage.removeItem('robux_needs_broadcast')
        }
      } catch {}
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncFromLocal()
    }
    window.addEventListener('focus', syncFromLocal)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('robux:set', onRobuxSet as EventListener)
      window.removeEventListener('robux:add', onRobuxAdd as EventListener)
      window.removeEventListener('focus', syncFromLocal)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // === เมนู Robux (dropdown) ===
  const [openRobuxMenu, setOpenRobuxMenu] = useState(false)
  const robuxMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!robuxMenuRef.current) return
      if (!robuxMenuRef.current.contains(e.target as Node)) {
        setOpenRobuxMenu(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenRobuxMenu(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const dispatchRobuxAdd = (delta: number) => {
    window.dispatchEvent(new CustomEvent('robux:add', { detail: { delta } }))
  }
  const dispatchRobuxSet = (value: number) => {
    window.dispatchEvent(new CustomEvent('robux:set', { detail: { value } }))
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 relative">
        <Link href="/" className="font-extrabold tracking-tight text-white/90">
          Roblox Limited Shop
        </Link>

        {/* Search */}
        <div className="relative ml-auto hidden md:flex items-center gap-2 rounded-lg bg-white/5 px-3 ring-1 ring-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.48-5.34C15.21 5.01 12.2 2 8.6 2S2 5.01 2 8.39 5.01 14.78 8.6 14.78c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา item..."
            className="bg-transparent py-2 text-sm outline-none placeholder:text-white/40 w-44"
          />
          {query && (
            <div className="absolute top-full mt-1 w-72 bg-black/80 backdrop-blur border border-white/10 rounded-lg overflow-hidden shadow-lg">
              {loading ? (
                <p className="p-3 text-sm text-white/60">กำลังค้นหา...</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-white/60">ไม่พบผลลัพธ์</p>
              ) : (
                <ul>
                  {results.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/item/${item.id}`}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition"
                        onClick={() => setQuery('')}
                      >
                        <img src={item.image} alt={item.title} className="w-6 h-6 rounded object-cover" />
                        <span className="text-sm text-white/90 line-clamp-1">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Robux pill + เมนู */}
        <div className="relative" ref={robuxMenuRef}>
          <button
            title="Robux ของฉัน"
            onClick={() => setOpenRobuxMenu((v) => !v)}
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/20"
          >
            <img src="/icon/robux.svg" alt="Robux" className="w-4 h-4 opacity-90" />
            <span className="text-sm font-semibold tabular-nums">{robux.toLocaleString('th-TH')}</span>
            <span className="i-lucide-chevron-down ml-1 opacity-70" aria-hidden />
          </button>

          {openRobuxMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/10 bg-black/85 backdrop-blur shadow-xl overflow-hidden">
              <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">กระเป๋า Robux</div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/icon/robux.svg" alt="Robux" className="w-4 h-4 opacity-90" />
                  <span className="text-white font-semibold tabular-nums">{robux.toLocaleString('th-TH')}</span>
                </div>
                <button
                  onClick={() => dispatchRobuxAdd(100)}
                  className="text-[11px] px-2 py-1 rounded bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40 hover:bg-emerald-400/30"
                >
                  +100 (เร็ว)
                </button>
              </div>
              <div className="border-t border-white/10" />
              <ul className="p-1">
                <li>
                  <Link
                    href="/buy-robux"
                    onClick={() => setOpenRobuxMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-sm"
                  >
                    <span className="i-lucide-badge-dollar" aria-hidden />
                    ซื้อ Robux
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* User icon */}
        <button
          title="บัญชี (mock)"
          className="relative rounded-full size-9 grid place-items-center ring-1 ring-white/15 bg-white/10 hover:bg-white/20"
        >
          <span className="i-lucide-user text-white" aria-hidden />
          <span className="sr-only">User</span>
        </button>

        {/* Cart */}
        <div className="relative">
          <span
            key={plusOne}
            className="pointer-events-none absolute -right-1 -top-2 select-none text-[10px] font-bold text-emerald-300 opacity-0
                       animate-[popUp_600ms_ease-out_forwards]"
          >
            +1
          </span>

          <Link
            ref={cartRef}
            href="/cart"
            className={`relative rounded-full size-9 grid place-items-center ring-1 ring-white/15 bg-white/10 hover:bg-white/20 transition
            ${bump ? 'scale-105 shadow-[0_0_0_6px_rgba(34,197,94,0.22)]' : ''}`}
            aria-label="Cart"
          >
            <span className={`i-lucide-shopping-cart text-white ${bump ? 'animate-pulse' : ''}`} aria-hidden />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-cyan-400 text-black rounded-full px-1.5 py-[1px] ring-2 ring-black/40">
                {count}
              </span>
            )}
            <span className="sr-only">Cart</span>
            {bump && <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-cyan-400/40 blur-[2px]" />}
          </Link>
        </div>
      </div>
    </header>
  )
}
