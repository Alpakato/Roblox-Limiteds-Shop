'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '@/types/catalog'
import Link from 'next/link'
import { emitCartAdd } from '@/app/lib/flyToCart'
import { useRouter } from 'next/navigation'

const STORAGE_KEY_SESSION = 'special_offer_shown_v1'
const STORAGE_KEY_ENDAT   = 'special_offer_end_at_v1'

type Props = {
  items: Item[]
  openDelayMs?: number
  durationMs?: number
  discountPct?: number
  oncePerSession?: boolean
  exitIntentEnabled?: boolean
}

function mmss(msLeft: number) {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`
}

function seededPick<T>(arr: T[], seed = ''): T | null {
  if (!arr.length) return null
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h += 0x6D2B79F5
  const r = ((h ^ (h >>> 14)) >>> 0) / 4294967296
  return arr[Math.floor(r * arr.length)]
}

function parseNumericPrice(p?: string | number | null): number | null {
  if (p == null) return null
  if (typeof p === 'number' && isFinite(p)) return p
  const s = String(p).replace(/[^\d.]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** ---- แสดงราคา + ไอคอน Robux สีขาวนำหน้า ---- */
function PriceInline({
  amount,
  type = 'normal', // 'normal' | 'strike' | 'discounted'
}: {
  amount: number
  type?: 'normal' | 'strike' | 'discounted'
}) {
  const style =
    type === 'strike'
      ? 'text-white/40 text-[12px] leading-tight line-through'
      : type === 'discounted'
      ? 'text-cyan-200/90 text-sm font-semibold leading-tight'
      : 'text-white font-semibold text-base leading-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]'

  const iconSize = type === 'strike' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span className={`inline-flex items-center gap-1 align-middle ${style}`}>
      <img
        src="/icon/robux.svg"
        alt="Robux"
        className={`${iconSize} translate-y-[.5px] opacity-90 invert brightness-0`}
        aria-hidden
      />
      <span className="[font-variant-numeric:tabular-nums]">
        {amount.toLocaleString('th-TH')}
      </span>
    </span>
  )
}

export default function SpecialOfferPopup({
  items,
  openDelayMs = 8000,
  durationMs = 5 * 60 * 1000,
  discountPct = 35,
  oncePerSession = true,
  exitIntentEnabled = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [msLeft, setMsLeft] = useState(durationMs)
  const [item, setItem] = useState<Item | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()

  const pool = items
  const picked = useMemo(() => {
    const seed =
      typeof window !== 'undefined'
        ? location.pathname + '|' + new Date().toDateString()
        : 'seed'
    return seededPick(pool, seed)
  }, [pool])

  useEffect(() => {
    if (!pool.length) return

    const persistedEndAtRaw = localStorage.getItem(STORAGE_KEY_ENDAT)
    const persistedEndAt = persistedEndAtRaw ? Number(persistedEndAtRaw) : null
    const alreadyThisSession = sessionStorage.getItem(STORAGE_KEY_SESSION) === '1'

    if (persistedEndAt && Date.now() > persistedEndAt) {
      localStorage.removeItem(STORAGE_KEY_ENDAT)
    }

    const show = () => {
      if (oncePerSession && alreadyThisSession) return
      const chosen = picked ?? pool[0]
      setItem(chosen)

      const now = Date.now()
      const finalEndAt =
        persistedEndAt && persistedEndAt > now ? persistedEndAt : now + durationMs
      localStorage.setItem(STORAGE_KEY_ENDAT, String(finalEndAt))
      setEndAt(finalEndAt)

      setOpen(true)
      sessionStorage.setItem(STORAGE_KEY_SESSION, '1')
    }

    const t = setTimeout(show, openDelayMs)

    const onMouseLeave = (e: MouseEvent) => {
      if (!exitIntentEnabled) return
      if (e.clientY <= 0) {
        clearTimeout(t)
        show()
        window.removeEventListener('mouseout', onMouseLeave)
      }
    }
    if (exitIntentEnabled) window.addEventListener('mouseout', onMouseLeave)

    return () => {
      clearTimeout(t)
      if (exitIntentEnabled) window.removeEventListener('mouseout', onMouseLeave)
    }
  }, [pool, picked, openDelayMs, durationMs, oncePerSession, exitIntentEnabled])

  useEffect(() => {
    if (!endAt || !open) return
    const tick = () => {
      const left = endAt - Date.now()
      setMsLeft(left)
      if (left <= 0) {
        setOpen(false)
        localStorage.removeItem(STORAGE_KEY_ENDAT)
      }
    }
    const i = setInterval(tick, 250)
    tick()
    return () => clearInterval(i)
  }, [endAt, open])

  if (!open || !item) return null

  const origPrice = parseNumericPrice((item as any)?.price ?? (item as any)?.lowestPrice ?? null)
  const salePrice = origPrice != null ? Math.max(0, Math.round(origPrice * (1 - discountPct / 100))) : null

  // ✅ ไปหน้า /finish พร้อมตัด robux จาก localStorage ที่หน้า Finish
  const handleCheckoutNow = () => {
    const payPrice = (salePrice ?? origPrice ?? 0)
    const returnTo =
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
    const params = new URLSearchParams({
      id: item.id,
      name: item.title,
      price: String(payPrice),
      currency: 'R$',
      qty: '1',
      image: item.image || '',
      description: item.by ? `By ${item.by}` : '',
      robuxSpend: String(payPrice),
      returnTo,
    })
    try {
      emitCartAdd?.({ sourceEl: btnRef.current })
    } catch {}
    router.push(`/finish?${params.toString()}`)
  }

  const handleClose = () => setOpen(false)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* modal */}
      <div
        className="relative z-[121] w-[92%] max-w-[520px] rounded-2xl p-0 overflow-hidden
                   shadow-[0_0_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10
                   animate-[pop_0.18s_ease-out]"
        style={{
          background:
            'linear-gradient(160deg, rgba(16,185,129,0.08), rgba(59,130,246,0.06))',
        }}
      >
        {/* Header */}
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-500/15 via-teal-400/10 to-cyan-400/15 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 text-sm font-semibold uppercase tracking-wide">Special Offer</span>
            <span className="text-white/70 text-sm">ดีลพิเศษเฉพาะคุณ</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-white/90 bg-emerald-500/20 px-2 py-0.5 rounded">
              ⏳ เหลือ {mmss(msLeft)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex gap-4">
          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/30">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white font-bold line-clamp-2 leading-snug">{item.title}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full ring-1 ring-emerald-300/30 text-emerald-200 bg-emerald-400/10">
                พิเศษ {discountPct}% ภายใน 5 นาที
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full ring-1 ring-cyan-300/30 text-cyan-200 bg-cyan-400/10">
                จำกัดเวลา
              </span>
            </div>

            {/* ราคา (แบบมีไอคอน Robux) */}
            {origPrice != null ? (
              <div className="mt-2 flex items-baseline gap-2">
                <PriceInline amount={origPrice} type="strike" />
                <PriceInline amount={salePrice!} type="discounted" />
              </div>
            ) : (
              <div className="mt-2 text-white/70 text-sm">ดีลลด {discountPct}% • คงเหลือเวลา {mmss(msLeft)}</div>
            )}

            {/* ปุ่ม */}
            <div className="mt-3 flex gap-2">
              <button
                ref={btnRef}
                onClick={handleCheckoutNow}
                className="flex-1 rounded-xl px-4 py-2 font-semibold text-black
                           bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400
                           ring-1 ring-emerald-300/40 shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
                aria-label={`Checkout ${item.title} now`}
              >
                ซื้อทันที
              </button>
              <button
                onClick={handleClose}
                className="rounded-xl px-4 py-2 font-semibold text-white/90 hover:text-white
                           bg-white/5 ring-1 ring-white/10"
              >
                ไว้ก่อน
              </button>
            </div>

            <div className="mt-2 text-[11px] text-white/50">
              * เดโม: ไม่มีการชำระเงินจริง ข้อเสนอจะหมดอายุเมื่อหมดเวลา
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 -mt-2">
          <Link href={`/view/${encodeURIComponent(item.id)}`} className="text-xs text-white/60 hover:text-white">
            ดูรายละเอียดสินค้า →
          </Link>
        </div>
      </div>
    </div>
  )
}
