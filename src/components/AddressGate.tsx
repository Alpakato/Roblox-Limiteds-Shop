'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Address = {
  fullName: string
  phone: string
  address1: string
  address2?: string
  subdistrict?: string
  district?: string
  province?: string
  postcode: string
}

const STORAGE_KEY = 'userAddress:v1'
const SEEN_KEY = 'addressGate:completed:v1'

function validatePhoneTH(v: string) {
  const s = v.replace(/\D/g, '')
  // เบอร์ไทย 09/08/06-xxxxxxx รวม 10 หลัก
  return /^0[689]\d{8}$/.test(s)
}

function validatePostcodeTH(v: string) {
  return /^\d{5}$/.test(v.trim())
}

export default function AddressGate({
  forceFirstVisit = true,
  allowEditButton = true,
  zIndex = 60,      // z-ชั้นของ dialog (สูงกว่า HeroScene/Toasts)
}: {
  forceFirstVisit?: boolean
  allowEditButton?: boolean
  zIndex?: number
}) {
  const [open, setOpen] = useState<boolean>(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addr, setAddr] = useState<Address>({
    fullName: '',
    phone: '',
    address1: '',
    address2: '',
    subdistrict: '',
    district: '',
    province: '',
    postcode: '',
  })

  const loadedOnce = useRef(false)

  // โหลดจาก localStorage
  useEffect(() => {
    if (loadedOnce.current) return
    loadedOnce.current = true

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Address
        setAddr(parsed)
      }

      const completed = localStorage.getItem(SEEN_KEY)
      if (forceFirstVisit) {
        // ถ้ายังไม่เคยกรอก เปิด dialog
        setOpen(!completed)
      } else {
        // โหมดไม่บังคับ: เปิดเฉพาะยังไม่เคยกรอก
        setOpen(!completed && !saved)
      }
    } catch {
      setOpen(true)
    }
  }, [forceFirstVisit])

  // lock scroll หน้าเว็บตอนเปิด
  useEffect(() => {
    const prev = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = prev || ''
    return () => { document.body.style.overflow = prev || '' }
  }, [open])

  const isValid = useMemo(() => {
    if (!addr.fullName.trim()) return false
    if (!validatePhoneTH(addr.phone)) return false
    if (!addr.address1.trim()) return false
    if (!validatePostcodeTH(addr.postcode)) return false
    // จังหวัด/อำเภอ/ตำบลให้เป็นออปชัน (หลายร้านจะให้กรอกทีหลังหรือ Auto-complete)
    return true
  }, [addr])

  function onSave() {
    setError(null)
    if (!isValid) {
      setError('กรุณากรอกข้อมูลให้ถูกต้องครบถ้วน')
      return
    }
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addr))
      localStorage.setItem(SEEN_KEY, '1')
      setOpen(false)
    } catch (e: any) {
      setError(e?.message ?? 'บันทึกล้มเหลว')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ปุ่มลอยแก้ไขที่อยู่ภายหลัง */}
      {allowEditButton && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-[70] rounded-full px-4 py-2 text-sm font-medium bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20 backdrop-blur"
          title="แก้ไขที่อยู่จัดส่ง"
        >
          แก้ไขที่อยู่
        </button>
      )}

      {!open ? null : (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex }}
          aria-modal
          role="dialog"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div className="relative w-[92vw] max-w-xl rounded-2xl bg-[#0f172a] text-white shadow-2xl ring-1 ring-white/10">
            <div className="p-5 border-b border-white/10">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">
                กรอกที่อยู่จัดส่ง
              </h2>
              <p className="mt-1 text-white/70 text-sm">
                เพื่อคำนวณค่าจัดส่งและแสดงโปรโมชั่นที่เกี่ยวข้องกับพื้นที่ของคุณ
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 gap-3">
              <label className="text-sm">
                ชื่อ-นามสกุล
                <input
                  className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                  value={addr.fullName}
                  onChange={(e) => setAddr({ ...addr, fullName: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  autoFocus
                />
              </label>

              <label className="text-sm">
                เบอร์โทรศัพท์ (มือถือ)
                <input
                  className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                  value={addr.phone}
                  onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                  placeholder="0XXXXXXXXX"
                  inputMode="tel"
                />
                <span className="mt-1 block text-xs text-white/50">
                  รูปแบบที่รองรับ: 0[6/8/9] ตามด้วย 8 หลัก (รวม 10 หลัก)
                </span>
              </label>

              <label className="text-sm">
                ที่อยู่ (บ้านเลขที่, ซอย, ถนน)
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                  value={addr.address1}
                  onChange={(e) => setAddr({ ...addr, address1: e.target.value })}
                  placeholder="บ้านเลขที่ หมู่/ซอย ถนน"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm">
                  ตำบล/แขวง (ออปชัน)
                  <input
                    className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                    value={addr.subdistrict ?? ''}
                    onChange={(e) => setAddr({ ...addr, subdistrict: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  อำเภอ/เขต (ออปชัน)
                  <input
                    className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                    value={addr.district ?? ''}
                    onChange={(e) => setAddr({ ...addr, district: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm">
                  จังหวัด (ออปชัน)
                  <input
                    className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                    value={addr.province ?? ''}
                    onChange={(e) => setAddr({ ...addr, province: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  รหัสไปรษณีย์
                  <input
                    className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-cyan-400/60"
                    value={addr.postcode}
                    onChange={(e) => setAddr({ ...addr, postcode: e.target.value })}
                    placeholder="10110"
                    inputMode="numeric"
                  />
                </label>
              </div>

              {error && (
                <div className="mt-1 text-sm text-red-300">{error}</div>
              )}
            </div>

            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              <button
                className="rounded-lg px-3 py-2 text-sm bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20"
                onClick={() => {
                  // ไม่อนุญาตปิดถ้า forceFirstVisit และยังไม่ valid
                  if (forceFirstVisit && !isValid) {
                    setError('ต้องกรอกข้อมูลขั้นต่ำก่อน: ชื่อ, เบอร์โทร, ที่อยู่, รหัสไปรษณีย์')
                    return
                  }
                  setOpen(false)
                }}
              >
                ภายหลัง
              </button>
              <button
                onClick={onSave}
                disabled={!isValid || saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-cyan-500/90 hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก…' : 'บันทึกที่อยู่'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
