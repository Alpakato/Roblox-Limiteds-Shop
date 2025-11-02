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
    <main
      className="
        mx-auto max-w-lg
        px-4 sm:px-6
        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
        py-8 sm:py-12
        text-center
      "
    >
      <div className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
        สำเร็จ!
      </div>

      <p className="mt-2 text-sm sm:text-base text-white/80">
        เติม Robux เรียบร้อยแล้ว
        {justAdded ? (
          <strong className="ml-1 text-white">
            +{justAdded.toLocaleString('th-TH')} Robux
          </strong>
        ) : (
          ''
        )}{' '}
        (เดโม)
      </p>

      <div
        className="
          mt-6
          flex flex-col sm:flex-row
          justify-center
          gap-2 sm:gap-3
        "
      >
        <Link
          href="/"
          className="
            w-full sm:w-auto
            rounded-lg
            bg-emerald-500/90
            px-4 py-3
            font-bold text-black
            hover:bg-emerald-400
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300
            active:translate-y-[1px]
            transition
          "
        >
          กลับหน้าแรก
        </Link>

        <Link
          href="/buy-robux"
          className="
            w-full sm:w-auto
            rounded-lg
            bg-white/10
            px-4 py-3
            text-white/90
            ring-1 ring-white/15
            hover:bg-white/20
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            active:translate-y-[1px]
            transition
          "
        >
          ซื้อเพิ่ม
        </Link>
      </div>

      <p className="mt-6 text-[11px] sm:text-xs text-white/60 leading-relaxed">
        * เดโม: หากต้องการเชื่อมจ่ายเงินจริง ควรผูก EMVCo PromptPay + webhook ตรวจยอดจากเกตเวย์
      </p>
    </main>
  )
}
