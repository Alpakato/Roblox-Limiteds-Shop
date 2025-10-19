import './globals.css'
import type { Metadata } from 'next'
import { CartProvider } from '@/app/context/CartContext' // ✅ ตรวจให้ path ตรงกับที่คุณวางไฟล์จริง
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Roblox Limited Shop',
  description: 'One-page shop • demo only',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-gradient-to-b from-[#0f162b] via-[#101736] to-[#0b1023] text-white">
        {/* พื้นหลัง gradient นุ่ม ๆ */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,.15),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,.12),transparent_35%)]" />
        </div>

        {/* ✅ ครอบทั้งหมดใน CartProvider */}
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
      </body>
    </html>
  )
}
