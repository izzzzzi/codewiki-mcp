// Library re-exports
export { CodeWikiClient } from './lib/codewikiClient.js'
export type {
  CodeWikiClientOptions,
  SearchRepoResult,
  WikiSection,
  FetchRepositoryResult,
  AskHistoryItem,
  ResponseMeta,
  WithMeta,
} from './lib/codewikiClient.js'

export { CodeWikiError, formatMcpError } from './lib/errors.js'
export type { ErrorCode, ErrorEnvelope } from './lib/errors.js'

export { loadConfig } from './lib/config.js'
export type { CodeWikiConfig } from './lib/config.js'

export { normalizeRepoInput, resolveRepoInput } from './lib/repo.js'
export type { NormalizedRepo } from './lib/repo.js'

export { extractKeyword } from './lib/extractKeyword.js'
export { resolveRepoFromGitHub } from './lib/resolveRepo.js'

export { createMcpServer, startServer, stopServer } from './server.js'
export type { ServerOptions } from './server.js'

export { SearchReposInput, FetchRepoInput, AskRepoInput } from './schemas.js'

export { registerSearchReposTool } from './tools/searchRepos.js'
export { registerFetchRepoTool } from './tools/fetchRepo.js'
export { registerAskRepoTool } from './tools/askRepo.js'
