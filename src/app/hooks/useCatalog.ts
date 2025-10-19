'use client'

import { useEffect, useMemo, useState } from 'react'
import { Catalog, CatalogSchema, Item } from '@/types/catalog'

let _cache: Catalog | null = null

export function useCatalog(query: string) {
  const [data, setData] = useState<Catalog | null>(_cache)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!_cache)

  useEffect(() => {
    if (_cache) return
      ; (async () => {
        try {
          setLoading(true)
          const res = await fetch('/data/items.json', { cache: 'no-cache' })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          const raw = await res.text()
          console.log('📄 items.json (raw):\n', raw.slice(0, 1000)) // ตัดมาโชว์พอเห็นต้นเรื่อง
          let json: unknown

          try {
            // กัน BOM และตัวอักษรแปลก
            const cleaned = raw.replace(/^\uFEFF/, '')
            json = JSON.parse(cleaned)
          } catch (parseErr) {
            console.error('❌ JSON.parse failed:', parseErr)
            throw new Error('Invalid JSON format in items.json')
          }

          // ตรวจด้วย Zod แบบไม่โยน error เพื่อได้ path ละเอียดยิบ
          const result = CatalogSchema.safeParse(json)
          if (!result.success) {
            console.error('❌ Zod validation error:', result.error.format())
            throw new Error('JSON does not match Catalog schema')
          }

          const parsed = result.data
          console.log('✅ Parsed OK. Examples:', {
            firstRoblox: parsed.robloxLimiteds?.[0],
            firstUGC: parsed.ugcLimiteds?.[0],
          })

          _cache = parsed
          setData(parsed)
        } catch (e: any) {
          console.error('❌ Error loading catalog:', e)
          setError(e?.message ?? 'Load failed')
        } finally {
          setLoading(false)
        }
      })()
  }, [])


  const filtered = useMemo(() => {
    if (!data) return { roblox: [] as Item[], ugc: [] as Item[] }
    const q = query.trim().toLowerCase()
    if (!q) return { roblox: data.robloxLimiteds, ugc: data.ugcLimiteds }
    const f = (arr: Item[]) => arr.filter(i => i.title.toLowerCase().includes(q))
    return { roblox: f(data.robloxLimiteds), ugc: f(data.ugcLimiteds) }
  }, [data, query])

  return {
    data,
    categories: data?.categories ?? [],
    roblox: filtered.roblox,
    ugc: filtered.ugc,
    loading,
    error,
  }
}
