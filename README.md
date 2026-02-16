# codewiki-mcp

MCP server for [codewiki.google](https://codewiki.google) — search, fetch wiki docs, and ask questions about any open-source repository.

[Русская версия](README.ru.md)

## Features

- **3 MCP tools**: search repos, fetch wiki content, ask questions with conversation history
- **Multiple transports**: stdio (default), Streamable HTTP, SSE
- **NLP repo resolution**: natural-language input → GitHub search → `owner/repo` (via wink-nlp)
- **Retry with exponential backoff**: configurable retries for resilient API calls
- **Structured errors**: typed error codes (`VALIDATION`, `RPC_FAIL`, `TIMEOUT`, `NLP_RESOLVE_FAIL`)
- **Response metadata**: byte count and elapsed time on every response
- **Docker support**: multi-stage Alpine build
- **Claude Code skill**: prompt templates, workflow chains, error handling guide

## Usage

Prompts you can use in any MCP-compatible client:

```
codewiki fetch how routing works in Next.js
```

```
codewiki search state management libraries
```

```
codewiki ask how does React fiber reconciler work?
```

Fetch complete documentation:
```
codewiki fetch vercel/next.js
codewiki fetch https://github.com/fastify/fastify
```

Get structured pages:
```
codewiki fetch pages tailwindlabs/tailwindcss
```

Ask with natural language:
```
codewiki ask fastify how to add authentication?
```

## Quick Start

### Using npx (no install)

```bash
npx -y codewiki-mcp@latest
```

### From source

```bash
git clone https://github.com/nicholasxwang/codewiki-mcp.git
cd codewiki-mcp
npm install
npm run build
```

### stdio (default)

```bash
node dist/cli.js
```

### HTTP

```bash
node dist/cli.js --http --port 3000
```

### SSE

```bash
node dist/cli.js --sse --port 3001
```

### Docker

```bash
docker build -t codewiki-mcp .

# stdio
docker run -it --rm codewiki-mcp

# HTTP
docker run -p 3000:3000 codewiki-mcp --http

# with environment variables
docker run -p 3000:3000 \
  -e CODEWIKI_REQUEST_TIMEOUT=60000 \
  -e CODEWIKI_MAX_RETRIES=5 \
  -e GITHUB_TOKEN=ghp_your_token \
  codewiki-mcp --http
```

## MCP Client Configuration

### Cursor

Add to `.cursor/mcp.json` (or use the included one):

```json
{
  "mcpServers": {
    "codewiki-mcp": {
      "command": "npx",
      "args": ["-y", "codewiki-mcp@latest"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codewiki-mcp": {
      "command": "npx",
      "args": ["-y", "codewiki-mcp@latest"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add codewiki-mcp -- npx -y codewiki-mcp@latest
```

### Windsurf

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "codewiki-mcp": {
      "command": "npx",
      "args": ["-y", "codewiki-mcp@latest"]
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "codewiki-mcp": {
      "command": "npx",
      "args": ["-y", "codewiki-mcp@latest"]
    }
  }
}
```

### Local development config

```json
{
  "mcpServers": {
    "codewiki-mcp": {
      "command": "node",
      "args": ["/path/to/codewiki-mcp/dist/cli.js"]
    }
  }
}
```

## MCP Tools

### codewiki_search_repos

Search repositories indexed by codewiki.google.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | yes | — | Search query |
| `limit` | number | no | 10 | Max results (1–50) |

### codewiki_fetch_repo

Fetch generated wiki content for a repository.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `repo` | string | yes | — | `owner/repo`, GitHub URL, or natural-language query |
| `mode` | string | no | `"aggregate"` | `"aggregate"` — full markdown; `"pages"` — structured JSON |

### codewiki_ask_repo

Ask a natural-language question about a repository.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `repo` | string | yes | — | Repository identifier (same formats as fetch) |
| `question` | string | yes | — | Question about the repo |
| `history` | array | no | `[]` | Conversation history `[{role, content}]` (max 20) |

## Response Format

### Success — Search

```json
{
  "query": "fastify",
  "count": 1,
  "items": [
    {
      "fullName": "fastify/fastify",
      "url": "https://github.com/fastify/fastify",
      "description": "Fast and low overhead web framework",
      "avatarUrl": "https://avatars.githubusercontent.com/u/24939....",
      "extraScore": 555
    }
  ],
  "meta": {
    "totalBytes": 12500,
    "totalElapsedMs": 450
  }
}
```

### Success — Fetch (pages mode)

```json
{
  "repo": "fastify/fastify",
  "commit": "abc123",
  "canonicalUrl": "https://github.com/fastify/fastify",
  "pages": [
    {
      "title": "Overview",
      "level": 1,
      "anchor": "#overview",
      "markdown": "# Overview\n\nFastify is a web framework...",
      "diagramCount": 1
    }
  ],
  "meta": {
    "totalBytes": 25000,
    "totalElapsedMs": 1200
  }
}
```

### Success — Ask

```json
{
  "answer": "Fastify uses a plugin-based architecture where...",
  "meta": {
    "totalBytes": 8500,
    "totalElapsedMs": 2300
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "RPC_FAIL",
    "message": "CodeWiki RPC VSX6ub failed with status 404",
    "rpcId": "VSX6ub",
    "statusCode": 404
  }
}
```

### Direct API Calls (HTTP transport)

```bash
# Start server
node dist/cli.js --http --port 3000

