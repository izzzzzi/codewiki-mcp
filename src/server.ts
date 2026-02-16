import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import type { CodeWikiConfig } from './lib/config.js'
import { CodeWikiClient } from './lib/codewikiClient.js'
import { registerSearchReposTool } from './tools/searchRepos.js'
import { registerFetchRepoTool } from './tools/fetchRepo.js'
import { registerAskRepoTool } from './tools/askRepo.js'

export interface ServerOptions {
  transport: 'stdio' | 'http' | 'sse'
  port?: number
  endpoint?: string
}

const VERSION = '0.2.0'

export function createMcpServer(config: CodeWikiConfig): McpServer {
  const mcp = new McpServer({
    name: 'codewiki-mcp',
    version: VERSION,
  })

  const client = CodeWikiClient.fromConfig(config)

  registerSearchReposTool(mcp, client)
  registerFetchRepoTool(mcp, client, config)
  registerAskRepoTool(mcp, client, config)

  return mcp
}

let httpServer: Server | undefined

export async function startServer(mcp: McpServer, options: ServerOptions): Promise<void> {
  const { transport, port = 3000, endpoint = '/mcp' } = options

  if (transport === 'stdio') {
    const stdioTransport = new StdioServerTransport()
    await mcp.connect(stdioTransport)
    return
  }

  if (transport === 'http') {
    const httpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    })

    httpServer = createServer(async (req, res) => {
      if (req.url === endpoint) {
        await httpTransport.handleRequest(req, res)
      } else {
        res.writeHead(404).end('Not Found')
      }
    })

    await mcp.connect(httpTransport)

    await new Promise<void>((resolve) => {
      httpServer!.listen(port, () => {
        console.error(`codewiki-mcp HTTP server listening on http://localhost:${port}${endpoint}`)
        resolve()
      })
    })
    return
  }

  if (transport === 'sse') {
    const sessions = new Map<string, SSEServerTransport>()

    httpServer = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)

      if (url.pathname === endpoint && req.method === 'GET') {
        const sseTransport = new SSEServerTransport(`${endpoint}/message`, res)
        sessions.set(sseTransport.sessionId, sseTransport)

        sseTransport.onclose = () => {
          sessions.delete(sseTransport.sessionId)
        }

        await mcp.connect(sseTransport)
        return
      }

      if (url.pathname === `${endpoint}/message` && req.method === 'POST') {
        const sessionId = url.searchParams.get('sessionId')
        const sseTransport = sessionId ? sessions.get(sessionId) : undefined
        if (!sseTransport) {
          res.writeHead(400).end('Invalid or missing sessionId')
          return
        }
        await sseTransport.handlePostMessage(req, res)
        return
      }

      res.writeHead(404).end('Not Found')
    })

    await new Promise<void>((resolve) => {
      httpServer!.listen(port, () => {
        console.error(`codewiki-mcp SSE server listening on http://localhost:${port}${endpoint}`)
        resolve()
      })
    })
    return
  }
}

export async function stopServer(): Promise<void> {
  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer!.close((err) => (err ? reject(err) : resolve()))
    })
    httpServer = undefined
  }
}
