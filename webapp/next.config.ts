import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// รุ่นของแอปจาก package.json + commit ที่ build (แสดงที่ footer) — ไม่มี git ก็แสดงแค่เลขรุ่น
const { version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
let commit = ''
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {}

const nextConfig: NextConfig = {
  // สร้าง .next/standalone ที่มี server.js พร้อมรันบน Azure App Service โดยไม่ต้อง npm install บนเครื่องปลายทาง
  output: 'standalone',
  env: { NEXT_PUBLIC_APP_VERSION: version, NEXT_PUBLIC_APP_COMMIT: commit },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
