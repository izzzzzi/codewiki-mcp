import { z } from 'zod'

export type { ErrorEnvelope } from './lib/errors.js'

export const SearchReposInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
})

export const FetchRepoInput = z.object({
  repo: z.string().min(1),
  mode: z.enum(['aggregate', 'pages']).default('aggregate'),
})

export const AskRepoInput = z.object({
  repo: z.string().min(1),
  question: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).max(20).optional(),
})
