'use client'

import { useEffect, useMemo, useState } from 'react'

// สุ่มแบบ pseudo-random จาก id (ให้ค่าคงที่ต่อ item)
function seededRand(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6D2B79F5
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function FakeUrgency({ id }: { id: string }) {
  const rand = useMemo(() => seededRand(id), [id])
  const initialLeft = Math.max(2, Math.floor(rand() * 10) + 2) // 2–12
  const [left, setLeft] = useState(initialLeft)
  const [viewers, setViewers] = useState(Math.floor(rand() * 30) + 5) // 5–35
  const [seconds, setSeconds] = useState(Math.floor(rand() * 8 * 60) + 120) // 2–10 นาที

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
      if (Math.random() < 0.05 && left > 1) setLeft((x) => x - 1)
      setViewers((v) =>
        Math.max(3, Math.min(99, v + (Math.random() < 0.5 ? -1 : 1)))
      )
    }, 1000)
    return () => clearInterval(t)
  }, [left])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
      <div className="rounded-md bg-red-500/15 text-red-300 ring-1 ring-red-500/30 px-2 py-1 text-center font-semibold">
        เหลือ {left} ชิ้น
      </div>
      <div className="rounded-md bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30 px-2 py-1 text-center font-semibold">
        มี {viewers} คนกำลังดู
      </div>
      <div className="rounded-md bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30 px-2 py-1 text-center font-semibold">
        โปรฯ หมดใน {mm}:{ss}
      </div>
    </div>
  )
}
