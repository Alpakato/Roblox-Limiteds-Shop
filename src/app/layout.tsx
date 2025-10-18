// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roblox Limiteds Shop',
  description: 'One-page shop • demo only',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-gradient-to-b from-[#0f162b] via-[#101736] to-[#0b1023] text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,.15),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,.12),transparent_35%)]" />
        </div>
        {children}
      </body>
    </html>
  )
}
