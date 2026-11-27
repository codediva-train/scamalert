import type { Metadata, Viewport } from 'next'
import { Anuphan } from 'next/font/google'
import SwRegister from './SwRegister'
import './globals.css'

// ฟอนต์ไทยไม่มีหัวแบบโมเดิร์น (variable 100–700) — next/font ดึงมาเก็บในแอปตอน build
// ผู้ใช้จึงไม่ต้องโหลดจาก Google ตอนเปิดแอป และใช้ได้แม้ออฟไลน์
const anuphan = Anuphan({
  subsets: ['thai', 'latin'],
  variable: '--font-thai',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ScamAlert — เช็กข้อความและสายหลอกลวง',
  description: 'ตรวจข้อความ SMS, LINE, อีเมล ไฟล์เสียง และสายโทรศัพท์ที่น่าสงสัยด้วย AI',
  appleWebApp: { capable: true, title: 'ScamAlert', statusBarStyle: 'black-translucent' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png' }], apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f3f7' },
    { media: '(prefers-color-scheme: dark)', color: '#08111f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={anuphan.variable}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
