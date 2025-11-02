'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Plan = {
  id: string
  title: string
  robux: number
  priceTHB: number
  badge?: 'HOT' | 'BEST' | 'NEW' | 'SALE'
  desc?: string
  strikePriceTHB?: number // ถ้ามีจะแสดงราคาเดิมเพื่อให้เห็นส่วนลด
  bonusRobux?: number // Robux แถมพิเศษ
}

const PLANS: Plan[] = [
  { id: 'r250',  title: 'Starter',          robux: 250,  priceTHB: 49,  desc: 'เริ่มแบบเบา ๆ' },
  { id: 'r400',  title: 'Value',            robux: 400,  priceTHB: 79,  badge: 'SALE', strikePriceTHB: 99, desc: 'โปรลดพิเศษ' },
  { id: 'r800',  title: 'Popular',          robux: 800,  priceTHB: 149, badge: 'BEST', desc: 'คุ้มสุดยอดนิยม' },
  { id: 'r1200', title: 'Weekend Double',   robux: 1200, priceTHB: 199, badge: 'HOT',  bonusRobux: 200, desc: 'เสาร์-อาทิตย์รับโบนัสเพิ่ม' },
  { id: 'r1700', title: 'Pro',              robux: 1700, priceTHB: 299 },
  { id: 'r2500', title: 'Streamer Pack',    robux: 2500, priceTHB: 429, desc: 'เหมาะกับสายแต่งจัดเต็ม' },
  { id: 'r4500', title: 'Mega Bundle',      robux: 4500, priceTHB: 749, bonusRobux: 500, desc: 'แถมโบนัส 500 Robux' },
  { id: 'r7000', title: 'Ultimate',         robux: 7000, priceTHB: 1090, badge: 'NEW', desc: 'แพ็กใหม่จัดหนัก' },
]

function formatTHB(n: number) {
  try {
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })
  } catch {
    return String(n)
  }
}

export default function BuyRobuxPage() {
  const router = useRouter()

  const goCheckout = (p: Plan) => {
    const totalRobux = p.robux + (p.bonusRobux ?? 0)
    // ส่งพารามิเตอร์ไปหน้า checkout เพื่อให้มี QR เหมือน CheckoutClient
    // และส่ง robuxDelta + returnTo เพื่อให้กดยืนยันแล้วเด้งกลับ + เพิ่ม Robux อัตโนมัติ
    const params = new URLSearchParams({
      id: p.id,
      name: `${p.title} — ${totalRobux} Robux`,
      price: String(p.priceTHB),
      currency: 'THB',
      description: p.desc ?? `${p.title} pack`,
      image: '/icon/robux.svg',
      qty: '1',
      robuxDelta: String(totalRobux),
      returnTo: '/buy-robux/success',
    })
    router.push(`/checkout?${params.toString()}`)
  }

  const promoNote = useMemo(() => {
    const anyBonus = PLANS.some((p) => p.bonusRobux)
    const anyStrike = PLANS.some((p) => p.strikePriceTHB)
    if (anyBonus && anyStrike) return 'โปรฯ วันนี้: บางแพ็กมีส่วนลดและโบนัส Robux เพิ่ม!'
    if (anyBonus) return 'โปรฯ วันนี้: บางแพ็กมีโบนัส Robux เพิ่ม!'
    if (anyStrike) return 'โปรฯ วันนี้: บางแพ็กราคาโปร!'
    return ''
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-white/90">ซื้อ Robux</h1>
      <p className="mt-1 text-white/60">เลือกแพ็ก/โปรโมชันที่ต้องการ แล้วไปหน้าชำระเงิน (เดโม) เพื่อสร้าง QR</p>
      {promoNote && <div className="mt-2 text-emerald-200 text-sm">{promoNote}</div>}

      {/* โปรพิเศษแสดงด้านบน */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const totalRobux = p.robux + (p.bonusRobux ?? 0)
          const hasDiscount = typeof p.strikePriceTHB === 'number' && p.strikePriceTHB > p.priceTHB
          const discountPct = hasDiscount
            ? Math.round((1 - p.priceTHB / (p.strikePriceTHB as number)) * 100)
            : 0

          return (
            <div
              key={p.id}
              className={`relative rounded-2xl p-4 ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition`}
            >
              {p.badge && (
                <span className="absolute -top-2 right-3 text-[10px] px-2 py-1 rounded bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40">
                  {p.badge}
                </span>
              )}
              <div className="flex items-center gap-2">
                <img src="/icon/robux.svg" alt="Robux" className="w-5 h-5 opacity-90" />
                <div className="text-lg font-bold text-white">{formatTHB(totalRobux)} Robux</div>
              </div>
              {p.bonusRobux ? (
                <div className="mt-1 text-[11px] rounded px-2 py-0.5 bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/30 inline-block">
                  +โบนัส {formatTHB(p.bonusRobux)} Robux
                </div>
              ) : null}
              {p.desc && <div className="mt-2 text-white/70 text-sm">{p.desc}</div>}

              <div className="mt-3 flex items-end gap-2">
                {hasDiscount && (
                  <div className="text-white/40 text-sm line-through">{formatTHB(p.strikePriceTHB as number)} ฿</div>
                )}
                <div className="text-2xl font-extrabold text-white">{formatTHB(p.priceTHB)} ฿</div>
                {hasDiscount && (
                  <div className="text-[11px] px-2 py-0.5 rounded bg-rose-400/20 text-rose-200 ring-1 ring-rose-400/30">
                    -{discountPct}%
                  </div>
                )}
              </div>

              <button
                onClick={() => goCheckout(p)}
                className="mt-4 w-full rounded-lg bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-400/40 py-2 hover:bg-emerald-400/30 font-semibold"
              >
                ซื้อแพ็กนี้
              </button>
            </div>
          )
        })}
      </div>

      {/* หมายเหตุเดโม */}
      <p className="mt-6 text-xs text-white/60">
        * หน้านี้เป็นเดโม: เมื่อชำระเงินจากหน้า Checkout แล้วกดยืนยัน ระบบจะเพิ่ม Robux ตามแพ็กให้อัตโนมัติและพากลับมาหน้า success
      </p>
    </div>
  )
}
