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
          // ✅ ใช้ path แบบ public
          const res = await fetch('/data/items.json')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = await res.json()
          const parsed = CatalogSchema.parse(json)
          _cache = parsed
          setData(parsed)
        } catch (e: any) {
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
