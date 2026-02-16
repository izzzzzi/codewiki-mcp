import type { CodeWikiConfig } from './config.js'
import { extractKeyword } from './extractKeyword.js'
import { resolveRepoFromGitHub } from './resolveRepo.js'

export interface NormalizedRepo {
  host: string
  repoPath: string
  repoUrl: string
  sourcePath: string
}

export function normalizeRepoInput(input: string): NormalizedRepo {
  const raw = input.trim()
  if (!raw) {
    throw new Error('Repository input is empty')
  }

  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw)
    const repoPath = url.pathname.replace(/^\/+|\/+$/g, '')
    const parts = repoPath.split('/').filter(Boolean)
    if (parts.length < 2) {
      throw new Error('Expected repository URL in the format https://host/owner/repo')
    }

    const normalizedPath = `${parts[0]}/${parts[1]}`
    return {
      host: url.hostname,
      repoPath: normalizedPath,
      repoUrl: `https://${url.hostname}/${normalizedPath}`,
      sourcePath: `/${url.hostname}/${normalizedPath}`,
    }
  }

  const parts = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (parts.length !== 2) {
    throw new Error('Expected repository in owner/repo format or full URL')
  }

  const repoPath = `${parts[0]}/${parts[1]}`
  return {
    host: 'github.com',
    repoPath,
    repoUrl: `https://github.com/${repoPath}`,
    sourcePath: `/github.com/${repoPath}`,
  }
}

export async function resolveRepoInput(
  input: string,
  config?: Pick<CodeWikiConfig, 'githubToken' | 'requestTimeout'>,
): Promise<NormalizedRepo> {
  const raw = input.trim()

  // URL → sync
  if (/^https?:\/\//i.test(raw)) {
    return normalizeRepoInput(raw)
  }

  // owner/repo → sync
  const parts = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (parts.length === 2) {
    return normalizeRepoInput(raw)
  }

  // Natural language → NLP → GitHub search → normalize
  const keyword = extractKeyword(raw) ?? raw
  const fullName = await resolveRepoFromGitHub(keyword, config ?? { requestTimeout: 30_000 })
  return normalizeRepoInput(fullName)
}
