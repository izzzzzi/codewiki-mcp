import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/lib/config.js'
import { CodeWikiError, formatMcpError } from '../src/lib/errors.js'

describe('CodeWikiError', () => {
  it('creates error with code and message', () => {
    const err = new CodeWikiError('RPC_FAIL', 'request failed')
    expect(err.name).toBe('CodeWikiError')
    expect(err.code).toBe('RPC_FAIL')
    expect(err.message).toBe('request failed')
    expect(err.statusCode).toBeUndefined()
    expect(err.rpcId).toBeUndefined()
  })

  it('creates error with optional fields', () => {
    const err = new CodeWikiError('TIMEOUT', 'timed out', {
      statusCode: 504,
      rpcId: 'vyWDAf',
    })
    expect(err.code).toBe('TIMEOUT')
    expect(err.statusCode).toBe(504)
    expect(err.rpcId).toBe('vyWDAf')
  })

  it('preserves cause', () => {
    const cause = new Error('original')
    const err = new CodeWikiError('RPC_FAIL', 'wrapped', { cause })
    expect((err as any).cause).toBe(cause)
  })

  it('is an instance of Error', () => {
    const err = new CodeWikiError('VALIDATION', 'bad input')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(CodeWikiError)
  })
})

describe('formatMcpError', () => {
  it('formats CodeWikiError as structured envelope', () => {
    const err = new CodeWikiError('RPC_FAIL', 'server error', {
      statusCode: 500,
      rpcId: 'VSX6ub',
    })
    const result = formatMcpError(err)

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error.code).toBe('RPC_FAIL')
    expect(parsed.error.message).toBe('server error')
    expect(parsed.error.statusCode).toBe(500)
    expect(parsed.error.rpcId).toBe('VSX6ub')
  })

  it('formats plain Error as RPC_FAIL envelope', () => {
    const err = new Error('something broke')
    const result = formatMcpError(err)

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error.code).toBe('RPC_FAIL')
    expect(parsed.error.message).toBe('something broke')
  })

  it('formats string error', () => {
    const result = formatMcpError('raw string error')

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error.code).toBe('RPC_FAIL')
    expect(parsed.error.message).toBe('raw string error')
  })

  it('omits optional fields when not present', () => {
    const err = new CodeWikiError('VALIDATION', 'bad')
    const result = formatMcpError(err)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error.rpcId).toBeUndefined()
    expect(parsed.error.statusCode).toBeUndefined()
  })
})

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
