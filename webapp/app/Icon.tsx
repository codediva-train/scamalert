import { ICONS, type IconName } from '@/lib/icons'

// ไอคอนจาก icon pack (lib/icons.ts) — สีตาม currentColor
export default function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      // ค่าคงที่จาก lib/icons.ts ไม่มีข้อมูลจากผู้ใช้
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
