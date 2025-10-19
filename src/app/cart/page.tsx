'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '@/app/context/CartContext'
import CartItemRow from '@/components/CartItemRow'

type ShippingInfo = {
  fullName: string
  email: string
  phone: string
  address1: string
  address2: string
  district: string
  province: string
  postcode: string
  note?: string
}

export default function CartPage() {
  // ต้องมี add(...) ใน CartContext เพื่อรองรับเพิ่มโปรโมชันลงตะกร้า
  const { state, subtotal, clear, add } = useCart() as any

  // --- ค่าธรรมเนียม/ภาษี ---
  const shipping = state.lines.length ? 0 : 0
  const websiteFee = subtotal * 0.1
  const systemFee = subtotal * 0.05
  const teaFee = 15
  const maintenanceFee = 9.99
  const vat = (subtotal + websiteFee + systemFee) * 0.07
  const total = subtotal + shipping + websiteFee + systemFee + teaFee + maintenanceFee + vat

  // --- Address state + บังคับ dialog ---
  const [info, setInfo] = useState<ShippingInfo>({
    fullName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    district: '',
    province: '',
    postcode: '',
    note: '',
  })
  const [saved, setSaved] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)

  useEffect(() => {
    // ถ้ามีสินค้าและยังไม่บันทึกที่อยู่ => บังคับเปิด Dialog ที่อยู่
    if (state?.lines?.length > 0 && !saved) {
      setAddressOpen(true)
    }
  }, [state?.lines?.length, saved])

  // เปิดโปรโมชันทันทีหลังบันทึกที่อยู่
  useEffect(() => {
    if (saved) {
      setPromoOpen(true)
    }
  }, [saved])

  // --- โปรโมชัน mock ---
  const promoItems = useMemo(
    () => [
      { id: 'promo-stickerpack', title: 'Sticker Pack (Mock)', by: 'ROBLOX', price: 29, image: 'https://picsum.photos/seed/rblx-sticker/200/200' },
      { id: 'promo-vipbadge', title: 'VIP Badge 7 วัน (Mock)', by: 'UGC', price: 59, image: 'https://picsum.photos/seed/rblx-vip/200/200' },
      { id: 'promo-boost', title: 'Boost x2 24 ชม. (Mock)', by: 'ROBLOX', price: 49, image: 'https://picsum.photos/seed/rblx-boost/200/200' },
      { id: 'promo-swordskin', title: 'Sword Skin (Mock)', by: 'UGC', price: 79, image: 'https://picsum.photos/seed/rblx-sword/200/200' },
    ],
    []
  )

  function addPromoToCart(item: any) {
    if (typeof add === 'function') {
      add({ id: item.id, title: item.title, price: item.price, qty: 1, image: item.image, by: item.by })
    } else {
      window.location.href = '/view-all'
    }
  }

  // --- Utils ตรวจฟอร์ม ---
  function isEmailValid(email: string) { return /^\S+@\S+\.\S+$/.test(email) }
  function isPostcodeValid(p: string) { return /^[0-9]{5}$/.test(p || '') }
  function isPhoneValid(p: string) { return /^[0-9+\-()\s]{8,}$/.test(p || '') }
  const canSave =
    info.fullName.trim() &&
    isEmailValid(info.email) &&
    isPhoneValid(info.phone) &&
    info.address1.trim() &&
    info.district.trim() &&
    info.province.trim() &&
    isPostcodeValid(info.postcode)

  function handleChange<K extends keyof ShippingInfo>(key: K, val: ShippingInfo[K]) {
    setInfo((s) => ({ ...s, [key]: val }))
    if (saved) setSaved(false)
  }

  function saveShippingInfo() {
    if (!canSave) return
    setSaved(true)
    setAddressOpen(false)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">ตะกร้าสินค้า</h1>

      {state.lines.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="text-white/70">ยังไม่มีสินค้าในตะกร้า</p>
          <Link href="/view-all" className="mt-3 inline-block rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 ring-1 ring-white/15">
            เลือกดูสินค้า →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          {/* ซ้าย: รายการสินค้า */}
          <section className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            {state.lines.map((l: any) => <CartItemRow key={l.id} line={l} />)}
          </section>

          {/* ขวา: สรุป */}
          <aside className="space-y-6">
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 h-fit">
              <h2 className="font-semibold mb-3">สรุปยอด</h2>
              <div className="space-y-2 text-sm">
                <Row label="ยอดสินค้า">{formatPrice(subtotal)}</Row>
                <Row label="ค่าจัดส่ง">{formatPrice(shipping)}</Row>
                <Row label="ค่าบำรุงเว็บไซต์ (10%)">{formatPrice(websiteFee)}</Row>
                <Row label="ค่าธรรมเนียมระบบ (5%)">{formatPrice(systemFee)}</Row>
                <Row label="ค่าชงชาให้ Dev">{formatPrice(teaFee)}</Row>
                <Row label="ค่าดูแลแม่บ้าน">{formatPrice(maintenanceFee)}</Row>
                <Row label="ภาษีมูลค่าเพิ่ม (7%)">{formatPrice(vat)}</Row>
                <hr className="border-white/10 my-2" />
                <Row label="รวมทั้งหมด" strong>{formatPrice(total)}</Row>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  onClick={() => setPromoOpen(true)}
                  className="w-full rounded-lg bg-amber-400/90 px-4 py-2 font-bold text-black hover:bg-amber-300"
                >
                  🎁 โปรโมชันแนะนำ
                </button>
                <button
                  className="w-full rounded-lg bg-emerald-500/90 px-4 py-2 font-bold text-black hover:bg-emerald-400 disabled:opacity-50"
                  disabled={!saved}
                  onClick={() => alert('ชำระเงิน (mock) สำเร็จ!')}
                >
                  ชำระเงิน (mock)
                </button>
                <button onClick={() => clear()} className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                  ล้างตะกร้า
                </button>
                <p className="mt-1 text-[11px] text-white/50 leading-tight">
                  Demo only • ไม่มีการชำระเงินจริง
                </p>
                {!saved && (
                  <p className="text-[11px] text-amber-300">
                    * กรุณากรอกที่อยู่ในแบบฟอร์ม (Dialog) ให้ครบเพื่อเปิดใช้งานปุ่มชำระเงิน
                  </p>
                )}
              </div>
            </div>

            {/* ปุ่มเปิด Address Dialog เผื่อผู้ใช้ปิดไปแล้วอยากแก้ไข */}
            <button
              onClick={() => setAddressOpen(true)}
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              แก้ไขที่อยู่จัดส่ง
            </button>
          </aside>
        </div>
      )}

      {/* Address Dialog (บังคับ) */}
      {addressOpen && (
        <ModalBackdrop blockInteraction>
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0b1220] ring-1 ring-white/10 shadow-xl">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-lg font-bold">กรอกที่อยู่สำหรับจัดส่ง</h3>
              <p className="text-xs text-white/60 mt-1">กรอกให้ครบถ้วนเพื่อเปิดใช้งานการชำระเงิน (mock)</p>
            </div>

            <div className="p-4 grid grid-cols-1 gap-3">
              <Input label="ชื่อ-นามสกุล" value={info.fullName} onChange={(v) => handleChange('fullName', v)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="อีเมล" value={info.email} onChange={(v) => handleChange('email', v)} error={!!info.email && !isEmailValid(info.email)} helper="เราจะส่งสรุปคำสั่งซื้อ (mock) ไปที่อีเมลนี้" />
                <Input label="เบอร์ติดต่อ" value={info.phone} onChange={(v) => handleChange('phone', v)} error={!!info.phone && !isPhoneValid(info.phone)} />
              </div>
              <Input label="ที่อยู่ (บรรทัดที่ 1)" value={info.address1} onChange={(v) => handleChange('address1', v)} />
              <Input label="ที่อยู่ (บรรทัดที่ 2) — ไม่บังคับ" value={info.address2} onChange={(v) => handleChange('address2', v)} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="แขวง/ตำบล" value={info.district} onChange={(v) => handleChange('district', v)} />
                <Input label="เขต/อำเภอ / จังหวัด" value={info.province} onChange={(v) => handleChange('province', v)} />
                <Input label="รหัสไปรษณีย์" value={info.postcode} onChange={(v) => handleChange('postcode', v)} error={!!info.postcode && !isPostcodeValid(info.postcode)} />
              </div>
              <TextArea label="โน้ตถึงไรเดอร์ (ไม่บังคับ)" value={info.note || ''} onChange={(v) => handleChange('note', v)} />

              <div className="mt-1 flex items-center gap-2">
                <button
                  className="rounded-lg bg-cyan-500/90 px-4 py-2 font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
                  onClick={saveShippingInfo}
                  disabled={!canSave}
                >
                  บันทึกที่อยู่
                </button>
                {!canSave && <span className="text-xs text-white/60">กรอกข้อมูลที่จำเป็นให้ครบก่อน</span>}
              </div>
            </div>

            {/* ไม่มีปุ่มปิด เพื่อ “บังคับ” ให้กรอก/บันทึกก่อน */}
          </div>
        </ModalBackdrop>
      )}

      {/* Promotion Dialog */}
      {promoOpen && (
        <ModalBackdrop onClose={() => setPromoOpen(false)}>
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#0b1220] ring-1 ring-white/10 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-lg font-bold">🎁 โปรโมชันแนะนำ</h3>
              <button className="rounded-md bg-white/10 px-2 py-1 text-sm hover:bg-white/20" onClick={() => setPromoOpen(false)}>ปิด</button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {promoItems.map((it) => (
                <div key={it.id} className="rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10">
                  <div className="aspect-square overflow-hidden bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image} alt={it.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold">{it.title}</div>
                    <div className="text-xs text-white/60">{it.by}</div>
                    <div className="mt-1 text-sm">{formatPrice(it.price)} ฿</div>
                    <button
                      className="mt-2 w-full rounded-lg bg-amber-400/90 px-3 py-1.5 text-sm font-bold text-black hover:bg-amber-300"
                      onClick={() => addPromoToCart(it)}
                    >
                      เพิ่มลงตะกร้า
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 text-xs text-white/60">
              สินค้าโปรโมชันเป็น mock เพื่อความสนุกในการเดโม
            </div>
          </div>
        </ModalBackdrop>
      )}
    </main>
  )
}

/* ----------------- Reusable UI ----------------- */

function ModalBackdrop({
  children,
  onClose,
  blockInteraction,
}: {
  children: React.ReactNode
  onClose?: () => void
  blockInteraction?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !blockInteraction && onClose?.()}
      />
      <div className="relative">{children}</div>
    </div>
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
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
  } catch {
    return String(n)
  }
}

function Input({
  label,
  value,
  onChange,
  error,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: boolean
  helper?: string
}) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 focus:outline-none ${
          error ? 'ring-red-500/60' : 'ring-white/10 focus:ring-cyan-400/60'
        }`}
      />
      {helper && <div className="text-[11px] text-white/50 mt-1">{helper}</div>}
      {error && <div className="text-[11px] text-red-400 mt-1">กรุณากรอกข้อมูลให้ถูกต้อง</div>}
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-cyan-400/60 min-h-[80px]"
      />
    </label>
  )
}
