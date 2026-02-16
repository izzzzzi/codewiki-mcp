import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeWikiClient } from '../src/lib/codewikiClient.js'

function makeRpcResponse(rpcId: string, payload: unknown): string {
  const wrbLine = JSON.stringify([[
    'wrb.fr',
    rpcId,
    JSON.stringify(payload),
    null,
    null,
    null,
    'generic',
  ]])
  return `)]}'\n\n${wrbLine}`
}

describe('CodeWikiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searchRepositories parses vyWDAf result', async () => {
    const payload = [[
      [
        'aiogram/aiogram',
        null,
        3,
        [null, 'https://github.com/aiogram/aiogram'],
        [123, 456],
        ['desc', 'https://img', 555, 'aiogram/aiogram'],
      ],
    ]]

    vi.stubGlobal('fetch', vi.fn(async () => new Response(makeRpcResponse('vyWDAf', payload), { status: 200 })))

    const client = new CodeWikiClient()
    const { data: result, meta } = await client.searchRepositories('aiogram', 5)

    expect(result).toHaveLength(1)
    expect(result[0].fullName).toBe('aiogram/aiogram')
    expect(result[0].url).toBe('https://github.com/aiogram/aiogram')
    expect(result[0].description).toBe('desc')
    expect(meta.totalBytes).toBeGreaterThan(0)
    expect(meta.totalElapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('fetchRepository parses VSX6ub result and sections', async () => {
    const payload = [
      [
        ['aiogram/aiogram', 'abc123'],
        [
          ['Overview', 1, 'summary text', null, 'markdown fallback', 'markdown main', 1, [[1]], null, '#overview'],
          ['Details', 2, null, null, 'details markdown'],
        ],
        null,
      ],
      [[null, 'https://github.com/aiogram/aiogram'], true, 3],
    ]

    vi.stubGlobal('fetch', vi.fn(async () => new Response(makeRpcResponse('VSX6ub', payload), { status: 200 })))

    const client = new CodeWikiClient()
    const { data: result, meta } = await client.fetchRepository('aiogram/aiogram')

    expect(result.repo).toBe('aiogram/aiogram')
    expect(result.commit).toBe('abc123')
    expect(result.canonicalUrl).toBe('https://github.com/aiogram/aiogram')
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0].title).toBe('Overview')
    expect(result.sections[0].markdown).toBe('markdown main')
    expect(result.sections[0].anchor).toBe('#overview')
    expect(result.sections[1].level).toBe(2)
    expect(meta.totalBytes).toBeGreaterThan(0)
  })

  it('askRepository parses EgIxfe answer', async () => {
    const payload = ['Final answer text']

    vi.stubGlobal('fetch', vi.fn(async () => new Response(makeRpcResponse('EgIxfe', payload), { status: 200 })))

    const client = new CodeWikiClient()
    const { data: answer, meta } = await client.askRepository('https://github.com/aiogram/aiogram', 'what is this?')

    expect(answer).toBe('Final answer text')
    expect(meta.totalBytes).toBeGreaterThan(0)
  })

  it('throws CodeWikiError on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad', { status: 500 })))

    const client = new CodeWikiClient({ maxRetries: 0 })
    await expect(client.searchRepositories('aiogram', 5)).rejects.toThrow('CodeWiki RPC vyWDAf failed with status 500')
  })

  it('retries on server error', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('bad', { status: 500 }))
      .mockResolvedValueOnce(new Response(makeRpcResponse('vyWDAf', [[]]), { status: 200 }))

    vi.stubGlobal('fetch', mockFetch)

    const client = new CodeWikiClient({ maxRetries: 1, retryDelay: 1 })
    const { data } = await client.searchRepositories('test', 1)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(data).toEqual([])
  })

  it('does not retry on 4xx errors', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue(new Response('bad', { status: 400 }))

    vi.stubGlobal('fetch', mockFetch)

    const client = new CodeWikiClient({ maxRetries: 3, retryDelay: 1 })
    await expect(client.searchRepositories('test', 1)).rejects.toThrow('failed with status 400')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('creates client from config', () => {
    const client = CodeWikiClient.fromConfig({
      baseUrl: 'https://custom.host',
      requestTimeout: 5000,
      maxRetries: 5,
      retryDelay: 100,
    })
    expect(client).toBeInstanceOf(CodeWikiClient)
  })
})
