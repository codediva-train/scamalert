// ScamAlert icon pack — ต้นฉบับเดียวของไอคอนทั้งหมด
// กริด 24px, เส้น 2px, ปลายมน, มุมโค้งเข้าชุดกับโลโก้ (ฟองแชตมีหาง)
// ใช้ในแอปผ่าน <Icon name="..."/> และส่งออกเป็นไฟล์ .svg ด้วย `npm run icons` → design/icons/
const shield = 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
const bubble = 'M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-6l-5 4 1-4.4A4 4 0 0 1 3 13V8a4 4 0 0 1 4-4z'

export const ICONS = {
  // แบรนด์และผลตรวจ
  'scam-alert': `<path d="${bubble}"/><path d="M12 7.5V11M12 14h.01"/>`,
  'verdict-scam': `<path d="${shield}"/><path d="M12 8v4M12 16h.01"/>`,
  'verdict-misinfo': `<path d="${bubble}"/><path d="M10 8.6a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.4M12 14h.01"/>`,
  'verdict-safe': `<path d="${shield}"/><path d="m9 12 2 2 4-4"/>`,
  // ช่องทางตรวจ
  message: `<path d="${bubble}"/><path d="M8 9h8M8 12.5h5"/>`,
  mic: `<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8.5 21h7"/>`,
  'live-call': `<path d="M12 12h.01"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>`,
  'audio-file': `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 15v-1M11 17v-5M14 16v-3M17 15v-1"/>`,
  'chat-screenshot': `<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 7h5M11 11h5M8 15h4"/>`,
  waveform: `<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4"/>`,
  clipboard: `<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>`,
  upload: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/>`,
  // สิ่งที่พบในข้อความ
  link: `<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>`,
  bank: `<path d="M12 3 3 8h18zM5 11v6M9.5 11v6M14.5 11v6M19 11v6M3 21h18"/>`,
  phone: `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>`,
  // การช่วยเหลือ
  report: `<path d="M4 22V4M4 4h13l-2.5 4.5L17 13H4"/>`,
  family: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>`,
  share: `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>`,
  privacy: `<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2"/>`,
  // ปุ่มทั่วไป
  close: `<path d="M18 6 6 18M6 6l12 12"/>`,
  expand: `<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>`,
  'chevron-right': `<path d="m9 18 6-6-6-6"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  stop: `<rect x="6" y="6" width="12" height="12" rx="2.5"/>`,
} as const

export type IconName = keyof typeof ICONS

export function iconSvg(name: IconName, size = 24) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`
}
