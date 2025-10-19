'use client'

import { useEffect, useState } from 'react'

type Transport = 'gps_like' | 'wifi_cell' | 'coarse'
type Saved = {
  address1: string
  subdistrict?: string
  district?: string
  province?: string
  postcode?: string
  lat?: number
  lon?: number
  formatted?: string
  geo?: {
    source?: 'browser_geolocation'
    accuracyM?: number
    inferredTransport?: Transport
    ts?: string
  }
  geocoder?: { provider?: 'nominatim' | string }
}

const STORAGE_KEY = 'userAddress:v1'

function shortenAddress(s?: string) {
  if (!s) return ''
  return s.length > 42 ? s.slice(0, 42) + '…' : s
}

function transportLabel(t?: Transport) {
  switch (t) {
    case 'gps_like': return 'GPS-like'
    case 'wifi_cell': return 'Wi-Fi/Cell'
    case 'coarse': return 'Coarse'
    default: return 'Unknown'
  }
}

function migrateIfNeeded(raw: string): Saved {
  let obj: any
  try { obj = JSON.parse(raw) } catch { return {} as Saved }
  if (!obj.geo) obj.geo = { source: 'browser_geolocation', inferredTransport: 'coarse', ts: new Date().toISOString() }
  if (!obj.geocoder) obj.geocoder = { provider: 'nominatim' }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch {}
  return obj as Saved
}

export default function LocationBadge() {
  const [data, setData] = useState<Saved | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // 1) ตรวจขนาดหน้าจอ (SSR-safe) — ไม่ทำให้เกิดการสลับลำดับ Hooks
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  // 2) โหลด/ติดตามข้อมูลที่ localStorage — อยู่ก่อน return เสมอ (ไม่ผิดกฎ Hooks)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isDesktop) return // บนมือถือไม่ต้องทำอะไร

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setData(migrateIfNeeded(raw))
      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) setData(migrateIfNeeded(e.newValue))
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    } catch {}
  }, [isDesktop])

  // ไม่ใช่เดสก์ท็อป → ไม่เรนเดอร์อะไร
  if (!isDesktop) return null

  if (!data) return null

  const line =
    data.formatted ||
    [data.address1, data.subdistrict, data.district, data.province, data.postcode]
      .filter(Boolean)
      .join(', ')

  const latStr = typeof data.lat === 'number' ? data.lat.toFixed(5) : '—'
  const lonStr = typeof data.lon === 'number' ? data.lon.toFixed(5) : '—'
  const accStr = typeof data.geo?.accuracyM === 'number' ? Math.round(data.geo.accuracyM) : '—'
  const sourceStr = data.geo?.source ?? 'unknown'
  const transportStr = transportLabel(data.geo?.inferredTransport)
  const providerStr = data.geocoder?.provider ?? 'unknown'
  const tsStr = data.geo?.ts ? new Date(data.geo.ts).toLocaleString() : '—'

  const cardStyle =
    'fixed bottom-4 left-4 z-[95] backdrop-blur-xl bg-white/10 border border-white/20 text-white shadow-lg ' +
    'rounded-2xl p-3 transition-all duration-300 hover:bg-white/15'

  if (minimized) {
    return (
      <button
        className={`${cardStyle} px-3 py-2 flex items-center gap-2 text-sm`}
        onClick={() => setMinimized(false)}
      >
        📍 <span>{shortenAddress(line) || '—'}</span>
      </button>
    )
  }

  return (
    <div className={`${cardStyle} max-w-[90vw] md:max-w-sm`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-wide text-white/60">
          ตำแหน่งปัจจุบัน
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded bg-white/15 hover:bg-white/25"
          onClick={() => setMinimized(true)}
        >
          ย่อ
        </button>
      </div>

      <div className="text-sm font-medium">{shortenAddress(line) || '—'}</div>

      <div className="mt-1 text-[11px] text-white/80">
        📍 {latStr}, {lonStr} · 🎯 ±{accStr} m
      </div>

      <div className="mt-1 text-[11px] text-white/70">
        แหล่งที่มา: {sourceStr} ({transportStr}) · geocoder: {providerStr}
      </div>

      <div className="mt-1 text-[11px] text-white/60">อัปเดตล่าสุด: {tsStr}</div>

      <div className="mt-2 flex gap-2">
        <button
          className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25"
          onClick={() => {
            try { localStorage.removeItem(STORAGE_KEY) } catch {}
            setData(null)
          }}
        >
          ล้างข้อมูล
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25"
          onClick={() => location.reload()}
        >
          รีโหลด
        </button>
      </div>
    </div>
  )
}
