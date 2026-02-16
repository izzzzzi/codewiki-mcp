import type { CodeWikiConfig } from './config.js'
import { CodeWikiError } from './errors.js'

interface GitHubSearchItem {
  full_name: string
}

interface GitHubSearchResponse {
  items?: GitHubSearchItem[]
}

export async function resolveRepoFromGitHub(
  keyword: string,
  config: Pick<CodeWikiConfig, 'githubToken' | 'requestTimeout'>,
): Promise<string> {
  const url = new URL('https://api.github.com/search/repositories')
  url.searchParams.set('q', keyword)
  url.searchParams.set('sort', 'stars')
  url.searchParams.set('per_page', '1')

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'codewiki-mcp',
  }
  if (config.githubToken) {
    headers['Authorization'] = `Bearer ${config.githubToken}`
  }

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), config.requestTimeout)

  try {
    const response = await fetch(url, {
      headers,
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new CodeWikiError('NLP_RESOLVE_FAIL', `GitHub search failed with status ${response.status}`, {
        statusCode: response.status,
      })
    }

    const body = await response.json() as GitHubSearchResponse
    const firstItem = body.items?.[0]

    if (!firstItem) {
      throw new CodeWikiError('NLP_RESOLVE_FAIL', `No GitHub repository found for "${keyword}"`)
    }

    return firstItem.full_name
  } catch (err) {
    if (err instanceof CodeWikiError) throw err
    throw new CodeWikiError('NLP_RESOLVE_FAIL', `Failed to resolve "${keyword}": ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    })
  } finally {
    clearTimeout(timeout)
  }
}
