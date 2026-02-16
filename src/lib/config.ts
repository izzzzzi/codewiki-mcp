export interface CodeWikiConfig {
  baseUrl: string
  requestTimeout: number
  maxRetries: number
  retryDelay: number
  githubToken?: string
}

const defaults: CodeWikiConfig = {
  baseUrl: 'https://codewiki.google',
  requestTimeout: 30_000,
  maxRetries: 3,
  retryDelay: 250,
}

export function loadConfig(env: Record<string, string | undefined> = process.env): CodeWikiConfig {
  return {
    baseUrl: env.CODEWIKI_BASE_URL ?? defaults.baseUrl,
    requestTimeout: parsePositiveInt(env.CODEWIKI_REQUEST_TIMEOUT, defaults.requestTimeout),
    maxRetries: parsePositiveInt(env.CODEWIKI_MAX_RETRIES, defaults.maxRetries),
    retryDelay: parsePositiveInt(env.CODEWIKI_RETRY_DELAY, defaults.retryDelay),
    githubToken: env.GITHUB_TOKEN || undefined,
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}
