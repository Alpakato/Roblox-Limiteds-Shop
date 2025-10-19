'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getCookie, setCookie } from '@/app/lib/cookie'

type ConsentPrefs = {
  essential: boolean
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const COOKIE_KEY = 'cc_prefs'
const VERSION_KEY = 'cc_version'

function defaultPrefs(nonEssentialOn = false): ConsentPrefs {
  return {
    essential: true,
    analytics: nonEssentialOn,
    marketing: nonEssentialOn,
    timestamp: new Date().toISOString(),
  }
}

function parsePrefs(s: string | null): ConsentPrefs | null {
  if (!s) return null
  try {
    const obj = JSON.parse(s) as ConsentPrefs
    if (typeof obj.essential !== 'boolean') return null
    if (typeof obj.analytics !== 'boolean') return null
    if (typeof obj.marketing !== 'boolean') return null
    return obj
  } catch {
    return null
  }
}

function announceConsent(p: ConsentPrefs) {
  try {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (typeof gtag === 'function') {
        // @ts-ignore
        gtag('consent', 'update', {
          analytics_storage: p.analytics ? 'granted' : 'denied',
          ad_storage: p.marketing ? 'granted' : 'denied',
        })
      }
      // @ts-ignore
      if (Array.isArray(window.dataLayer)) {
        // @ts-ignore
        window.dataLayer.push({ event: 'consent_update', consent: p })
      }
    }
  } catch {}
}

function savePrefs(p: ConsentPrefs) {
  const value = JSON.stringify(p)
  setCookie(COOKIE_KEY, value, 180)
  try { localStorage.setItem(COOKIE_KEY, value) } catch {}
  announceConsent(p)
}

export default function CookieConsent({
  forceBlocking = false,        // เต็มจอ
  darkPattern = true,           // ปรับ UI ให้เด่นทาง "ยอมรับ"
  defaultNonEssentialOn = true, // เปิด analytics/marketing ไว้ล่วงหน้า (เฉพาะใน Settings)
  delayMs = 1200,               // ดีเลย์ก่อนโผล่
  nagEveryMs = 15000,           // ชิป nag ถ้ายังไม่ยอมรับ
  softBlock = true,             // ล็อกสกอร์ลเมื่อแบนเนอร์เปิด
  askEveryVisit = false,        // ถามทุกครั้งที่เข้าเพจ
  reaskIntervalMs = 0,          // เว้นช่วงถามซ้ำ (0=ปิด)
  consentVersion,               // เปลี่ยนเวอร์ชันแล้วให้ถามใหม่
  reaskOnRouteChange = false,   // เปลี่ยนหน้าแล้วถามใหม่
}: {
  forceBlocking?: boolean
  darkPattern?: boolean
  defaultNonEssentialOn?: boolean
  delayMs?: number
  nagEveryMs?: number
  softBlock?: boolean
  askEveryVisit?: boolean
  reaskIntervalMs?: number
  consentVersion?: string
  reaskOnRouteChange?: boolean
}) {
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState<ConsentPrefs>(defaultPrefs(defaultNonEssentialOn))
  const [confirmReject, setConfirmReject] = useState(false)
  const [nagVisible, setNagVisible] = useState(false)
  const [hasConsent, setHasConsent] = useState(false)

  const timerRef = useRef<number | null>(null)
  const shownRef = useRef(false)

  // ล็อกสกอร์ลเมื่อเปิดแบนเนอร์ (soft block)
  useEffect(() => {
    if (!softBlock) return
    if (open) {
      const orig = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => { document.documentElement.style.overflow = orig }
    }
  }, [open, softBlock])

  // ตัดสินใจว่าจะถามไหม + โชว์แบบดีเลย์/ตาม interaction
  useEffect(() => {
    const fromCookie = parsePrefs(getCookie(COOKIE_KEY))
    const fromLS = (() => {
      try { return parsePrefs(localStorage.getItem(COOKIE_KEY)) } catch { return null }
    })()
    const picked = fromCookie ?? fromLS

    // เงื่อนไขถามซ้ำ
    const shouldReaskByInterval = (() => {
      if (!reaskIntervalMs || !picked) return false
      const last = new Date(picked.timestamp).getTime()
      return Date.now() - last > reaskIntervalMs
    })()

    const shouldReaskByVersion = (() => {
      if (!consentVersion) return false
      try {
        const v = localStorage.getItem(VERSION_KEY)
        return v !== consentVersion
      } catch { return false }
    })()

    const mustAskNow = askEveryVisit || !picked || shouldReaskByInterval || shouldReaskByVersion

    if (picked) {
      setPrefs(picked)
      setHasConsent(true)
      announceConsent(picked) // ประกาศทุกครั้งที่เข้า แม้ไม่โชว์แบนเนอร์
    } else {
      setHasConsent(false)
    }

    if (mustAskNow) {
      // โชว์เมื่อมี interaction (scroll/move) หรือหลัง delay
      const show = () => {
        if (shownRef.current) return
        shownRef.current = true
        setTimeout(() => setOpen(true), delayMs)
      }
      const onScroll = () => show()
      const onMove = () => show()
      window.addEventListener('scroll', onScroll, { once: true, passive: true })
      window.addEventListener('mousemove', onMove, { once: true })
      const fallback = window.setTimeout(show, delayMs + 600)
      if (consentVersion) {
        try { localStorage.setItem(VERSION_KEY, consentVersion) } catch {}
      }
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('mousemove', onMove)
        clearTimeout(fallback)
      }
    } else {
      setOpen(false)
      shownRef.current = true
    }
  }, [askEveryVisit, reaskIntervalMs, consentVersion, delayMs])

  // ถ้าเปิด reaskOnRouteChange และยังไม่มี consent ให้ถามใหม่เมื่อเปลี่ยนหน้า
  useEffect(() => {
    if (!reaskOnRouteChange) return
    if (!hasConsent) return
    setOpen(true)
  }, [reaskOnRouteChange, pathname, hasConsent])
