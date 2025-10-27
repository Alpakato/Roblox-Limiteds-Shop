// app/checkout/CheckoutClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function formatPrice(n: number) {
  try {
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  } catch {
    return String(n)
  }
}

// เดโม PromptPay
const DEMO_PROMPTPAY = '0812345678'
const DEMO_ACCOUNT_NAME = 'Panyakorn P.'

function buildDemoQRData(amount: number, orderId: string) {
  const payload = {
    type: 'PROMPTPAY_DEMO',
    promptpay: DEMO_PROMPTPAY,
    amount: amount.toFixed(2),
    orderId,
    note: 'DEMO ONLY - NOT A REAL PAYMENT',
  }
  return encodeURIComponent(JSON.stringify(payload))
}

type Props = {
  amount?: number
  rawParams?: { [key: string]: string | string[] | undefined }
}

type ProductParam = {
  id?: string
  name?: string
  price?: number
  currency?: string
  description?: string
  image?: string
  stock?: number
  model?: string
  qty?: number
}

export default function CheckoutClient({ amount, rawParams }: Props) {
  const router = useRouter()

  // --- helpers ---
  const getStr = (k: string) => {
    const v = rawParams?.[k]
    return Array.isArray(v) ? v[0] : v ?? undefined
  }
  const getNum = (k: string) => {
    const s = getStr(k)
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }

  // ดึงสินค้า/จำนวนจาก URL (เดโม)
  const product: ProductParam = useMemo(() => {
    if (!rawParams) return {}
    return {
      id: getStr('id'),
      name: getStr('name'),
      price: getNum('price'),
      currency: getStr('currency') ?? 'THB',
      description: getStr('description'),
      image: getStr('image'),
      stock: getNum('stock'),
      model: getStr('model'),
      qty: (() => {
        const q = Number(getStr('qty') ?? '1')
        return Number.isFinite(q) && q > 0 ? q : 1
      })(),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawParams)])

  const effectiveAmount = useMemo(() => {
    if (typeof amount === 'number') return amount
    if (product.price && product.qty) return Math.max(0, Math.round(product.price * product.qty * 100) / 100)
    return 0
  }, [amount, product.price, product.qty])

  // อ่านที่อยู่ที่บันทึกไว้ (เดโม)
  const [shippingInfo, setShippingInfo] = useState<any>(null)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('demo_shipping_info')
      if (raw) setShippingInfo(JSON.parse(raw))
    } catch {}
  }, [])

  // สร้างหมายเลขสั่งซื้อเดโม
  const orderId = useMemo(() => {
    const ts = Date.now().toString(36).toUpperCase()
    const r = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `PX-${ts}-${r}`
  }, [])

  // นับถอยหลัง 15 นาที
  const [remain, setRemain] = useState(15 * 60)
  useEffect(() => {
    const t = setInterval(() => setRemain((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = Math.floor(remain / 60).toString().padStart(2, '0')
  const ss = (remain % 60).toString().padStart(2, '0')

  const qrData = buildDemoQRData(effectiveAmount, orderId)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${qrData}`

  function copy(s: string) {
    try {
      navigator.clipboard.writeText(s)
    } catch {}
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-2 text-white/70 text-sm">
        <button
          className="underline hover:text-white/90"
          onClick={() => router.back()}
        >
          &larr; กลับตะกร้า
        </button>
      </div>

      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
        ชำระเงิน (เดโม)
      </h1>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        {/* ซ้าย: QR + คำแนะนำ */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
          <div className="flex items-start gap-5">
            <div className="shrink-0 rounded-xl ring-1 ring-white/10 bg-black/30 p-3">
              <img src={qrUrl} alt="QR เดโม" className="w-[280px] h-[280px]" />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold">สแกนจ่ายด้วย PromptPay (เดโม)</h2>
              <p className="text-sm text-white/70 mt-1">
                คำสั่งซื้อ: <span className="font-mono">{orderId}</span>
              </p>

              <p className="text-3xl font-extrabold mt-2">
                {formatPrice(effectiveAmount)} ฿
              </p>

              {/* สรุปรายการจากพารามิเตอร์ */}
              {(product.name || product.id) && (
                <div className="mt-4 rounded-lg bg-black/30 ring-1 ring-white/10 p-3">
                  <div className="flex gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name ?? product.id}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="text-sm">
                      <div className="font-semibold">
                        {product.name ?? product.id}
                      </div>
                      {product.model && (
                        <div className="text-white/70">รุ่น/โมเดล: {product.model}</div>
                      )}
                      <div className="text-white/70">
                        จำนวน: {product.qty ?? 1}
                        {product.price != null && (
                          <> · ราคา/ชิ้น: {formatPrice(product.price)} ฿</>
                        )}
                      </div>
                      {product.description && (
                        <div className="mt-1 text-xs text-white/60 line-clamp-2">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/60 w-36">หมายเลขพร้อมเพย์</span>
                  <span className="font-mono">{DEMO_PROMPTPAY}</span>
                  <button
                    onClick={() => copy(DEMO_PROMPTPAY)}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"
                  >
                    คัดลอก
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 w-36">ชื่อบัญชี</span>
                  <span>{DEMO_ACCOUNT_NAME}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 w-36">ยอดที่ต้องชำระ</span>
                  <span className="font-semibold">{formatPrice(effectiveAmount)} ฿</span>
                  <button
                    onClick={() => copy(effectiveAmount.toFixed(2))}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs"
                  >
                    คัดลอก
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 w-36">เวลาคงเหลือ</span>
                  <span className="font-mono">
                    {mm}:{ss}
                  </span>
                </div>
              </div>

              <div className="mt-5 text-xs text-white/60">
                * หน้านี้เป็นเดโม ไม่มีการรับ-ตรวจยอดเงินจริง ข้อมูลใน QR เป็นข้อความจำลอง
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  className="rounded-lg bg-emerald-500/90 px-4 py-2 font-bold text-black hover:bg-emerald-400"
                  onClick={() => router.push('/?paid=1')}
                >
                  ฉันชำระเงินแล้ว
                </button>
                <button
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                  onClick={() => router.push('/')}
                >
                  กลับหน้าแรก
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ขวา: ที่อยู่จัดส่งเดโม */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 h-fit">
          <h3 className="font-semibold mb-3">ที่อยู่จัดส่ง (เดโม)</h3>
          {shippingInfo ? (
            <div className="text-sm leading-6">
              <div className="font-semibold">{shippingInfo.fullName}</div>
              {shippingInfo.phone && <div>โทร: {shippingInfo.phone}</div>}
              {shippingInfo.email && <div>อีเมล: {shippingInfo.email}</div>}
              {(shippingInfo.address1 || shippingInfo.address2) && (
                <div className="mt-2">
                  {shippingInfo.address1}
                  <br />
                  {shippingInfo.address2}
                </div>
              )}
              {(shippingInfo.district ||
                shippingInfo.province ||
                shippingInfo.postcode) && (
                <div>
                  {shippingInfo.district} {shippingInfo.province}{' '}
                  {shippingInfo.postcode}
                </div>
              )}
              {shippingInfo.note && (
                <div className="mt-2 text-white/70">โน้ต: {shippingInfo.note}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-white/60">
              ยังไม่มีข้อมูล — กลับไปกรอกที่หน้าตะกร้า
            </div>
          )}

          <div className="mt-4">
            <button
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              onClick={() => router.push('/cart')}
            >
              แก้ไขที่อยู่
            </button>
          </div>

          <hr className="my-4 border-white/10" />

          <div className="text-xs text-white/60">
            หมายเหตุ: หน้านี้เป็นตัวอย่าง UX เท่านั้น หากต้องการจ่ายเงินจริง
            ควรสร้าง Payload QR มาตรฐาน EMVCo PromptPay และเชื่อมระบบตรวจสอบยอดกับธนาคาร/เกตเวย์
          </div>
        </div>
      </section>
    </main>
  )
}
