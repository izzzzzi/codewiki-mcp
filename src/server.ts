import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { CodeWikiConfig } from './lib/config.js'
import { CodeWikiClient } from './lib/codewikiClient.js'
import { registerSearchReposTool } from './tools/searchRepos.js'
import { registerFetchRepoTool } from './tools/fetchRepo.js'
import { registerAskRepoTool } from './tools/askRepo.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'))

export interface ServerOptions {
  transport: 'stdio' | 'http' | 'sse'
  port?: number
  endpoint?: string
}

export type McpServerFactory = () => McpServer

export function createMcpServer(config: CodeWikiConfig): McpServer {
  const mcp = new McpServer({
    name: 'codewiki-mcp',
    version: pkg.version as string,
  })

  const client = CodeWikiClient.fromConfig(config)

  registerSearchReposTool(mcp, client)
  registerFetchRepoTool(mcp, client, config)
  registerAskRepoTool(mcp, client, config)

  return mcp
}

let httpServer: Server | undefined

export async function startServer(
  mcpOrFactory: McpServer | McpServerFactory,
  options: ServerOptions,
): Promise<void> {
  const { transport, port = 3000, endpoint = '/mcp' } = options

  const getMcp = typeof mcpOrFactory === 'function' ? mcpOrFactory : () => mcpOrFactory

  if (transport === 'stdio') {
    const stdioTransport = new StdioServerTransport()
    await getMcp().connect(stdioTransport)
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

    await getMcp().connect(httpTransport)

    await new Promise<void>((resolve) => {
      httpServer!.listen(port, () => {
        console.error(`codewiki-mcp HTTP server listening on http://localhost:${port}${endpoint}`)
        resolve()
      })
    })
    return
  }

  if (transport === 'sse') {
    if (typeof mcpOrFactory !== 'function') {
      throw new Error(
        'SSE transport requires a McpServerFactory (a function returning a new McpServer) ' +
        'because each SSE client needs its own McpServer instance. ' +
        'Pass () => createMcpServer(config) instead of a single McpServer.',
      )
    }

    const sessions = new Map<string, SSEServerTransport>()

    httpServer = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)

      if (url.pathname === endpoint && req.method === 'GET') {
        const sseTransport = new SSEServerTransport(`${endpoint}/message`, res)
        sessions.set(sseTransport.sessionId, sseTransport)

        sseTransport.onclose = () => {
          sessions.delete(sseTransport.sessionId)
        }

        const sessionMcp = mcpOrFactory()
        await sessionMcp.connect(sseTransport)
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