# Search
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "codewiki_search_repos",
      "arguments": { "query": "fastify", "limit": 5 }
    }
  }'

# Fetch wiki
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "codewiki_fetch_repo",
      "arguments": { "repo": "fastify/fastify", "mode": "pages" }
    }
  }'
```

## How It Works

### Data Flow

```
Claude Code → MCP protocol → codewiki-mcp → HTTPS → codewiki.google
                                                          ↓
Claude Code ← MCP protocol ← codewiki-mcp ← JSON  ← Google RPC API
```

### Google Batchexecute RPC

codewiki.google uses Google's internal **batchexecute** RPC format (not REST, not GraphQL). The client:

1. Builds a POST request with `f.req=...` body
2. Sends it to `/_/BoqAngularSdlcAgentsUi/data/batchexecute`
3. Receives a response with XSSI prefix `)]}'\n`
4. Parses `wrb.fr` frames and extracts the typed payload

Each tool maps to an RPC ID:
- `vyWDAf` — search
- `VSX6ub` — fetch wiki
- `EgIxfe` — ask question

### NLP Repo Resolution

Users can type natural language instead of `owner/repo`:

```
"the fastify web framework"
  → wink-nlp extracts keyword "fastify" (POS tag: NOUN/PROPN)
  → GitHub Search API: GET /search/repositories?q=fastify&sort=stars
  → top result: "fastify/fastify"
  → normalizeRepoInput("fastify/fastify") → URL for codewiki
```

### Retry with Exponential Backoff

On 5xx errors or timeouts, the client retries automatically:

```
Attempt 0: immediate
Attempt 1: after 250ms
Attempt 2: after 500ms
Attempt 3: after 1000ms
```

4xx errors (client errors) are never retried.

## CLI

```
codewiki-mcp [options]

Options:
  --http           Streamable HTTP transport
  --sse            SSE transport
  --port <number>  Port for HTTP/SSE (default: 3000)
  --endpoint <str> URL endpoint (default: /mcp)
  --help, -h       Show help
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CODEWIKI_BASE_URL` | `https://codewiki.google` | Base URL |
| `CODEWIKI_REQUEST_TIMEOUT` | `30000` | Request timeout (ms) |
| `CODEWIKI_MAX_RETRIES` | `3` | Max retries |
| `CODEWIKI_RETRY_DELAY` | `250` | Base retry delay (ms) |
| `GITHUB_TOKEN` | — | GitHub token for NLP repo resolution |

You can also create a `.env` file in the project root:

```
CODEWIKI_REQUEST_TIMEOUT=60000
CODEWIKI_MAX_RETRIES=5
GITHUB_TOKEN=ghp_your_token
```

## Development

```bash
npm run dev          # stdio with tsx
npm run dev:http     # HTTP with tsx
npm run dev:sse      # SSE with tsx
npm run typecheck    # type check
npm run test         # run tests
npm run test:watch   # tests in watch mode
npm run build        # compile to dist/
```

## Project Structure

```
src/
├── cli.ts                  # CLI entry point
├── server.ts               # Transport setup (stdio/HTTP/SSE)
├── index.ts                # Library re-exports
├── schemas.ts              # Zod input schemas
├── lib/
│   ├── codewikiClient.ts   # API client with retry + metadata
│   ├── batchexecute.ts     # Google RPC response parser
│   ├── repo.ts             # Repo normalization + NLP resolution
│   ├── extractKeyword.ts   # NLP keyword extraction (wink-nlp)
│   ├── resolveRepo.ts      # GitHub Search API resolver
│   ├── errors.ts           # CodeWikiError + formatMcpError
│   └── config.ts           # Env-based configuration
└── tools/
    ├── searchRepos.ts      # codewiki_search_repos
    ├── fetchRepo.ts        # codewiki_fetch_repo
    └── askRepo.ts          # codewiki_ask_repo
```

## Troubleshooting

### Permission Denied

```bash
chmod +x ./node_modules/.bin/codewiki-mcp
```

### Connection Refused (HTTP/SSE)

```bash
# Check if port is in use
lsof -i :3000
```

### Timeout Errors

For large repositories, increase the timeout:

```bash
CODEWIKI_REQUEST_TIMEOUT=60000 node dist/cli.js
```

### NLP Resolution Fails

If natural-language input doesn't resolve, use explicit format:

```
# Instead of "the fastify framework"
fastify/fastify
# or
https://github.com/fastify/fastify
```

Set `GITHUB_TOKEN` to avoid GitHub API rate limits for unauthenticated requests.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
4. Run `npm run typecheck && npm run test` before submitting
5. Open a Pull Request

## License

MIT
