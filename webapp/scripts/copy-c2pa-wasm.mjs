// คัดลอก WASM ของ @contentauth/c2pa-web ไป public/c2pa/ ให้เบราว์เซอร์โหลดได้ (รันอัตโนมัติก่อน dev และ build)
import { copyFileSync, mkdirSync } from 'node:fs'

const src = new URL('../node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm', import.meta.url)
const dir = new URL('../public/c2pa/', import.meta.url)
mkdirSync(dir, { recursive: true })
copyFileSync(src, new URL('c2pa_bg.wasm', dir))
console.log('c2pa wasm → public/c2pa/c2pa_bg.wasm')
