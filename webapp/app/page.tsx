import Checker from './Checker'
import Icon from './Icon'

// share_target ใน manifest ส่งข้อความที่ผู้ใช้กด "แชร์" มาทาง ?text= (บางแอปใส่ใน title หรือ url)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const shared = ['title', 'text', 'url']
    .map((k) => sp[k])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .join('\n')

  return (
    <div className="app">
      <header className="app-bar">
        <img src="/icon.svg" alt="" width={30} height={30} className="app-bar-icon" />
        <span className="app-bar-title">
          Scam<b>Alert</b>
        </span>
        <a href="tel:1441" className="sos" aria-label="โทรสายด่วนตำรวจไซเบอร์ 1441">
          <Icon name="phone" size={16} />
          1441
        </a>
      </header>
      <Checker initialText={shared} />
    </div>
  )
}
