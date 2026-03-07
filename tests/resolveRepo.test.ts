import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveRepoFromGitHub } from '../src/lib/resolveRepo.js'
import { normalizeRepoInput, resolveRepoInput } from '../src/lib/repo.js'

describe('resolveRepoFromGitHub', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves keyword to full_name from GitHub API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ items: [{ full_name: 'fastify/fastify' }] }),
      { status: 200 },
    )))

    const result = await resolveRepoFromGitHub('fastify', { requestTimeout: 5000 })
    expect(result).toBe('fastify/fastify')
  })

  it('throws NLP_RESOLVE_FAIL when no items found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ items: [] }),
      { status: 200 },
    )))

    await expect(
      resolveRepoFromGitHub('nonexistent-xyz-abc', { requestTimeout: 5000 }),
    ).rejects.toThrow('No GitHub repository found')
  })

  it('throws NLP_RESOLVE_FAIL on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403 })))

    await expect(
      resolveRepoFromGitHub('test', { requestTimeout: 5000 }),
    ).rejects.toThrow('GitHub search failed with status 403')
  })

  it('includes auth header when token provided', async () => {
    const mockFetch = vi.fn(async () => new Response(
      JSON.stringify({ items: [{ full_name: 'owner/repo' }] }),
      { status: 200 },
    ))
    vi.stubGlobal('fetch', mockFetch)

    await resolveRepoFromGitHub('test', { requestTimeout: 5000, githubToken: 'ghp_test' })

    const callArgs = mockFetch.mock.calls[0]
    const headers = callArgs[1]?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer ghp_test')
  })
})

describe('resolveRepoInput', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves URL synchronously', async () => {
    const result = await resolveRepoInput('https://github.com/fastify/fastify')
    expect(result.repoPath).toBe('fastify/fastify')
    expect(result.host).toBe('github.com')
  })

  it('resolves owner/repo synchronously', async () => {
    const result = await resolveRepoInput('fastify/fastify')
    expect(result.repoPath).toBe('fastify/fastify')
  })

  it('resolves natural language via NLP + GitHub', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ items: [{ full_name: 'fastify/fastify' }] }),
      { status: 200 },
    )))

    const result = await resolveRepoInput('the fastify web framework')
    expect(result.repoPath).toBe('fastify/fastify')
  })

  it('rejects non-GitHub URL', async () => {
    await expect(
      resolveRepoInput('https://gitlab.com/owner/repo'),
    ).rejects.toThrow('Only GitHub repositories are supported')
  })
})

describe('normalizeRepoInput', () => {
  it('rejects non-GitHub host', () => {
    expect(() => normalizeRepoInput('https://gitlab.com/owner/repo')).toThrow(
      'Only GitHub repositories are supported',
    )
  })

  it('accepts GitHub URL', () => {
    const result = normalizeRepoInput('https://github.com/owner/repo')
    expect(result.host).toBe('github.com')
    expect(result.repoPath).toBe('owner/repo')
  })
})
