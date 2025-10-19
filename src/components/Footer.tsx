'use client'

import { useCallback } from 'react'

export default function Footer() {
  const openCookieConsent = useCallback(() => {
    try {
      // บอก CookieConsent ให้เปิดตัวเอง (เราไปฟัง event นี้ใน CookieConsent.tsx)
      window.dispatchEvent(new Event('open-cookie-consent'))
    } catch {
      // fallback เผื่ออะไรผิดพลาด
      alert('เปิดตัวจัดการคุกกี้ไม่สำเร็จ')
    }
  }, [])

  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="text-lg font-extrabold tracking-tight text-white/90">
            Roblox Catalog
          </div>
          <p className="mt-2 text-sm text-white/70">
            เดโมชอป • ไม่มีการชำระเงินจริง<br />
            ทำขึ้นเพื่อสาธิต UI/UX และเอฟเฟกต์ 3D
          </p>

          <button
            onClick={openCookieConsent}
            className="mt-4 inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 ring-1 ring-white/10"
          >
            🍪 จัดการคุกกี้
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">เกี่ยวกับ</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><a className="hover:text-white" href="#">แบรนด์ของเรา</a></li>
            <li><a className="hover:text-white" href="#">ข่าว &amp; อัปเดต</a></li>
            <li><a className="hover:text-white" href="#">ร่วมงานกับเรา</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">ช่วยเหลือ</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><a className="hover:text-white" href="#">คำถามที่พบบ่อย</a></li>
            <li><a className="hover:text-white" href="#">สถานะระบบ</a></li>
            <li><a className="hover:text-white" href="#">ติดต่อทีมงาน</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">กฎหมาย</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><a className="hover:text-white" href="#">นโยบายความเป็นส่วนตัว</a></li>
            <li><a className="hover:text-white" href="#">ข้อกำหนดการใช้งาน</a></li>
            <li><a className="hover:text-white" href="#">คุกกี้พอลิซี</a></li>
          </ul>
          <div className="mt-4 text-xs text-white/50">
            © {year} Roblox Catalog • Demo only
          </div>
        </div>
      </div>
    </footer>
  )
}
