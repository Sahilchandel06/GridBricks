/* global document, window */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const browser = await chromium.launch({ headless: true })
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots')
await mkdir(output, { recursive: true })

for (const viewport of [
  { name: 'p7-desktop', width: 1440, height: 1000 },
  { name: 'p7-mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:8000/method', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Method & sources' }).waitFor()
  await page.getByRole('link', { name: 'FUELHH stream documentation' }).waitFor()
  await page.screenshot({ path: resolve(output, `${viewport.name}.png`), fullPage: true })
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (hasOverflow) throw new Error(`${viewport.name} has horizontal overflow`)
  await page.close()
}

await browser.close()
