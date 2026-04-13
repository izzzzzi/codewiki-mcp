import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/lib/config.js'

describe('loadConfig', () => {
  it('returns defaults when no env vars set', () => {
    const config = loadConfig({})
    expect(config.baseUrl).toBe('https://codewiki.google')
    expect(config.requestTimeout).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryDelay).toBe(250)
    expect(config.githubToken).toBeUndefined()
  })

  it('reads env vars when set', () => {
    const config = loadConfig({
      CODEWIKI_BASE_URL: 'https://custom.host',
      CODEWIKI_REQUEST_TIMEOUT: '5000',
      CODEWIKI_MAX_RETRIES: '5',
      CODEWIKI_RETRY_DELAY: '100',
      GITHUB_TOKEN: 'ghp_test123',
    })
    expect(config.baseUrl).toBe('https://custom.host')
    expect(config.requestTimeout).toBe(5000)
    expect(config.maxRetries).toBe(5)
    expect(config.retryDelay).toBe(100)
    expect(config.githubToken).toBe('ghp_test123')
  })

  it('falls back to defaults for invalid numbers', () => {
    const config = loadConfig({
      CODEWIKI_REQUEST_TIMEOUT: 'not-a-number',
      CODEWIKI_MAX_RETRIES: '-1',
      CODEWIKI_RETRY_DELAY: '0',
    })
    expect(config.requestTimeout).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryDelay).toBe(250)
  })

  it('treats empty GITHUB_TOKEN as undefined', () => {
    const config = loadConfig({ GITHUB_TOKEN: '' })
    expect(config.githubToken).toBeUndefined()
  })
})
