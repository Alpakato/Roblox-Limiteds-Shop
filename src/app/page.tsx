// src/app/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import ProductRow from '@/components/ProductRow'
import { useCatalog } from './hooks/useCatalog'
import LivePurchaseToasts from '@/components/LivePurchaseToasts'
import HeroScene from '@/components/HeroScene'
import CookieConsent from '@/components/CookieConsent'
import Footer from '@/components/Footer'
import AutoAddressGate from '@/components/AutoAddressGate'
import LocationBadge from '@/components/LocationBadge'
import { useSearchParams } from 'next/navigation'

// แยกเป็น HomeClient: ส่วนที่ใช้ useSearchParams() และ state ฝั่ง client
function HomeClient() {
  const [q, setQ] = useState('')
  const { data, roblox, ugc, loading, error } = useCatalog(q)

  const visibleRoblox = useMemo(() => roblox, [roblox])
  const visibleUGC = useMemo(() => ugc, [ugc])

  const toastPool = useMemo(() => {
    const r = (data?.robloxLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    const u = (data?.ugcLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    return [...r, ...u]
  }, [data])

  // --- แก้ useSearchParams ให้ใช้ภายใน Suspense boundary ---
  const params = useSearchParams()
  const paid = params.get('paid')
  const [showThanks, setShowThanks] = useState(false)

  useEffect(() => {
    if (paid === '1') {
      setShowThanks(true)
      const t = setTimeout(() => setShowThanks(false), 2000)
      return () => clearTimeout(t)
    }
  }, [paid])

  return (
    <main>
      {showThanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="relative px-8 py-6 rounded-2xl text-center text-white font-semibold text-lg shadow-2xl 
                       bg-gradient-to-br from-emerald-400/90 via-emerald-500/80 to-teal-500/90
                       ring-1 ring-white/20 backdrop-blur-xl animate-fade-in-up"
            style={{
              boxShadow:
                '0 0 40px 10px rgba(16, 185, 129, 0.4), 0 0 80px 30px rgba(6, 182, 212, 0.2)',
            }}
          >
            <div className="text-4xl mb-2">🌟</div>
            <div>ขอบคุณที่ชำระเงินเรียบร้อยแล้ว!</div>
            <div className="mt-1 text-sm opacity-80 font-normal">
              ระบบได้บันทึกคำสั่งซื้อของคุณ (เดโม)
            </div>
          </div>
        </div>
      )}

      {/* ดึงที่อยู่อัตโนมัติจากเบราว์เซอร์ */}
      <AutoAddressGate autoStart zIndex={90} />

      {/* Badge แสดงที่อยู่ + แหล่งที่มา */}
      <LocationBadge />

      {/* Cookie Consent */}
      <CookieConsent
        forceBlocking
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

      {/* HERO + สินค้า + Footer */}
      <section className="relative h-[220px] md:h-[280px] lg:h-[320px] overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0b1220]">
        <HeroScene count={10} speed={0.6} spreadX={5} spreadY={0.52} radius={0.5} softness={0.32} parallax={0.12} />
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto w-full max-w-7xl px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow">Roblox Catalog</h1>
          <p className="mt-1 text-white/70">Demo shop • ไม่มีการชำระเงินจริง</p>
        </div>
      </section>

      <LivePurchaseToasts
        pool={toastPool}
        intervalRange={[7000, 12000]}
        frenzy
        frenzyLevel={8}
        burstChance={0.2}
        burstSizeRange={[1, 2]}
        burstStagger={[120, 200]}
        lifetime={5200}
        maxStack={3}
        shaky={false}
        soundUrl="/sound/ding.mp3"
        soundVolume={0.12}
      />

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

// Page: ครอบ HomeClient ด้วย Suspense เพื่อให้ผ่านข้อกำหนดของ useSearchParams()
export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  )
}
