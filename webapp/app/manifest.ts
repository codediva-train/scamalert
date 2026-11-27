import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ScamAlert — เช็กข้อความและสายหลอกลวง',
    short_name: 'ScamAlert',
    description: 'ตรวจข้อความ SMS, LINE, อีเมล ไฟล์เสียง และสายโทรศัพท์ที่น่าสงสัยด้วย AI',
    id: '/',
    lang: 'th',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['utilities', 'security'],
    background_color: '#0A2342',
    theme_color: '#0A2342',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Android: กด "แชร์" ข้อความจากแอปอื่นมาที่แอปนี้ได้เลย (iOS ยังไม่รองรับ ต้องคัดลอกมาวาง)
    share_target: {
      action: '/',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  }
}
