#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { loadConfig } from './lib/config.js'
import { createMcpServer, startServer, stopServer } from './server.js'

const HELP = `
codewiki-mcp — MCP server for codewiki.google

Usage:
  codewiki-mcp              Start with stdio transport (default)
  codewiki-mcp --http       Start with Streamable HTTP transport
  codewiki-mcp --sse        Start with SSE transport

Options:
  --http           Use Streamable HTTP transport
  --sse            Use SSE transport
  --port <number>  Port for HTTP/SSE (default: 3000)
  --endpoint <str> URL endpoint (default: /mcp)
  --help           Show this help message

Environment variables:
  CODEWIKI_BASE_URL         Base URL (default: https://codewiki.google)
  CODEWIKI_REQUEST_TIMEOUT  Request timeout in ms (default: 30000)
  CODEWIKI_MAX_RETRIES      Max retries (default: 3)
  CODEWIKI_RETRY_DELAY      Base retry delay in ms (default: 250)
  GITHUB_TOKEN              GitHub token for NLP repo resolution
`.trim()

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      http: { type: 'boolean', default: false },
      sse: { type: 'boolean', default: false },
      port: { type: 'string', default: '3000' },
      endpoint: { type: 'string', default: '/mcp' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })

  if (values.help) {
    console.log(HELP)
    process.exit(0)
  }

  const transport = values.http ? 'http' : values.sse ? 'sse' : 'stdio'
  const port = Number.parseInt(values.port!, 10) || 3000
  const endpoint = values.endpoint!

  const config = loadConfig()

  const shutdown = async () => {
    await stopServer()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  if (transport === 'sse') {
    await startServer(() => createMcpServer(config), { transport, port, endpoint })
  } else {
    const mcp = createMcpServer(config)
    await startServer(mcp, { transport, port, endpoint })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
