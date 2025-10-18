'use client'

import Link from 'next/link'
import { useCart } from '@/app/context/CartContext'
import CartItemRow from '@/components/CartItemRow'

export default function CartPage() {
  const { state, subtotal, clear } = useCart()
  const shipping = state.lines.length ? 0 : 0
  const total = subtotal + shipping

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">ตะกร้าสินค้า</h1>

      {state.lines.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="text-white/70">ยังไม่มีสินค้าในตะกร้า</p>
          <Link
            href="/view-all"
            className="mt-3 inline-block rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 ring-1 ring-white/15"
          >
            เลือกดูสินค้า →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr,320px]">
          <section className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            {state.lines.map((l) => (
              <CartItemRow key={l.id} line={l} />
            ))}
          </section>

          <aside className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 h-fit">
            <h2 className="font-semibold mb-3">สรุปยอด</h2>

            <div className="space-y-2 text-sm">
              <Row label="ยอดชำระ">{formatPrice(subtotal)}</Row>
              <Row label="ค่าจัดส่ง">{formatPrice(shipping)}</Row>
              <hr className="border-white/10 my-2" />
              <Row label="รวมทั้งหมด" strong>
                {formatPrice(total)}
              </Row>
            </div>

            <button className="mt-4 w-full rounded-lg bg-emerald-500/90 px-4 py-2 font-bold text-black hover:bg-emerald-400">
              ชำระเงิน (mock)
            </button>
            <button
              onClick={() => clear()}
              className="mt-2 w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              ล้างตะกร้า
            </button>
            <p className="mt-2 text-[11px] text-white/50">
              Demo only • ไม่มีการชำระเงินจริง
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}

function Row({
  label,
  strong,
  children,
}: {
  label: string
  strong?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-white/60">{label}</div>
      <div className={strong ? 'font-semibold' : ''}>{children}</div>
    </div>
  )
}

function formatPrice(n: number) {
  try {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
  } catch {
    return String(n)
  }
}
