import type { CodeWikiConfig } from './config.js'
import { extractRpcPayload } from './batchexecute.js'
import { CodeWikiError } from './errors.js'
import { normalizeRepoInput } from './repo.js'

/** RPC IDs for codewiki.google batchexecute endpoints */
const RPC_SEARCH = 'vyWDAf'
const RPC_FETCH = 'VSX6ub'
const RPC_ASK = 'EgIxfe'

export interface CodeWikiClientOptions {
  baseUrl?: string
  timeoutMs?: number
  maxRetries?: number
  retryDelay?: number
}

export interface SearchRepoResult {
  fullName: string
  url: string | null
  description: string | null
  avatarUrl: string | null
  extraScore: number | null
  raw: unknown
}

export interface WikiSection {
  title: string
  level: number
  summary: string | null
  markdown: string
  anchor: string | null
  diagramCount: number
  raw: unknown
}

export interface FetchRepositoryResult {
  repo: string
  commit: string | null
  canonicalUrl: string | null
  sections: WikiSection[]
  raw: unknown
}

export interface AskHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ResponseMeta {
  totalBytes: number
  totalElapsedMs: number
}

export interface WithMeta<T> {
  data: T
  meta: ResponseMeta
}

export class CodeWikiClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly retryDelay: number

  constructor(options: CodeWikiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://codewiki.google'
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 250
  }

  static fromConfig(config: CodeWikiConfig): CodeWikiClient {
    return new CodeWikiClient({
      baseUrl: config.baseUrl,
      timeoutMs: config.requestTimeout,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    })
  }

  async searchRepositories(query: string, limit = 10): Promise<WithMeta<SearchRepoResult[]>> {
    const start = performance.now()
    const { payload, bytes } = await this.callRpc(RPC_SEARCH, [query, limit, query, 0], { sourcePath: '/' })

    const rows = Array.isArray(payload) && Array.isArray(payload[0])
      ? payload[0]
      : []

    const data = rows
      .filter((item): item is unknown[] => Array.isArray(item))
      .map((item) => {
        const fullName = typeof item[0] === 'string' ? item[0] : 'unknown/unknown'
        const url = Array.isArray(item[3]) && typeof item[3][1] === 'string' ? item[3][1] : null

        let description: string | null = null
        let avatarUrl: string | null = null
        let extraScore: number | null = null
        if (Array.isArray(item[5])) {
          description = typeof item[5][0] === 'string' ? item[5][0] : null
          avatarUrl = typeof item[5][1] === 'string' ? item[5][1] : null
          extraScore = typeof item[5][2] === 'number' ? item[5][2] : null
        }

        return {
          fullName,
          url,
          description,
          avatarUrl,
          extraScore,
          raw: item,
        }
      })

    return {
      data,
      meta: { totalBytes: bytes, totalElapsedMs: Math.round(performance.now() - start) },
    }
  }

  async fetchRepository(repoInput: string): Promise<WithMeta<FetchRepositoryResult>> {
    const start = performance.now()
    const repo = normalizeRepoInput(repoInput)

    const { payload, bytes } = await this.callRpc(RPC_FETCH, [repo.repoUrl], {
      sourcePath: repo.sourcePath,
    })

    const root = Array.isArray(payload) ? payload : []
    const primary = Array.isArray(root[0]) ? root[0] : []
    const repoInfo = Array.isArray(primary[0]) ? primary[0] : []
    const sectionsRaw = Array.isArray(primary[1]) ? primary[1] : []

    const canonicalUrl =
      Array.isArray(root[1])
      && Array.isArray(root[1][0])
      && typeof root[1][0][1] === 'string'
        ? root[1][0][1]
        : null

    const repoName = typeof repoInfo[0] === 'string' ? repoInfo[0] : repo.repoPath
    const commit = typeof repoInfo[1] === 'string' ? repoInfo[1] : null

    const sections: WikiSection[] = sectionsRaw
      .filter((item): item is unknown[] => Array.isArray(item))
      .map((item) => {
        const title = typeof item[0] === 'string' ? item[0] : 'Untitled'

        const rawLevel = item[1]
        const level = typeof rawLevel === 'number' && Number.isFinite(rawLevel)
          ? Math.max(1, Math.min(6, Math.floor(rawLevel)))
          : 1

        const summary = typeof item[2] === 'string' ? item[2] : null
        const markdown = typeof item[5] === 'string'
          ? item[5]
          : typeof item[4] === 'string'
            ? item[4]
            : (summary ?? '')

        let diagramCount = 0
        if (Array.isArray(item[7])) {
          diagramCount = item[7].length
        }

        const anchor = [...item]
          .reverse()
          .find((value): value is string => typeof value === 'string' && value.startsWith('#')) ?? null

        return {
          title,
          level,
          summary,
          markdown,
          anchor,
          diagramCount,
          raw: item,
        }
      })

    return {
      data: {
        repo: repoName,
        commit,
        canonicalUrl,
        sections,
        raw: payload,
      },
      meta: { totalBytes: bytes, totalElapsedMs: Math.round(performance.now() - start) },
    }
  }

  async askRepository(repoInput: string, question: string, history: AskHistoryItem[] = []): Promise<WithMeta<string>> {
    const start = performance.now()
    const repo = normalizeRepoInput(repoInput)

    const messages: [string, 'user' | 'model'][] = [
      ...history.map(item => [item.content, item.role === 'assistant' ? 'model' : 'user'] as [string, 'user' | 'model']),
      [question, 'user'],
    ]

    const { payload, bytes } = await this.callRpc(RPC_ASK, [messages, [null, repo.repoUrl]], {
      sourcePath: repo.sourcePath,
    })

    let data: string
    if (Array.isArray(payload) && typeof payload[0] === 'string') {
      data = payload[0]
    } else if (typeof payload === 'string') {
      data = payload
    } else {
      data = JSON.stringify(payload, null, 2)
    }

    return {
      data,
      meta: { totalBytes: bytes, totalElapsedMs: Math.round(performance.now() - start) },
    }
  }

  private async callRpc(
    rpcId: string,
    rpcPayload: unknown,
    options: { sourcePath?: string } = {},
  ): Promise<{ payload: unknown; bytes: number }> {
    const url = new URL(`${this.baseUrl}/_/BoqAngularSdlcAgentsUi/data/batchexecute`)
    url.searchParams.set('rpcids', rpcId)
    url.searchParams.set('rt', 'c')

    if (options.sourcePath) {
      url.searchParams.set('source-path', options.sourcePath)
    }

    const bodyObject = [[[rpcId, JSON.stringify(rpcPayload), null, 'generic']]]
    const body = `f.req=${encodeURIComponent(JSON.stringify(bodyObject))}&`

    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), this.timeoutMs)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body,
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new CodeWikiError('RPC_FAIL', `CodeWiki RPC ${rpcId} failed with status ${response.status}`, {
            statusCode: response.status,
            rpcId,
          })
        }

        const text = await response.text()
        const bytes = Buffer.byteLength(text, 'utf8')
        const payload = extractRpcPayload(text, rpcId)
        return { payload, bytes }
      } catch (err) {
        lastError = err

        if (err instanceof CodeWikiError && err.code === 'RPC_FAIL' && err.statusCode && err.statusCode < 500) {
          throw err
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new CodeWikiError('TIMEOUT', `CodeWiki RPC ${rpcId} timed out after ${this.timeoutMs}ms`, {
            rpcId,
            cause: err,
          })
          if (attempt === this.maxRetries) throw lastError
          continue
        }

        if (attempt === this.maxRetries) {
          if (err instanceof CodeWikiError) throw err
          throw new CodeWikiError('RPC_FAIL', `CodeWiki RPC ${rpcId} failed: ${err instanceof Error ? err.message : String(err)}`, {
            rpcId,
            cause: err,
          })
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    throw lastError
  }
}
