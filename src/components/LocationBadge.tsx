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

  // เติมฟิลด์ที่อาจขาดจากรุ่นเก่า
  if (!obj.geo) {
    obj.geo = {
      source: 'browser_geolocation',
      accuracyM: undefined,
      inferredTransport: 'coarse',
      ts: new Date().toISOString(),
    }
  } else {
    obj.geo.source ??= 'browser_geolocation'
    obj.geo.inferredTransport ??= 'coarse'
    obj.geo.ts ??= new Date().toISOString()
  }
  if (!obj.geocoder) obj.geocoder = { provider: 'nominatim' }
  if (typeof obj.geocoder.provider === 'undefined') obj.geocoder.provider = 'nominatim'

  // เขียนกลับเพื่อให้ครั้งต่อ ๆ ไปไม่ต้อง migrate แล้ว
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch {}
  return obj as Saved
}

export default function LocationBadge() {
  const [data, setData] = useState<Saved | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setData(migrateIfNeeded(raw))

      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          setData(migrateIfNeeded(e.newValue))
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    } catch { /* ignore */ }
  }, [])

  if (!data) return null

  const line =
    data.formatted ||
    [data.address1, data.subdistrict, data.district, data.province, data.postcode]
      .filter(Boolean)
      .join(', ')

  const latOk = typeof data.lat === 'number' && Number.isFinite(data.lat)
  const lonOk = typeof data.lon === 'number' && Number.isFinite(data.lon)
  const acc =
    typeof data.geo?.accuracyM === 'number' && Number.isFinite(data.geo?.accuracyM!)
      ? Math.round(data.geo!.accuracyM!)
      : undefined

  return (
    <div className="fixed top-4 right-4 z-[95] max-w-[90vw] md:max-w-sm rounded-xl bg-white/10 text-white backdrop-blur ring-1 ring-white/15 shadow-lg p-3">
      <div className="text-xs uppercase tracking-wide text-white/60">ตำแหน่งปัจจุบัน</div>
      <div className="mt-1 text-sm font-medium">{shortenAddress(line) || '—'}</div>

      <div className="mt-1 text-[11px] text-white/70">
        📍 {latOk ? data.lat!.toFixed(5) : '—'}, {lonOk ? data.lon!.toFixed(5) : '—'}
        {' '}· 🎯 ±{typeof acc === 'number' ? acc : '—'}m
      </div>

      <div className="mt-1 text-[11px] text-white/60">
        แหล่งที่มา: {data.geo?.source ?? 'unknown'} ({transportLabel(data.geo?.inferredTransport)})
        {' '}· geocoder: {data.geocoder?.provider ?? 'unknown'}
      </div>

      <div className="mt-1 text-[11px] text-white/50">
        อัปเดตล่าสุด: {data.geo?.ts ? new Date(data.geo.ts).toLocaleString() : '—'}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25"
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY)
              setData(null)
            } catch {}
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
