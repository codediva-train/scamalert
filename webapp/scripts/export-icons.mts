// ส่งออก icon pack เป็นไฟล์ .svg ทีละตัว + หน้าพรีวิว: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { ICONS, iconSvg, type IconName } from '../lib/icons.ts'

const out = new URL('../design/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
const names = Object.keys(ICONS) as IconName[]
for (const n of names) writeFileSync(new URL(`${n}.svg`, out), iconSvg(n) + '\n')

const cells = names.map((n) => `<figure>${iconSvg(n, 40)}<figcaption>${n}</figcaption></figure>`).join('')
writeFileSync(
  new URL('preview.html', out),
  `<!doctype html><meta charset="utf-8"><title>ScamAlert icons</title><style>
body{margin:0;padding:32px;font:14px system-ui;background:#0a2342;color:#ffb900}
h1{color:#eef3fa;font-size:20px;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
figure{margin:0;padding:20px 8px 12px;border-radius:16px;background:#132239;display:flex;flex-direction:column;align-items:center;gap:12px}
figcaption{color:#96a7c0;font-size:12px}
</style><h1>ScamAlert icon pack · ${names.length} icons · 24px grid · 2px stroke</h1><div class="grid">${cells}</div>\n`,
)
console.log(`wrote ${names.length} icons to design/icons/`)
