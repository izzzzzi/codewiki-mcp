import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AskHistoryItem, CodeWikiClient } from '../lib/codewikiClient.js'
import type { CodeWikiConfig } from '../lib/config.js'
import { formatMcpError } from '../lib/errors.js'
import { resolveRepoInput } from '../lib/repo.js'
import { AskRepoInput } from '../schemas.js'

export function registerAskRepoTool(mcp: McpServer, client: CodeWikiClient, config?: CodeWikiConfig): void {
  mcp.tool(
    'codewiki_ask_repo',
    'Ask a natural-language question about a repository indexed in codewiki.google',
    AskRepoInput.shape,
    async (rawInput) => {
      const parsed = AskRepoInput.safeParse(rawInput)
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        }
      }

      try {
        const { repo, question, history } = parsed.data
        const resolved = await resolveRepoInput(repo, config)
        const { data: answer, meta } = await client.askRepository(resolved.repoUrl, question, history as AskHistoryItem[] | undefined)

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ answer, meta }, null, 2),
          }],
        }
      } catch (err) {
        return formatMcpError(err)
      }
    },
  )
}
