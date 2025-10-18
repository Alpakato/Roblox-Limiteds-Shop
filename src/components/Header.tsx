'use client'

import Link from 'next/link'
import { useCart } from '@/app/context/CartContext'

export default function Header() {
  const { count } = useCart()

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-extrabold tracking-tight text-white/90">
          PIXEL CATALOG
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {/* Search (mock) */}
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-white/5 px-3 ring-1 ring-white/10">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              className="opacity-70"
            >
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.48-5.34C15.21 5.01 12.2 2 8.6 2S2 5.01 2 8.39 5.01 14.78 8.6 14.78c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19z"
              />
            </svg>
            <input
              placeholder="ค้นหา… (mock)"
              className="bg-transparent py-2 text-sm outline-none placeholder:text-white/40 w-44"
            />
          </div>

          {/* User icon (mock) */}
          <button
            title="บัญชี (mock)"
            className="relative rounded-full size-9 grid place-items-center ring-1 ring-white/15 bg-white/10 hover:bg-white/20"
          >
            <span className="i-lucide-user text-white" aria-hidden />
            <span className="sr-only">User</span>
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative rounded-full size-9 grid place-items-center ring-1 ring-white/15 bg-white/10 hover:bg-white/20"
          >
            <span className="i-lucide-shopping-cart text-white" aria-hidden />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-cyan-400 text-black rounded-full px-1.5 py-[1px] ring-2 ring-black/40">
                {count}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