useEffect(() => {
  function onOpen() {
    setOpen(true)
    setConfirmReject(false)
    setNagVisible(false)
  }
  window.addEventListener('open-cookie-consent', onOpen as EventListener)
  return () => window.removeEventListener('open-cookie-consent', onOpen as EventListener)
}, [])
  // ชิปเตือนเป็นระยะ ถ้าไม่ให้ consent
  useEffect(() => {
    if (!darkPattern || nagEveryMs <= 0) return
    if (hasConsent) return
    if (open) return
    timerRef.current = window.setInterval(() => setNagVisible(true), nagEveryMs) as unknown as number
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [darkPattern, nagEveryMs, open, hasConsent])

  function doAcceptAll() {
    const p: ConsentPrefs = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }
    setPrefs(p)
    savePrefs(p)
    setHasConsent(true)
    setOpen(false)
    setNagVisible(false)
  }

  function doRejectNonEssential() {
    const p: ConsentPrefs = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }
    setPrefs(p)
    savePrefs(p)
    setHasConsent(true) // มีการเลือกแล้ว (เพียงแต่ปฏิเสธ non-essential)
    setOpen(false)
    setNagVisible(false)
  }

  function handleAcceptAll() {
    doAcceptAll()
  }

  function handleRejectNonEssential() {
    if (darkPattern) {
      setConfirmReject(true) // confirm ซ้ำ
    } else {
      doRejectNonEssential()
    }
  }

  function handleSave() {
    const p: ConsentPrefs = { ...prefs, timestamp: new Date().toISOString() }
    setPrefs(p)
    savePrefs(p)
    setHasConsent(true)
    setOpen(false)
    setNagVisible(false)
  }

  // ไม่ต้องเรนเดอร์อะไรเมื่อไม่เปิดและไม่มี nag
  if (!open && !nagVisible) return null

  // Mini-nag chip
  if (!open && nagVisible && !hasConsent) {
    return (
      <button
        onClick={() => { setOpen(true); setNagVisible(false) }}
        className="fixed bottom-4 right-4 z-[1000] rounded-full bg-white text-zinc-900 px-4 py-2 text-sm shadow-lg ring-1 ring-black/10 hover:scale-105 transition"
        aria-label="Manage cookies"
      >
        🍪 ตั้งค่าคุกกี้
      </button>
    )
  }

  return (
    <div
      className={
        forceBlocking
          ? 'fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4'
          : 'fixed inset-x-0 bottom-0 z-[1000] p-4'
      }
      role="dialog"
      aria-labelledby="cookie-title"
      aria-modal="true"
    >
      <div
        className={
          'w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-900/95 text-white shadow-xl ' +
          (forceBlocking ? '' : 'mx-auto')
        }
      >
        <div className="p-4 md:p-6">
          <h2 id="cookie-title" className="text-lg md:text-xl font-semibold">
            เราอยากขออนุญาตใช้คุกกี้เพื่อมอบประสบการณ์ที่ไหลลื่น ✨
          </h2>
          <p className="mt-1 text-sm text-white/70">
            คุกกี้จำเป็นจะทำงานเสมอ ส่วน Analytics และการตลาดช่วยให้เราเสนอคอนเทนต์ที่ตรงใจมากขึ้น
            คุณสามารถปรับการตั้งค่าได้ทุกเมื่อ
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              autoFocus
              onClick={handleAcceptAll}
              className={
                'rounded-xl px-5 py-2.5 font-semibold shadow focus:outline-none focus:ring-2 ' +
                (darkPattern
                  ? 'bg-white text-zinc-900 hover:scale-[1.02] focus:ring-white/40 transition'
                  : 'bg-white text-zinc-900 focus:ring-white/40')
              }
              aria-label="Accept all cookies and continue"
            >
              ยอมรับทั้งหมดและดำเนินการต่อ
            </button>

            <button
              onClick={handleRejectNonEssential}
              className={
                'rounded-xl px-3 py-2 font-medium ' +
                (darkPattern
                  ? 'text-white/70 hover:text-white underline underline-offset-4'
                  : 'bg-white/10 hover:bg-white/15 ring-1 ring-white/10')
              }
            >
              ยอมรับให้เว็บไซต์ทำงานไม่เต็มที่
            </button>

            <button
              onClick={() => setExpanded(v => !v)}
              className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15 ring-1 ring-white/10"
            >
              ตั้งค่ารายประเภท
            </button>
          </div>

          {expanded && (
            <div className="mt-4 grid gap-3">
              <ConsentToggle
                title="คุกกี้ที่จำเป็น"
                desc={darkPattern
                  ? 'จำเป็นต่อฟีเจอร์หลัก เช่น ความปลอดภัย และประสบการณ์ที่ราบรื่น'
                  : 'จำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ (ปิดไม่ได้)'}
                checked={true}
                disabled
                onChange={() => {}}
              />
              <ConsentToggle
                title={darkPattern ? 'คุกกี้วิเคราะห์ (แนะนำ)' : 'คุกกี้วิเคราะห์ (Analytics)'}
                desc={darkPattern
                  ? 'ช่วยให้เราเข้าใจสิ่งที่คุณชอบ เพื่อเสนอประสบการณ์ที่ดียิ่งขึ้น'
                  : 'ช่วยให้เราเข้าใจการใช้งานเพื่อปรับปรุงเว็บไซต์'}
                checked={prefs.analytics}
                onChange={(v) => setPrefs(p => ({ ...p, analytics: v }))}
              />
              <ConsentToggle
                title={darkPattern ? 'คุกกี้การตลาด (ข้อเสนอเฉพาะคุณ)' : 'คุกกี้การตลาด (Marketing)'}
                desc={darkPattern
                  ? 'ให้เราแนะนำดีล/อีเวนต์ที่น่าจะถูกใจ—ไม่มีสแปม'
                  : 'ใช้สำหรับการโฆษณา/รีมาร์เก็ตติ้ง'}
                checked={prefs.marketing}
                onChange={(v) => setPrefs(p => ({ ...p, marketing: v }))}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  className="rounded-xl bg-white text-zinc-900 px-4 py-2 font-semibold shadow hover:opacity-95"
                >
                  บันทึกและกลับไปช้อปต่อ
                </button>
                {!darkPattern && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="rounded-xl bg-white/10 px-4 py-2 font-medium hover:bg-white/15 ring-1 ring-white/10"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {darkPattern && confirmReject && (
          <div className="border-t border-white/10 bg-black/20 p-4 md:p-5">
            <div className="text-sm text-white/80">
              ปฏิเสธคุกกี้ที่ไม่จำเป็นอาจทำให้ประสบการณ์บางอย่างไม่ครบถ้วน
              คุณยังยืนยันที่จะปฏิเสธหรือไม่?
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={doRejectNonEssential}
                className="rounded-lg bg-white/10 px-3 py-2 font-medium hover:bg-white/15 ring-1 ring-white/10"
              >
                ยืนยันการปฏิเสธ
              </button>
              <button
                onClick={() => setConfirmReject(false)}
                className="rounded-lg bg-white text-zinc-900 px-4 py-2 font-semibold shadow hover:opacity-95"
              >
                กลับไปยอมรับทั้งหมด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConsentToggle({
  title,
  desc,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-white/70">{desc}</div>
      </div>
      <label className={'inline-flex items-center gap-2 ' + (disabled ? 'opacity-60' : '')}>
        <input
          type="checkbox"
          className="h-4 w-4 accent-white"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="text-sm">{checked ? 'เปิด' : 'ปิด'}</span>
      </label>
    </div>
  )
}
