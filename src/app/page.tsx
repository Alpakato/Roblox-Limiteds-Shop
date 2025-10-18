// app/page.tsx
'use client'

import { useMemo, useState } from 'react'
import ProductRow from '@/components/ProductRow'
import { useCatalog } from './hooks/useCatalog'
import { Category } from '@/types/catalog'
import LivePurchaseToasts from '@/components/LivePurchaseToasts'
import HeroScene from '@/components/HeroScene'

export default function Page() {
  const [q, setQ] = useState('')
  const { data, categories, roblox, ugc, loading, error } = useCatalog(q)
  const [active, setActive] = useState<string>(categories[0]?.key ?? 'all')

  const visibleRoblox = useMemo(() => roblox, [roblox])
  const visibleUGC = useMemo(() => ugc, [ugc])

  // ✅ สร้าง pool สำหรับ toast จาก data จริง (ใช้ฟิลด์ image)
  const toastPool = useMemo(() => {
    const r = (data?.robloxLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    const u = (data?.ugcLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    return [...r, ...u]
  }, [data])

  return (
    <main>
    <section className="relative h-[220px] md:h-[280px] lg:h-[320px] overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0b1220]">
  {/* 1) grid เบา ๆ */}
  <div
    aria-hidden
    className="absolute inset-0 opacity-[0.08]"
    style={{
      backgroundImage:
        'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
      backgroundSize: '24px 24px, 24px 24px',
      maskImage:
        'radial-gradient(120% 60% at 50% 40%, black 40%, transparent 70%)',
    }}
  />

  {/* 2) ไฮไลต์เฉียง (glass gloss) */}
  <div
    aria-hidden
    className="absolute -top-1/2 left-0 h-[200%] w-[140%] -rotate-[18deg] opacity-20"
    style={{
      background:
        'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.25) 12%, rgba(255,255,255,0.1) 28%, transparent 40%)',
      filter: 'blur(12px)',
    }}
  />

  {/* 3) ก้อนแสงเบลอเคลื่อนช้า ๆ */}
  <div className="pointer-events-none absolute inset-0">
    <div
      className="absolute -left-24 top-8 h-56 w-56 rounded-full blur-3xl opacity-50 animate-float-slow"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 50%, #2563eb 0%, transparent 70%)',
      }}
    />
    <div
      className="absolute right-0 -bottom-16 h-72 w-72 rounded-full blur-3xl opacity-50 animate-float-slower"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 50%, #ef4444 0%, transparent 70%)',
      }}
    />
    <div
      className="absolute left-1/2 top-1/3 h-32 w-96 -translate-x-1/2 rounded-full blur-2xl opacity-40 animate-breathe"
      style={{ background: 'linear-gradient(90deg, #60a5fa, #f87171)' }}
    />
  </div>

  {/* 4) ไล่สีทึบด้านล่างเพื่อคอนทราสต์ตัวหนังสือ */}
  <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-black/10 to-black/35" />

  {/* 5) ข้อความ */}
  <div className="absolute inset-x-0 bottom-6 z-20 mx-auto w-full max-w-7xl px-4">
    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow">
      Roblox Catalog
    </h1>
    <p className="mt-1 text-white/70">Demo shop • ไม่มีการชำระเงินจริง</p>
  </div>


</section>

   

      {/* ✅ วาง Toasts มุมขวาล่างของจอ */}
      <LivePurchaseToasts
        pool={toastPool}
        intervalRange={[3000, 8000]}
        lifetime={5200}
        maxStack={4}
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* category chips */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {(categories.length ? categories : [{ key: 'all', label: 'All' } as Category]).map(c => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition
              ${active === c.key
                ? 'bg-white/15 ring-white/30 text-white'
                : 'bg-white/5 ring-white/10 text-white/80 hover:bg-white/10'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* search */}
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/10 focus-within:ring-white/20">
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.48-5.34C15.21 5.01 12.2 2 8.6 2S2 5.01 2 8.39 5.01 14.78 8.6 14.78c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zM8.6 13C6.02 13 4 10.98 4 8.39S6.02 3.78 8.6 3.78s4.6 2.02 4.6 4.61S11.18 13 8.6 13z"/></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชิ้นงาน / ไอเทม…"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/40"
            />
          </div>
        </div>

        {/* states */}
        {loading && <div className="mt-6 text-white/70">กำลังโหลดรายการ…</div>}
        {error && <div className="mt-6 text-red-300">โหลดข้อมูลไม่สำเร็จ: {error}</div>}

        {/* rows */}
        {!loading && !error && (
          <>
            <ProductRow title="New Roblox Limiteds" items={visibleRoblox} />
            <ProductRow title="New UGC Limiteds" items={visibleUGC} />
          </>
        )}

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          Demo only • รูปใน <code>/public/images</code> หรือ URL ตรงจาก <code>items.json</code> • ข้อมูลมาจาก <code>/public/data/items.json</code>
        </footer>
      </section>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  )
}
