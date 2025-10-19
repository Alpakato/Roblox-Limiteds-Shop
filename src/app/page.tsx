'use client'

import { useMemo, useState } from 'react'
import ProductRow from '@/components/ProductRow'
import { useCatalog } from './hooks/useCatalog'
import LivePurchaseToasts from '@/components/LivePurchaseToasts'
import HeroScene from '@/components/HeroScene'
import CookieConsent from '@/components/CookieConsent'
import Footer from '@/components/Footer'
import AutoAddressGate from '@/components/AutoAddressGate'
import LocationBadge from '@/components/LocationBadge'   // ✅ เพิ่ม

export default function Page() {
  const [q, setQ] = useState('')
  const { data, roblox, ugc, loading, error } = useCatalog(q)

  const visibleRoblox = useMemo(() => roblox, [roblox])
  const visibleUGC = useMemo(() => ugc, [ugc])

  const toastPool = useMemo(() => {
    const r = (data?.robloxLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    const u = (data?.ugcLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    return [...r, ...u]
  }, [data])

  return (
    <main>
      {/* ดึงที่อยู่อัตโนมัติจากเบราว์เซอร์ */}
      <AutoAddressGate autoStart zIndex={90} />

      {/* Badge แสดงที่อยู่ + แหล่งที่มา */}
      <LocationBadge />

      {/* Cookie Consent */}
      <CookieConsent
        forceBlocking={true}
        darkPattern
        defaultNonEssentialOn
        delayMs={1200}
        nagEveryMs={15000}
        softBlock
        askEveryVisit
        reaskIntervalMs={0}
        consentVersion="v1"
        reaskOnRouteChange={false}
      />

      {/* HERO + สินค้า + Footer (เหมือนเดิม) */}
      <section className="relative h-[220px] md:h-[280px] lg:h-[320px] overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0b1220]">
        <HeroScene count={10} speed={0.6} spreadX={5} spreadY={0.52} radius={0.50} softness={0.32} parallax={0.12} />
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto w-full max-w-7xl px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow">Roblox Catalog</h1>
          <p className="mt-1 text-white/70">Demo shop • ไม่มีการชำระเงินจริง</p>
        </div>
      </section>

      <LivePurchaseToasts pool={toastPool} intervalRange={[3000, 8000]} lifetime={5200} maxStack={4} />

      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        {!loading && !error && (
          <>
            <ProductRow title="New Roblox Limiteds" items={visibleRoblox} viewAllHref="/view-all?cat=roblox" />
            <ProductRow title="New UGC Limiteds" items={visibleUGC} viewAllHref="/view-all?cat=ugc" />
          </>
        )}
        {loading && <div className="text-center text-white/60 py-8">Loading...</div>}
        {error && <div className="text-center text-red-400 py-8">❌ Failed to load catalog: {error}</div>}
      </section>

      <Footer />
    </main>
  )
}
