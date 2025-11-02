// components/FinishReceiptClient.tsx
'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  rawParams?: { [key: string]: string | string[] | undefined }
}

type ProductParam = {
  id?: string
  name?: string
  price?: number
  currency?: string
  description?: string
  image?: string
  qty?: number
}

function getFromRaw(rawParams: any, k: string) {
  if (!rawParams) return undefined
  if (typeof rawParams === 'object' && !Array.isArray(rawParams)) {
    const v = (rawParams as any)[k]
    return Array.isArray(v) ? v[0] : v
  }
  try {
    const val = (rawParams as any)?.value ?? rawParams
    if (typeof val === 'string') {
      const obj = JSON.parse(val)
      return obj?.[k]
    }
  } catch {}
  return undefined
}

function parseNum(s?: string | null) {
  if (s == null) return undefined
  const n = Number(String(s).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function formatBux(n: number) {
  try {
    return n.toLocaleString('en-US')
  } catch {
    return String(n)
  }
}

function RobuxIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M4 7.5 12 4l8 3.5V16.5L12 20 4 16.5V7.5Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M6 8.4 12 6l6 2.4v6.8L12 18l-6-2.8V8.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function FinishReceiptClient({ rawParams }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mountedRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  // อ่านค่าจาก URL/rawParams (ให้ URL ชนะก่อน)
  const getStr = useCallback((k: string) => {
    const fromUrl = searchParams?.get(k) ?? undefined
    if (typeof fromUrl === 'string' && fromUrl.trim() !== '') return fromUrl.trim()
    const v = getFromRaw(rawParams, k)
    return typeof v === 'string' ? v.trim() : (v as any) ?? undefined
  }, [searchParams, rawParams])

  const getNum = useCallback((k: string) => parseNum(getStr(k)), [getStr])

  const product: ProductParam = useMemo(() => {
    const qtyRaw = getStr('qty') ?? '1'
    const qty = (() => {
      const n = parseNum(qtyRaw) ?? 1
      return n > 0 ? Math.floor(n) : 1
    })()
    return {
      id: getStr('id'),
      name: getStr('name'),
      price: getNum('price'),
      currency: getStr('currency') ?? 'R$',
      description: getStr('description'),
      image: getStr('image'),
      qty,
    }
  // เมื่อ URL เปลี่ยนหรือ rawParams เปลี่ยน ให้รีคอมพิวต์
  }, [getStr, getNum])

  const unitPrice = product.price ?? 0
  const robuxSpend =
    getNum('robuxSpend') ??
    (unitPrice && product.qty ? Math.max(0, Math.round(unitPrice * product.qty)) : 0)

  const returnTo = getStr('returnTo') || '/'

  // โหลดยอด Robux ปัจจุบันจาก localStorage
  const readBalance = useCallback(() => {
    try {
      const raw = localStorage.getItem('robux')
      const cur = Number(raw ?? '0')
      setBalance(Number.isFinite(cur) ? cur : 0)
    } catch {
      setBalance(0)
    }
  }, [])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    readBalance()

    // ฟัง event-ต่าง ๆ เพื่ออัปเดต balance ให้สดเสมอ
    const onRobuxSet = (e: Event) => {
      const anyE = e as CustomEvent
      const v = Number(anyE?.detail?.value ?? NaN)
      if (Number.isFinite(v)) setBalance(v)
      else readBalance()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'robux') readBalance()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // ถ้าหน้าอื่นตั้งธงไว้ ให้ยิงซ้ำเพื่อซิงก์ Header
        try {
          const flag = localStorage.getItem('robux_needs_broadcast')
          if (flag === '1') {
            const v = Number(localStorage.getItem('robux') ?? '0')
            window.dispatchEvent(new CustomEvent('robux:set', { detail: { value: v } }))
            localStorage.removeItem('robux_needs_broadcast')
          }
        } catch {}
        readBalance()
      }
    }
    window.addEventListener('robux:set', onRobuxSet as any)
    window.addEventListener('storage', onStorage as any)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('robux:set', onRobuxSet as any)
      window.removeEventListener('storage', onStorage as any)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [readBalance])

  function setRobux(newVal: number) {
    try {
      localStorage.setItem('robux', String(newVal))
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('robux:set', { detail: { value: newVal } }))
      })
      localStorage.setItem('robux_needs_broadcast', '1')
    } catch {}
  }

  const onConfirmPurchase = useCallback(async () => {
    setError(null)
    if (busy) return
    setBusy(true)

    try {
      const raw = localStorage.getItem('robux')
      const cur = Number(raw ?? '0')
      const safeCur = Number.isFinite(cur) ? cur : 0

      const cost = Math.max(0, robuxSpend ?? 0)
      if (cost <= 0) {
        setError('ไม่พบจำนวน Robux ที่ต้องหัก')
        setBusy(false)
        return
      }

      if (safeCur < cost) {
        setError(`ยอด Robux ไม่พอ (มี ${formatBux(safeCur)}, ต้องใช้ ${formatBux(cost)})`)
        setBusy(false)
        return
      }

      const next = safeCur - cost
      setRobux(next)

      // เด้งกลับพร้อมค่าบอกผลลัพธ์
      const u = new URL(returnTo, window.location.origin)
      u.searchParams.set('paid', '1')
      u.searchParams.set('spent', String(cost))
      const url = u.pathname + u.search

      // เว้นจังหวะนิดให้แอนิเมชันกดปุ่ม/คลื่นปุ่มรู้สึกได้
      setTimeout(() => {
        try {
          const v = Number(localStorage.getItem('robux') ?? '0')
          window.dispatchEvent(new CustomEvent('robux:set', { detail: { value: v } }))
          localStorage.removeItem('robux_needs_broadcast')
        } catch {}
        router.push(url)
      }, 200)
    } catch {
      setError('เกิดข้อผิดพลาดระหว่างยืนยันการซื้อ')
      setBusy(false)
    }
  }, [busy, robuxSpend, returnTo, router])

  // ชอร์ตคัต: Enter = ยืนยัน, Esc = ย้อนกลับ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirmPurchase()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        router.back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirmPurchase, router])

  const insuff = balance != null && robuxSpend > (balance ?? 0)
  const afterCut = balance != null ? Math.max(0, balance - (robuxSpend ?? 0)) : null

  // ไม่มีสินค้าก็ส่งกลับหน้าแรก + UI แนะนำ
  if (!product.name && !product.id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold">ไม่มีข้อมูลสินค้า</h1>
        <p className="text-white/70 mt-2">กรุณากลับไปเลือกสินค้าจากหน้าแรก</p>
        <button
          className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          onClick={() => router.push('/')}
        >
          กลับหน้าแรก
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-white/70 text-sm">
        <button
          className="underline hover:text-white/90"
          onClick={() => router.back()}
          aria-label="ย้อนกลับ"
        >
          &larr; ย้อนกลับ
        </button>
        <span className="px-2 text-white/30">/</span>
        <span className="text-white/60">ยืนยันการซื้อ</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30 px-2 py-0.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
          DEMO MODE
        </span>
      </div>

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">ยืนยันการซื้อ</h1>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        {/* ซ้าย: รายละเอียดสินค้า */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 relative overflow-hidden">
          {/* แสงเงาเบา ๆ */}
          <div className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-30 blur-3xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-fuchsia-500/10" />

          <div className="relative flex gap-4">
            {product.image ? (
              <div className="relative">
                <div className="absolute -inset-[2px] rounded-xl  from-emerald-400/40 via-cyan-400/40 to-fuchsia-400/40 blur-[6px]" />
                <img
                  src={product.image}
                  alt={product.name ?? product.id}
                  className="relative w-24 h-24 rounded-lg object-cover ring-1 ring-white/10"
                />
              </div>
            ) : null}

            <div className="flex-1">
              <div className="text-lg font-semibold text-white/90">
                {product.name ?? product.id}
              </div>
              {product.description && (
                <div className="text-sm text-white/70 mt-1 line-clamp-2">
                  {product.description}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-1">
                  จำนวน:
                  <span className="font-semibold text-white/90">{product.qty ?? 1}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  ราคา/ชิ้น:
                  <span className="font-semibold text-white/90">
                    {product.price != null ? `${formatBux(product.price)} ${product.currency}` : '-'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <hr className="my-5 border-white/10" />

          <div className="relative grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/70">รวมที่ต้องชำระ</span>
              <span className="font-bold flex items-center gap-1.5">
                <RobuxIcon className="w-4 h-4 text-emerald-300" />
                {formatBux(robuxSpend ?? 0)} {product.currency}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/70">ยอด Robux ปัจจุบัน</span>
              <span className="font-mono">
                {balance == null ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-20 rounded bg-white/10 animate-pulse" />
                  </span>
                ) : (
                  formatBux(balance)
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/70">ยอดหลังตัด</span>
              <span
                className={
                  'font-mono ' +
                  (insuff ? 'text-rose-300 font-semibold' : 'text-white')
                }
              >
                {afterCut == null ? '-' : formatBux(afterCut)}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-500/15 text-rose-200 px-3 py-2 text-sm ring-1 ring-rose-400/30">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              className={
                'rounded-lg px-4 py-2 font-bold text-black transition ' +
                (insuff
                  ? 'bg-rose-400/90 hover:bg-rose-300'
                  : 'bg-emerald-500/90 hover:bg-emerald-400') +
                (busy ? ' opacity-70' : '')
              }
              onClick={onConfirmPurchase}
              disabled={busy}
              aria-disabled={busy}
            >
              {busy ? 'กำลังยืนยัน…' : insuff ? 'เติม Robux ก่อน' : 'ยืนยันการซื้อ'}
            </button>
            <button
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              onClick={() => router.push('/')}
            >
              กลับหน้าแรก
            </button>

            <div className="ml-auto inline-flex items-center gap-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10">Enter</kbd>
                ยืนยัน
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10">Esc</kbd>
                ย้อนกลับ
              </span>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/60">
            * เดโม: ตัดยอดจาก <code>localStorage.robux</code> เท่านั้น ไม่มีการเรียกเกตเวย์จ่ายเงินจริง
          </div>
        </div>

        {/* ขวา: ใบสรุปย่อ (receipt card) */}
        <aside className="lg:sticky lg:top-6 h-fit">
          <div className="rounded-2xl bg-gradient-to-br from-white/5 via-white/5 to-white/10 ring-1 ring-white/10 p-5 relative overflow-hidden">
            <div className="pointer-events-none absolute -inset-1 blur-2xl opacity-20 bg-[radial-gradient(ellipse_at_top,theme(colors.emerald.500/40),transparent_60%),radial-gradient(ellipse_at_bottom,theme(colors.cyan.500/40),transparent_60%)]" />
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
                <RobuxIcon className="w-3.5 h-3.5 text-emerald-300" />
              </span>
              สรุปคำสั่งซื้อ
            </h3>

            <div className="text-sm leading-6 relative">
              <div className="flex justify-between">
                <span className="text-white/70">สินค้า</span>
                <span className="text-right max-w-[60%] line-clamp-2">
                  {product.name ?? product.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">จำนวน</span>
                <span>{product.qty ?? 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">รวม</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <RobuxIcon className="w-4 h-4 text-emerald-300" />
                  {formatBux(robuxSpend ?? 0)} {product.currency}
                </span>
              </div>
              {balance != null && (
                <div className="mt-2 rounded-lg bg-black/20 ring-1 ring-white/10 px-3 py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">คงเหลือก่อนตัด</span>
                    <span className="font-mono">{formatBux(balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">จะตัดออก</span>
                    <span className="font-mono">-{formatBux(robuxSpend ?? 0)}</span>
                  </div>
                  <div className="mt-1 h-[1px] bg-white/10" />
                  <div className="mt-1 flex justify-between">
                    <span className="text-white/60">คงเหลือหลังตัด</span>
                    <span className={'font-mono ' + (insuff ? 'text-rose-300 font-semibold' : '')}>
                      {formatBux(afterCut ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <hr className="my-4 border-white/10" />

            <p className="text-xs text-white/60">
              หลังยืนยัน ระบบจะหัก Robux จากยอดคงเหลือและพาคุณกลับหน้าเดิมด้วยพารามิเตอร์{' '}
              <code>?paid=1&spent=...</code>
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}
