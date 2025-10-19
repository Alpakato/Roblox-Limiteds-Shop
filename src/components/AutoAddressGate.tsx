'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type GeoMeta = {
  source: 'browser_geolocation'
  accuracyM?: number
  inferredTransport: 'gps_like' | 'wifi_cell' | 'coarse'
  ts: string
}

type GeocoderMeta = {
  provider: 'nominatim'
}

type Address = {
  address1: string
  subdistrict?: string
  district?: string
  province?: string
  postcode?: string
  lat: number
  lon: number
  formatted?: string

  // ใหม่: ที่มาพิกัด + ที่มา reverse geocoding
  geo: GeoMeta
  geocoder: GeocoderMeta
}

const STORAGE_KEY = 'userAddress:v1'
const SEEN_KEY = 'addressGate:completed:v1'
const DENY_LOG_KEY = 'addressGate:denyCount:v1'

type Phase = 'idle' | 'locating' | 'resolving' | 'done' | 'denied' | 'error' | 'insecure'

function inferTransport(accuracy?: number): GeoMeta['inferredTransport'] {
  if (accuracy == null) return 'coarse'
  if (accuracy <= 50) return 'gps_like'
  if (accuracy <= 500) return 'wifi_cell'
  return 'coarse'
}

export default function AutoAddressGate({
  autoStart = true,
  zIndex = 80,
  allowRegrabButton = true,
}: {
  autoStart?: boolean
  zIndex?: number
  allowRegrabButton?: boolean
}) {
  const [open, setOpen] = useState<boolean>(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const [message, setMessage] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(0)
  const countdownRef = useRef<number | null>(null)

  const startCloseCountdown = (seconds = 6) => {
    setCountdown(seconds)
    if (countdownRef.current) window.clearInterval(countdownRef.current)
    countdownRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current)
          countdownRef.current = null
          return 0
        }
        return c - 1
      })
    }, 1000) as unknown as number
  }

  useEffect(() => {
    const completed = localStorage.getItem(SEEN_KEY)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && completed) {
      setPhase('done')
      setOpen(false)
      return
    }
    if (!autoStart) return
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    if (!isSecure) {
      setPhase('insecure')
      setOpen(true)
      setMessage('จำเป็นต้องเปิดผ่าน HTTPS หรือ localhost เพื่อดึงตำแหน่งอัตโนมัติ')
      return
    }
    setOpen(true)
    grabNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  useEffect(() => {
    const prev = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = prev || ''
    return () => { document.body.style.overflow = prev || '' }
  }, [open])

  function saveAddress(addr: Address) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addr))
    localStorage.setItem(SEEN_KEY, '1')
  }

  async function reverseGeocode(lat: number, lon: number): Promise<Pick<Address, 'address1' | 'subdistrict' | 'district' | 'province' | 'postcode' | 'formatted'>> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&zoom=18&accept-language=th`
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) throw new Error(`Reverse geocode HTTP ${res.status}`)
    const data = await res.json()

    const a = data?.address ?? {}
    const house = a.house_number || ''
    const road = a.road || a.residential || a.pedestrian || ''
    const villageLike = a.village || a.hamlet || a.neighbourhood || a.suburb || ''
    const address1 = [house, road, villageLike].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

    const subdistrict = a.subdistrict || a.village || a.suburb || ''
    const district = a.county || a.city_district || a.district || a.town || a.city || ''
    const province = a.state || a.region || ''
    const postcode = a.postcode || ''
    const formatted = data?.display_name as string | undefined

    return {
      address1: address1 || formatted || 'ตำแหน่งที่ระบุโดยเบราว์เซอร์',
      subdistrict: subdistrict || undefined,
      district: district || undefined,
      province: province || undefined,
      postcode: postcode || undefined,
      formatted,
    }
  }

  function logSuccess(addr: Address) {
    console.log(
      '%c[AutoAddressGate] ที่อยู่ดึงสำเร็จ:',
      'color:#0fb; font-weight:700',
      {
        ts: addr.geo.ts,
        source: addr.geo.source,
        inferredTransport: addr.geo.inferredTransport,
        accuracyM: addr.geo.accuracyM,
        geocoder: addr.geocoder.provider,
        lat: addr.lat, lon: addr.lon,
        address1: addr.address1,
        subdistrict: addr.subdistrict,
        district: addr.district,
        province: addr.province,
        postcode: addr.postcode,
        formatted: addr.formatted,
      }
    )
    try {
      const histRaw = localStorage.getItem('addressGate:history:v1')
      const hist = histRaw ? JSON.parse(histRaw) : []
      hist.push({ ts: addr.geo.ts, addr })
      localStorage.setItem('addressGate:history:v1', JSON.stringify(hist.slice(-10)))
    } catch { /* ignore */ }
  }

  function logDeny(reason = 'permission_denied') {
    const ts = new Date().toISOString()
    console.warn('%c[AutoAddressGate] ผู้ใช้ปฏิเสธการให้ตำแหน่ง:', 'color:#f90; font-weight:700', { ts, reason })
    try {
      const countRaw = localStorage.getItem(DENY_LOG_KEY)
      const count = countRaw ? Number(countRaw) : 0
      localStorage.setItem(DENY_LOG_KEY, String(count + 1))
    } catch { /* ignore */ }
  }

  async function grabNow() {
    setMessage('')
    setPhase('locating')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setPhase('resolving')
          const { latitude: lat, longitude: lon, accuracy } = pos.coords
          const geoMeta: GeoMeta = {
            source: 'browser_geolocation',
            accuracyM: accuracy ?? undefined,
            inferredTransport: inferTransport(accuracy ?? undefined),
            ts: new Date().toISOString(),
          }
          const base = await reverseGeocode(lat, lon)

          const addr: Address = {
            ...base,
            lat, lon,
            geocoder: { provider: 'nominatim' },
            geo: geoMeta,
          }

          saveAddress(addr)
          logSuccess(addr)
          setPhase('done')
          setOpen(false)
        } catch (e: any) {
          setPhase('error')
          const m = e?.message || 'แปลงพิกัดเป็นที่อยู่ไม่สำเร็จ'
          setMessage(m)
          console.error('[AutoAddressGate] reverseGeocode failed:', m)
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPhase('denied')
          setMessage('คุณปฏิเสธการเข้าถึงตำแหน่ง — กรุณาอนุญาตเพื่อใช้ฟีเจอร์จัดส่ง/โปรโมชั่นพื้นที่')
          logDeny('permission_denied')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPhase('error')
          setMessage('ไม่สามารถรับพิกัดได้ (สัญญาณ/บริการไม่พร้อม)')
          console.error('[AutoAddressGate] position_unavailable', err)
        } else if (err.code === err.TIMEOUT) {
          setPhase('error')
          setMessage('ขอพิกัดนานเกินกำหนด ลองใหม่อีกครั้ง')
          console.error('[AutoAddressGate] timeout', err)
        } else {
          setPhase('error')
          setMessage(err.message || 'ขอพิกัดล้มเหลว')
          console.error('[AutoAddressGate] unknown error', err)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const titleByPhase = useMemo(() => {
    switch (phase) {
      case 'locating': return 'กำลังขอตำแหน่งจากเบราว์เซอร์…'
      case 'resolving': return 'กำลังแปลงพิกัดเป็นที่อยู่…'
      case 'denied': return 'ต้องการสิทธิ์ตำแหน่ง'
      case 'error': return 'ดึงที่อยู่ไม่สำเร็จ'
      case 'insecure': return 'ต้องใช้ HTTPS'
      default: return 'เตรียมดึงที่อยู่…'
    }
  }, [phase])

  useEffect(() => {
    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <>
      {allowRegrabButton && (
        <button
          onClick={() => { setOpen(true); grabNow() }}
          className="fixed right-4 bottom-16 z-[90] rounded-full px-4 py-2 text-sm font-medium bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20 backdrop-blur"
          title="ระบุตำแหน่งอีกครั้ง"
        >
          ระบุตำแหน่งอีกครั้ง
        </button>
      )}

      {!open ? null : (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex }} role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-[92vw] max-w-md rounded-2xl bg-[#071021] text-white shadow-2xl ring-1 ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/6">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">{titleByPhase}</h2>
              <p className="mt-1 text-white/70 text-sm">เว็บไซต์ต้องการตำแหน่งของคุณเพื่อคำนวณค่าจัดส่งและแสดงโปรโมชั่นที่ตรงพื้นที่</p>
            </div>

            <div className="p-5">
              {(phase === 'locating' || phase === 'resolving') && (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <div>
                    <div className="text-sm text-white/80">
                      {phase === 'locating' ? 'กำลังขอตำแหน่งจากเบราว์เซอร์…' : 'กำลังค้นหาที่อยู่จากพิกัด…'}
                    </div>
                    <div className="text-xs text-white/50 mt-1">ต้องการอนุญาต GPS และให้เว็บไซต์เข้าถึงตำแหน่งของคุณ</div>
                  </div>
                </div>
              )}

              {phase === 'insecure' && (
                <div className="text-sm text-amber-200">
                  {message}<br />
                  กรุณาเปิดผ่าน <span className="font-semibold">https://</span> หรือรันบน <span className="font-semibold">localhost</span> แล้วลองใหม่
                </div>
              )}

              {(phase === 'denied' || phase === 'error') && (
                <>
                  <div className="text-sm text-red-300 mb-3">{message || 'เกิดข้อผิดพลาด'}</div>

                  {/* guilt UI */}
                  <div className="rounded-md border border-white/6 p-3 bg-white/2">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">😬</div>
                      <div>
                        <div className="font-medium">การปฏิเสธจะทำให้คุณพลาดข้อเสนอ/ค่าส่งที่เหมาะกับพื้นที่</div>
                        <div className="text-xs text-white/60 mt-1">โปรดพิจารณาอนุญาตตำแหน่ง — ถ้าไม่อนุญาต จะต้องกรอกที่อยู่เองในภายหลัง</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(countdown > 0 ? ((6 - countdown) / 6) * 100 : 0)}%`, transition: 'width 250ms linear' }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        คุณสามารถกด <span className="font-semibold">ปิด</span> ได้หลังจากนับถอยหลังก่อน — หรือกด <span className="font-semibold">ลองใหม่</span> เพื่อพยายามอีกครั้ง
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              {(phase === 'denied' || phase === 'error' || phase === 'insecure') ? (
                <>
                  <button
                    className="rounded-lg px-3 py-2 text-sm bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/20"
                    onClick={() => {
                      if (countdown <= 0) {
                        startCloseCountdown(6)
                      } else {
                        setOpen(false)
                      }
                      if (phase === 'denied') logDeny('user_closed_after_deny')
                    }}
                  >
                    {countdown > 0 ? `ปิดได้ใน ${countdown}s` : 'ปิดไปก่อน (ไม่แนะนำ)'}
                  </button>

                  <button
                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-cyan-500/90 hover:bg-cyan-400"
                    onClick={() => { grabNow() }}
                  >
                    ลองใหม่
                  </button>
                </>
              ) : (
                <button className="rounded-lg px-4 py-2 text-sm font-semibold bg-white/10 text-white cursor-not-allowed" disabled>
                  กำลังดำเนินการ…
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
