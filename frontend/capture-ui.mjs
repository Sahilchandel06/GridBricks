/* global document, window */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const browser = await chromium.launch({ headless: true })
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots')
await mkdir(output, { recursive: true })

for (const viewport of [
  { name: 'p5-desktop', width: 1440, height: 1000 },
  { name: 'p5-mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:5173/decision', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(output, `${viewport.name}.png`), fullPage: true })
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (hasOverflow) throw new Error(`${viewport.name} has horizontal overflow`)
  await page.selectOption('#decision-cutoff', '10:00')
  await page.waitForFunction(() => document.querySelector('.detail-list > div:first-child strong')?.textContent?.startsWith('10:00'))
  await page.selectOption('#decision-cutoff', '09:00')
  await page.locator('#delivery-date').fill('2026-01-16')
  await page.waitForFunction(() => document.querySelector('.decision-chart-card .surface-card__title')?.textContent?.startsWith('16 Jan 2026'))
  await page.close()
}

await browser.close()
