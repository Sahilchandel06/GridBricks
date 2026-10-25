import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const browser = await chromium.launch({ headless: true })
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots')
await mkdir(output, { recursive: true })

for (const viewport of [
  { name: 'p4-desktop', width: 1440, height: 1000 },
  { name: 'p4-mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:5173/decision', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(output, `${viewport.name}.png`), fullPage: true })
  await page.close()
}

await browser.close()
