import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CodeWikiClient, WikiSection } from '../lib/codewikiClient.js'
import type { CodeWikiConfig } from '../lib/config.js'
import { formatMcpError } from '../lib/errors.js'
import { resolveRepoInput } from '../lib/repo.js'
import { FetchRepoInput } from '../schemas.js'

function toSectionMarkdown(section: WikiSection): string {
  const depth = Math.max(1, Math.min(6, section.level))
  const heading = '#'.repeat(depth)
  const body = section.markdown || section.summary || ''
  return `${heading} ${section.title}\n\n${body}`.trim()
}

export function registerFetchRepoTool(mcp: McpServer, client: CodeWikiClient, config?: CodeWikiConfig): void {
  mcp.tool(
    'codewiki_fetch_repo',
    'Fetch generated wiki content for a repository from codewiki.google',
    FetchRepoInput.shape,
    async (rawInput) => {
      const parsed = FetchRepoInput.safeParse(rawInput)
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Invalid arguments: ${parsed.error.message}` }],
          isError: true,
        }
      }

      try {
        const { repo, mode } = parsed.data
        const resolved = await resolveRepoInput(repo, config)
        const { data: result, meta } = await client.fetchRepository(resolved.repoUrl)

        if (mode === 'pages') {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                repo: result.repo,
                commit: result.commit,
                canonicalUrl: result.canonicalUrl,
                pages: result.sections.map(section => ({
                  title: section.title,
                  level: section.level,
                  anchor: section.anchor,
                  markdown: section.markdown,
                  diagramCount: section.diagramCount,
                })),
                meta,
              }, null, 2),
            }],
          }
        }

        const aggregate = result.sections.map(toSectionMarkdown).join('\n\n')
        const preface = [
          `Repository: ${result.repo}`,
          `Commit: ${result.commit ?? 'unknown'}`,
          result.canonicalUrl ? `Canonical URL: ${result.canonicalUrl}` : null,
          `Response: ${meta.totalBytes} bytes in ${meta.totalElapsedMs}ms`,
        ].filter(Boolean).join('\n')

        return {
          content: [{
            type: 'text',
            text: `${preface}\n\n${aggregate}`.trim(),
          }],
        }
      } catch (err) {
        return formatMcpError(err)
      }
    },
  )
}
