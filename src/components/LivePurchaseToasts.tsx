'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface PurchasePoolItem {
  title: string
  image?: string
}

interface LivePurchaseToastsProps {
  pool: PurchasePoolItem[]
  intervalRange?: [number, number]
  lifetime?: number
  maxStack?: number
  pauseOnHover?: boolean
  className?: string

  /** เปิดโหมดคลั่งซื้อ */
  frenzy?: boolean
  /** 1–10 ยิ่งสูงยิ่งเด้งถี่/เป็นชุดใหญ่ */
  frenzyLevel?: number
  /** โอกาสเกิด burst ต่อรอบ scheduler (0–1) */
  burstChance?: number
  /** จำนวนใบใน 1 burst (min,max) */
  burstSizeRange?: [number, number]
  /** หน่วงระหว่างใบใน burst (ms) */
  burstStagger?: [number, number]
  /** สุ่มสั่น/เขย่า */
  shaky?: boolean
  /** เปิดเสียงติ๊งเบา ๆ (ใส่ไฟล์เองถ้าต้องการ) */
  soundUrl?: string
  soundVolume?: number
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
  // เพิ่มสีสัน
  flair: {
    device?: string
    city?: string
    copy: string
    shake?: boolean
    xJitter?: number // px
  }
}

const USERS = [
  'Panyakorn K.', 'Arthaphan C.', 'Alisha P.',
  'TK R.', 'JC W.', 'Hope T.', 'Perm S.',
  'Mint S.', 'Beam T.', 'Nate R.', 'Yui L.'
]

const DEVICES = ['📱 iPhone', '📱 Android', '💻 Windows', '💻 macOS', '📟 iPad', '🖥️ iMac']
const CITIES = ['Bangkok', 'Chiang Mai', 'Khon Kaen', 'Hat Yai', 'Phuket', 'Rayong', 'Udon', 'Pattaya']
const COPIES = [
  'เพิ่งเช็คเอาท์', 'ชิงซื้อทันที!', 'Flash Deal สำเร็จ', 'กดซื้อทันเวลา',
  'ฉกของทันที', 'ได้คิวซื้อแล้ว', 'เพิ่งจ่ายเสร็จ', 'สอยเรียบ!'
]

