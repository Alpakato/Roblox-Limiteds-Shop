'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export default function BuyRobuxSuccessClient() {
  const sp = useSearchParams()

  const robux = useMemo(() => {
    const n = Number(sp.get('robux') ?? '0')
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [sp])

  const [justAdded, setJustAdded] = useState(0)
  useEffect(() => setJustAdded(robux), [robux])

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-center">
      <div className="text-2xl font-extrabold text-white">สำเร็จ!</div>
      <p className="mt-2 text-white/70">
        เติม Robux เรียบร้อยแล้ว
        {justAdded ? ` +${justAdded.toLocaleString('th-TH')} Robux` : ''} (เดโม)
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-500/90 px-4 py-2 font-bold text-black hover:bg-emerald-400"
        >
          กลับหน้าแรก
        </Link>
        <Link
          href="/buy-robux"
          className="rounded-lg bg-white/10 px-4 py-2 text-white/90 ring-1 ring-white/15 hover:bg-white/20"
        >
          ซื้อเพิ่ม
        </Link>
      </div>

      <p className="mt-6 text-xs text-white/60">
        * เดโม: หากต้องการเชื่อมจ่ายเงินจริง ควรผูก EMVCo PromptPay + webhook ตรวจยอดจากเกตเวย์
      </p>
    </main>
  )
}
