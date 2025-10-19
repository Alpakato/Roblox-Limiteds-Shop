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
      // อย่า return cleanup จากใน handler (ไม่มีคนเรียก) ให้จัดด้านนอกแทน
      void t
    }
    document.addEventListener('cart:add', onAdd as EventListener)
    return () => document.removeEventListener('cart:add', onAdd as EventListener)
  }, [])

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
          {/* +1 bubble */}
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