export default function LivePurchaseToasts({
  pool,
  intervalRange = [3500, 9000],
  lifetime = 5200,
  maxStack = 6,
  pauseOnHover = true,
  className = '',
  frenzy = false,
  frenzyLevel = 7,
  burstChance = 0.55,
  burstSizeRange = [2, 5],
  burstStagger = [60, 160],
  shaky = true,
  soundUrl,
  soundVolume = 0.25
}: LivePurchaseToastsProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const safePool = useMemo(
    () => (pool && pool.length ? pool : [{ title: 'Classic Fedora', image: '/images/fedora.png' }]),
    [pool]
  )

  // เตรียมเสียงติ๊ง (ถ้ามี)
  useEffect(() => {
    if (!soundUrl) return
    const a = new Audio(soundUrl)
    a.volume = soundVolume
    audioRef.current = a
  }, [soundUrl, soundVolume])

  // Scheduler: เด้งแบบปกติหรือ Frenzy (burst)
  useEffect(() => {
    let cancelled = false

    const schedule = () => {
      // ปรับ interval ตามโหมด frenzy
      const lvl = clamp(frenzyLevel, 1, 10)
      const scale = frenzy
        ? Math.max(0.15, 1 - lvl * 0.085) // level สูง = ถี่ขึ้น
        : 1
      const baseMin = Math.max(500, Math.floor(intervalRange[0] * scale))
      const baseMax = Math.max(baseMin + 300, Math.floor(intervalRange[1] * scale))
      const delay = rand(baseMin, baseMax)

      timerRef.current = setTimeout(async () => {
        if (cancelled) return

        if (frenzy && Math.random() < burstChance) {
          // ยิงเป็นชุด (burst)
          const [bMin, bMax] = burstSizeRange
          const size = rand(bMin, bMax + Math.floor(lvl / 2))
          const [sMin, sMax] = burstStagger
          for (let i = 0; i < size; i++) {
            pushOne()
            // เล่นเสียงเบา ๆ
            if (audioRef.current) {
              try { audioRef.current.currentTime = 0; audioRef.current.play() } catch {}
            }
            await tinyWait(rand(sMin, sMax))
            if (cancelled) break
          }
        } else {
          // ปกติทีละใบ
          pushOne()
          if (audioRef.current) {
            try { audioRef.current.currentTime = 0; audioRef.current.play() } catch {}
          }
        }

        schedule()
      }, delay)
    }

    const pushOne = () => {
      setToasts(prev => {
        const t = makeRandomToast(safePool, lifetime, shaky)
        const next = [t, ...prev].slice(0, maxStack)
        return next
      })
    }

    schedule()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [
    intervalRange, lifetime, maxStack, safePool,
    frenzy, frenzyLevel, burstChance, burstSizeRange, burstStagger, shaky
  ])

  // Auto-dismiss (เว้นไว้ให้ hover หยุด)
  useEffect(() => {
    const int = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => (t.paused ? true : now < t.expiresAt)))
    }, 200)
    return () => clearInterval(int)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <>
      <div
        className={[
          'fixed bottom-4 right-4 z-50 flex w-[min(92vw,420px)] flex-col-reverse gap-2',
          className,
        ].join(' ')}
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            onMouseEnter={() => pauseOnHover && setToasts(prev => prev.map(x => x.id === t.id ? { ...x, paused: true } : x))}
            onMouseLeave={() => pauseOnHover && setToasts(prev => prev.map(x => x.id === t.id ? { ...x, paused: false } : x))}
            className={[
              'group animate-toast-in rounded-xl border border-white/10 bg-black/75 px-3 py-2.5 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur',
              t.flair.shake ? 'will-change-transform animate-toast-shake' : '',
            ].join(' ')}
            style={{ transform: `translateX(${t.flair.xJitter ?? 0}px)` }}
          >
            <div className="flex items-start gap-3">
              {/* รูปสินค้า */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-inset ring-white/10">
                {t.image ? (
                  <img src={t.image} alt={t.itemTitle} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-white/70">IMG</div>
                )}
              </div>

              {/* ข้อความ */}
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <span className="font-semibold">{t.userName}</span>{' '}
                  <span className="text-white/80">{t.flair.copy}</span>{' '}
                  <span className="font-medium">{t.itemTitle}</span>{' '}
                  ×{t.qty}
                </div>
                <div className="mt-0.5 text-[12px] text-white/60">
                  {t.flair.city && <span className="mr-2">📍 {t.flair.city}</span>}
                  {t.flair.device && <span className="mr-2">· {t.flair.device}</span>}
                  <span>เมื่อสักครู่</span>
                </div>
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

            {/* แถบ progress */}
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
          0% { opacity: 0; transform: translateY(14px) scale(.98); }
          60% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 1; }
        }
        .animate-toast-in { animation: toastIn .28s ease-out both; }

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

        @keyframes toastShake {
          0% { transform: translateX(-1px) rotate(0deg); }
          25% { transform: translateX(1px) rotate(0.2deg); }
          50% { transform: translateX(-1px) rotate(0deg); }
          75% { transform: translateX(1px) rotate(-0.2deg); }
          100% { transform: translateX(0) rotate(0); }
        }
        .animate-toast-shake {
          animation: toastShake .45s ease-in-out both;
        }
      `}</style>
    </>
  )
}

/* ---------------- helpers ---------------- */

function makeRandomToast(pool: PurchasePoolItem[], lifetime: number, shaky: boolean): ToastItem {
  const userName = pick(USERS)
  const it = pick(pool)
  const qtyBias = Math.random()
  const qty =
    qtyBias < 0.6 ? 1 :
    qtyBias < 0.9 ? rand(2, 3) :
    rand(4, 6) // โหมดคลั่งมีโอกาสจำนวนเยอะ
  const id = randId()
  const now = Date.now()

  const flair = {
    device: maybe(0.75) ? pick(DEVICES) : undefined,
    city: maybe(0.7) ? pick(CITIES) : undefined,
    copy: pick(COPIES),
    shake: shaky && maybe(0.5),
    xJitter: maybe(0.65) ? rand(-6, 10) : 0
  }

  return {
    id,
    userName,
    itemTitle: it.title,
    image: it.image,
    qty,
    createdAt: now,
    expiresAt: now + lifetime,
    flair
  }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function maybe(p = 0.5) { return Math.random() < p }
function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)) }
function tinyWait(ms: number) { return new Promise(res => setTimeout(res, ms)) }
