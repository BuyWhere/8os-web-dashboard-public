import { test, expect } from '@playwright/test'

test('no Telegram env var warning on /login', async ({ page }) => {
  const consoleLogs: string[] = []
  const consoleWarnings: string[] = []

  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'log') consoleLogs.push(text)
    if (msg.type() === 'warning') consoleWarnings.push(text)
  })

  await page.goto('https://8os.ai/login')
  await page.waitForLoadState('networkidle')

  // Filter for Telegram-related messages
  const telegramLogs = consoleLogs.filter(t => t.toLowerCase().includes('telegram'))
  const telegramWarnings = consoleWarnings.filter(t => t.toLowerCase().includes('telegram'))

  console.log('Telegram logs:', telegramLogs)
  console.log('Telegram warnings:', telegramWarnings)

  expect(telegramWarnings).toHaveLength(0)
})

test('no Telegram env var warning on /signup', async ({ page }) => {
  const consoleLogs: string[] = []
  const consoleWarnings: string[] = []

  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'log') consoleLogs.push(text)
    if (msg.type() === 'warning') consoleWarnings.push(text)
  })

  await page.goto('https://8os.ai/signup')
  await page.waitForLoadState('networkidle')

  // Filter for Telegram-related messages
  const telegramLogs = consoleLogs.filter(t => t.toLowerCase().includes('telegram'))
  const telegramWarnings = consoleWarnings.filter(t => t.toLowerCase().includes('telegram'))

  console.log('Telegram logs:', telegramLogs)
  console.log('Telegram warnings:', telegramWarnings)

  expect(telegramWarnings).toHaveLength(0)
})
