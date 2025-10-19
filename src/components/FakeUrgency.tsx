'use client'

import { useEffect, useMemo, useState } from 'react'

// — ฟังก์ชันสุ่มแบบคงที่ตาม id —
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

// — Glass Pill Component —
type Tone = 'red' | 'amber' | 'emerald' | 'neutral'

function GlassPill({
  tone,
  children,
  title,
  icon,
}: {
  tone: Tone
  children: React.ReactNode
  title?: string
  icon?: React.ReactNode
}) {
  const toneMap: Record<
    Tone,
    { edge: string; edge2: string; fill: string; ring: string; text: string; glowFrom: string; glowTo: string; chip: string }
  > = {
    neutral: {
      edge: 'bg-gradient-to-br from-white/10 to-white/5',
      edge2: 'ring-1 ring-white/10',
      fill: 'bg-gradient-to-b from-white/10 to-white/[0.04]',
      ring: 'ring-1 ring-white/15',
      text: 'text-white/90',
      glowFrom: 'from-white/10',
      glowTo: 'to-white/5',
      chip: 'text-white/80',
    },
    red: {
      edge: 'bg-gradient-to-br from-red-400/20 to-red-600/20',
      edge2: 'ring-1 ring-red-300/20',
      fill: 'bg-gradient-to-b from-white/10 to-white/[0.05]',
      ring: 'ring-1 ring-red-300/25',
      text: 'text-red-50',
      glowFrom: 'from-red-300/20',
      glowTo: 'to-fuchsia-300/10',
      chip: 'text-red-50',
    },
    amber: {
      edge: 'bg-gradient-to-br from-amber-300/20 to-amber-600/20',
      edge2: 'ring-1 ring-amber-300/20',
      fill: 'bg-gradient-to-b from-white/10 to-white/[0.05]',
      ring: 'ring-1 ring-amber-300/25',
      text: 'text-amber-50',
      glowFrom: 'from-amber-300/20',
      glowTo: 'to-yellow-300/10',
      chip: 'text-amber-50',
    },
    emerald: {
      edge: 'bg-gradient-to-br from-emerald-300/20 to-emerald-600/20',
      edge2: 'ring-1 ring-emerald-300/20',
      fill: 'bg-gradient-to-b from-white/10 to-white/[0.05]',
      ring: 'ring-1 ring-emerald-300/25',
      text: 'text-emerald-50',
      glowFrom: 'from-emerald-300/20',
      glowTo: 'to-cyan-300/10',
      chip: 'text-emerald-50',
    },
  }

  const t = toneMap[tone]

  return (
    <div
      className={`relative rounded-xl p-[1px] shadow-[0_0_0_1px_rgba(255,255,255,.03),0_12px_22px_-18px_rgba(0,0,0,.65)] ${t.edge} ${t.edge2} overflow-hidden`}
      title={title}
      aria-label={title}
    >
      <div className={`pointer-events-none absolute -inset-8 bg-gradient-to-br ${t.glowFrom} ${t.glowTo} blur-lg opacity-30`} />
      <div
        className={`relative h-7 w-full rounded-[10px] ${t.fill} backdrop-blur-xl ${t.ring} ${t.text} flex items-center justify-center overflow-hidden [box-shadow:inset_0_8px_16px_-14px_rgba(255,255,255,.35),inset_0_-5px_14px_-12px_rgba(0,0,0,.4)]`}
      >
        <span className="pointer-events-none absolute inset-x-2 -top-3 h-6 rounded-full bg-white/20 blur-md" />
        <span className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-white/10" />
        <span className="pointer-events-none absolute -inset-y-2 -left-10 w-12 rotate-12 bg-gradient-to-r from-white/0 via-white/40 to-white/0 motion-safe:animate-[glint_3.2s_linear_infinite] motion-reduce:hidden" />
        <div className={`flex items-center gap-1 px-1.5 text-[9.5px] md:text-[10px] font-semibold ${t.chip} whitespace-nowrap`}>
          {icon}
          {children}
        </div>
      </div>
    </div>
  )
}

// — ไอคอน —
function BoxIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" className="opacity-90">
      <path d="M21 8.5v7l-9 5-9-5v-7l9-5 9 5Zm-9 5 9-5M12 13.5l-9-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" className="opacity-90">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" className="opacity-90">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function SoldIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" className="opacity-90">
      <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// — Main Component —
export default function FakeUrgency({ id, hasDiscount = false }: { id: string; hasDiscount?: boolean }) {
  const rand = useMemo(() => seededRand(id), [id])

  const [sold, setSold] = useState(() => Math.floor(rand() * 120) + 20)          // 20–140 ชิ้นขายแล้ว
  const [left, setLeft] = useState(() => Math.max(2, Math.floor(rand() * 10) + 2))
  const [viewers, setViewers] = useState(() => Math.floor(rand() * 30) + 5)
  const [seconds, setSeconds] = useState(() => Math.floor(rand() * 8 * 60) + 120)

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0))
      setLeft((x) => (Math.random() < 0.05 && x > 1 ? x - 1 : x))
      setViewers((v) => Math.max(3, Math.min(99, v + (Math.random() < 0.5 ? -1 : 1))))
      setSold((s) => s + (Math.random() < 0.02 ? 1 : 0)) // เพิ่มยอดขายนิดหน่อย
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div
      className="
        mt-1
        grid
        gap-1
        text-[9.5px] md:text-[10px]
        [--min:78px]
        [--max:1fr]
      "
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(var(--min), var(--max)))' }}
    >
      <GlassPill tone="neutral" title="จำนวนที่ขายไปแล้ว" icon={<SoldIcon />}>
        <span className="font-semibold">ขายแล้ว {sold} ชิ้น</span>
      </GlassPill>

      <GlassPill tone="red" title="สต็อกที่พร้อมขาย" icon={<BoxIcon />}>
        <span className="font-semibold">เหลือ {left} ชิ้น</span>
      </GlassPill>

      <GlassPill tone="amber" title="ผู้ชมตอนนี้" icon={<EyeIcon />}>
        <span className="font-semibold">มี {viewers} กำลังดู</span>
      </GlassPill>

      {!hasDiscount && (
        <GlassPill tone="emerald" title="เวลาที่เหลือของโปรฯ" icon={<ClockIcon />}>
          <span className="font-semibold">หมดใน {mm}:{ss}</span>
        </GlassPill>
      )}
    </div>
  )
}
