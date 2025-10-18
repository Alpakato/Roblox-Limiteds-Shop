'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface PurchasePoolItem {
  title: string
  image?: string
}

interface LivePurchaseToastsProps {
  /** แหล่งรายการสินค้าที่จะสุ่มชื่อ/รูป ไปโชว์ใน toast */
  pool: PurchasePoolItem[]
  /** ช่วงเวลาหน่วงสุ่ม (ms) ก่อนเด้ง toast ถัดไป */
  intervalRange?: [number, number]
  /** อายุ toast ก่อน auto-dismiss (ms) */
  lifetime?: number
  /** จำกัดจำนวน toast บนหน้าจอ */
  maxStack?: number
  /** หยุดนับอายุเมื่อ hover */
  pauseOnHover?: boolean
  className?: string
}

type ToastItem = {
  id: string
  userName: string
  itemTitle: string
  image?: string
  qty: number
  createdAt: number
  expiresAt: number
  paused?: boolean
}

const USERS = [
  'Panyakorn K.', 'Arthaphan C.', 'Alisha P.',
  'TK R.', 'JC W.', 'Hope T.', 'Perm S.',
]

export default function LivePurchaseToasts({
  pool,
  intervalRange = [3500, 9000],
  lifetime = 5200,
  maxStack = 4,
  pauseOnHover = true,
  className = '',
}: LivePurchaseToastsProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const safePool = useMemo(
    () => (pool && pool.length ? pool : [{ title: 'Classic Fedora', image: '/images/fedora.png' }]),
    [pool]
  )

  // สุ่มเด้ง toast ใหม่เรื่อย ๆ
  useEffect(() => {
    const schedule = () => {
      const delay = rand(intervalRange[0], intervalRange[1])
      timerRef.current = setTimeout(() => {
        setToasts(prev => {
          const t = makeRandomToast(safePool, lifetime)
          const next = [t, ...prev].slice(0, maxStack)
          return next
        })
        schedule()
      }, delay)
    }
    schedule()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [intervalRange, lifetime, maxStack, safePool])

  // นับอายุแล้วลบเอง
  useEffect(() => {
    const int = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => (t.paused ? true : now < t.expiresAt)))
    }, 250)
    return () => clearInterval(int)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <>
      <div
        className={[
          'fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col-reverse gap-2',
          className,
        ].join(' ')}
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            onMouseEnter={() => pauseOnHover && setToasts(prev => prev.map(x => x.id === t.id ? { ...x, paused: true } : x))}
            onMouseLeave={() => pauseOnHover && setToasts(prev => prev.map(x => x.id === t.id ? { ...x, paused: false } : x))}
            className="group animate-toast-in rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur hover:bg-black/80"
          >
            <div className="flex items-start gap-3">
              {/* รูปสินค้า */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-white/10">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt={t.itemTitle} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-white/70">IMG</div>
                )}
              </div>

              {/* ข้อความ */}
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <span className="font-semibold">{t.userName}</span>{' '}
                  เพิ่งซื้อ <span className="font-medium">{t.itemTitle}</span>{' '}
                  ×{t.qty}
                </div>
                <div className="mt-0.5 text-xs text-white/60">เมื่อสักครู่</div>
              </div>

              {/* ปิด */}
              <button
                onClick={() => remove(t.id)}
                className="ml-1 rounded-md p-1 text-white/60 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white/90"
                aria-label="ปิด"
                title="ปิด"
              >
                ✕
              </button>
            </div>

            {/* แถบ progress (นับอายุ) */}
            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-white/10">
              <div
                className="h-full animate-toast-progress bg-white/70"
                style={{ animationDuration: `${lifetime}ms` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* animations */}
      <style jsx global>{`
        @keyframes toastIn {
          0% { opacity: 0; transform: translateY(12px) scale(.98); }
          60% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 1; }
        }
        .animate-toast-in { animation: toastIn .35s ease-out both; }

        @keyframes toastProgress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0%); }
        }
        .animate-toast-progress {
          transform-origin: left;
          animation-name: toastProgress;
          animation-timing-function: linear;
          animation-fill-mode: both;
        }
      `}</style>
    </>
  )
}

function makeRandomToast(pool: PurchasePoolItem[], lifetime: number): ToastItem {
  const userName = USERS[Math.floor(Math.random() * USERS.length)]
  const it = pool[Math.floor(Math.random() * pool.length)]
  const qty = Math.random() < 0.75 ? 1 : Math.ceil(Math.random() * 3)
  const id = randId()
  const now = Date.now()
  return {
    id,
    userName,
    itemTitle: it.title,
    image: it.image,
    qty,
    createdAt: now,
    expiresAt: now + lifetime,
  }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}
