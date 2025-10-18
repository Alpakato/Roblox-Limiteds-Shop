'use client'

import { useMemo, useState } from 'react'
import ProductRow from '@/components/ProductRow'
import { useCatalog } from './hooks/useCatalog'
import LivePurchaseToasts from '@/components/LivePurchaseToasts'

export default function Page() {
  const [q, setQ] = useState('')
  const { data, roblox, ugc, loading, error } = useCatalog(q)

  const visibleRoblox = useMemo(() => roblox, [roblox])
  const visibleUGC = useMemo(() => ugc, [ugc])

  // ข้อมูล mock สำหรับโชว์ “คนซื้อของจริงๆ” แบบ social proof
  const toastPool = useMemo(() => {
    const r = (data?.robloxLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    const u = (data?.ugcLimiteds ?? []).map((i: any) => ({ title: i.title, image: i.image }))
    return [...r, ...u]
  }, [data])

  return (
    <main>
      {/* Hero Section */}
      <section className="relative h-[220px] md:h-[280px] lg:h-[320px] overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#0b1220]">
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto w-full max-w-7xl px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow">
            Roblox Catalog
          </h1>
          <p className="mt-1 text-white/70">Demo shop • ไม่มีการชำระเงินจริง</p>
        </div>
      </section>

      {/* แสดง popup มีคนซื้อของ (Fake Live Purchase) */}
      <LivePurchaseToasts
        pool={toastPool}
        intervalRange={[3000, 8000]}
        lifetime={5200}
        maxStack={4}
      />

      {/* ส่วนรายการสินค้า */}
      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        {!loading && !error && (
          <>
            <ProductRow
              title="New Roblox Limiteds"
              items={visibleRoblox}
              viewAllHref="/view-all?cat=roblox"
            />
            <ProductRow
              title="New UGC Limiteds"
              items={visibleUGC}
              viewAllHref="/view-all?cat=ugc"
            />
          </>
        )}
      </section>
    </main>
  )
}
