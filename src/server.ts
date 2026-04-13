import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
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
let sessionCleanup: (() => Promise<void>) | undefined

export async function startServer(
  mcpOrFactory: McpServer | McpServerFactory,
  options: ServerOptions,
): Promise<void> {
  if (httpServer) {
    throw new Error('Server is already running. Call stopServer() before starting a new one.')
  }

  const { transport, port = 3000, endpoint = '/mcp' } = options

  const getMcp = typeof mcpOrFactory === 'function' ? mcpOrFactory : () => mcpOrFactory

  if (transport === 'stdio') {
    const stdioTransport = new StdioServerTransport()
    await getMcp().connect(stdioTransport)
    return
  }

  if (transport === 'http') {
    if (typeof mcpOrFactory !== 'function') {
      throw new Error(
        'HTTP transport requires a McpServerFactory (a function returning a new McpServer) ' +
        'because each HTTP client needs its own McpServer instance. ' +
        'Pass () => createMcpServer(config) instead of a single McpServer.',
      )
    }

    const sessions = new Map<string, StreamableHTTPServerTransport>()

    sessionCleanup = async () => {
      for (const [id, transport] of sessions) {
        try { await transport.close() } catch { /* ignore */ }
        sessions.delete(id)
      }
    }

    httpServer = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost:${port}`)

        if (url.pathname !== endpoint) {
          res.writeHead(404).end('Not Found')
          return
        }

        const sessionId = req.headers['mcp-session-id'] as string | undefined

        if (req.method === 'GET' || req.method === 'DELETE') {
          const transport = sessionId ? sessions.get(sessionId) : undefined
          if (!transport) {
            res.writeHead(400).end('Invalid or missing session ID')
            return
          }
          await transport.handleRequest(req, res)
          return
        }

        if (req.method === 'POST') {
          if (sessionId && sessions.has(sessionId)) {
            await sessions.get(sessionId)!.handleRequest(req, res)
            return
          }

          // Parse body to check if this is an initialization request
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
          }
          const bodyText = Buffer.concat(chunks).toString('utf-8')
          let body: unknown
          try {
            body = JSON.parse(bodyText)
          } catch {
            res.writeHead(400).end('Invalid JSON')
            return
          }

          if (!isInitializeRequest(body)) {
            res.writeHead(400).end('Bad Request: No valid session ID provided')
            return
          }

          const httpTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              sessions.set(id, httpTransport)
            },
          })

          httpTransport.onclose = () => {
            const sid = httpTransport.sessionId
            if (sid) sessions.delete(sid)
          }

          const sessionMcp = mcpOrFactory()
          await sessionMcp.connect(httpTransport)
          await httpTransport.handleRequest(req, res, body)
          return
        }

        res.writeHead(405).end('Method Not Allowed')
      } catch (error) {
        console.error('Error handling MCP request:', error)
        if (!res.headersSent) {
          res.writeHead(500).end('Internal Server Error')
        }
      }
    })

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

    sessionCleanup = async () => {
      for (const [id, transport] of sessions) {
        try { await transport.close() } catch { /* ignore */ }
        sessions.delete(id)
      }
    }

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
  if (sessionCleanup) {
    await sessionCleanup()
    sessionCleanup = undefined
  }
  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer!.close((err) => (err ? reject(err) : resolve()))
    })
    httpServer = undefined
  }
}
