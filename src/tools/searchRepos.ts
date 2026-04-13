import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CodeWikiClient } from '../lib/codewikiClient.js'
import { formatMcpError } from '../lib/errors.js'
import { SearchReposInput } from '../schemas.js'

export function registerSearchReposTool(mcp: McpServer, client: CodeWikiClient): void {
  mcp.tool(
    'codewiki_search_repos',
    'Search repositories indexed by codewiki.google',
    SearchReposInput.shape,
    async (rawInput) => {
      const parsed = SearchReposInput.safeParse(rawInput)
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        }
      }

      try {
        const { query, limit } = parsed.data
        const { data: items, meta } = await client.searchRepositories(query, limit)

        const cleanItems = items.map(({ raw, ...rest }) => rest)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query,
              count: cleanItems.length,
              items: cleanItems,
              meta,
            }, null, 2),
          }],
        }
      } catch (err) {
        return formatMcpError(err)
      }
    },
  )
}
