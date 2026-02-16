<div align="center">

# 📚 codewiki-mcp

**MCP server for codewiki.google — search, fetch docs, and ask questions about any open-source repo**

[![CI](https://github.com/izzzzzi/codewiki-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/izzzzzi/codewiki-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/izzzzzi/codewiki-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/izzzzzi/codewiki-mcp/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/codewiki-mcp.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/codewiki-mcp)
[![npm downloads](https://img.shields.io/npm/dm/codewiki-mcp.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/codewiki-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat&colorA=18181B&colorB=28CF8D)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&colorA=18181B&colorB=3178C6)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-green?style=flat&colorA=18181B&colorB=339933)](https://nodejs.org/)

[🇷🇺 Русский](README.ru.md) | **🇬🇧 English**

<br />

*MCP server that connects any AI assistant to [codewiki.google](https://codewiki.google) — AI-generated wiki documentation for open-source repositories.*

</div>

---

## 📖 Overview

**codewiki-mcp** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI assistants access to **codewiki.google** — a service that generates comprehensive wiki documentation for any GitHub repository. Search repos, fetch full docs, or ask natural-language questions — all through MCP.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Search Repos** | Find repositories indexed by codewiki.google |
| 📄 **Fetch Wiki Docs** | Get full markdown or structured pages for any repo |
| 💬 **Ask Questions** | Natural-language Q&A with conversation history |
| 🧠 **NLP Repo Resolution** | Type naturally — wink-nlp extracts keywords and resolves to `owner/repo` |
| 📡 **Multiple Transports** | stdio (default), Streamable HTTP, SSE |
| 🔄 **Retry with Backoff** | Automatic retries with exponential backoff on 5xx errors |
| 🐳 **Docker Support** | Multi-stage Alpine build |
| 📊 **Response Metadata** | Byte count and elapsed time on every response |

---

## 🚀 Quick Start

### Using npx (no install)

```bash
npx -y codewiki-mcp@latest
```

### From source

```bash
git clone https://github.com/izzzzzi/codewiki-mcp.git
cd codewiki-mcp
npm install
npm run build
```

### Transports

```bash
# stdio (default)
node dist/cli.js

# Streamable HTTP
node dist/cli.js --http --port 3000

# SSE
node dist/cli.js --sse --port 3001
```

### 🐳 Docker

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

---

## 🔧 MCP Client Configuration

<details>
<summary><b>Cursor</b></summary>

Add to `.cursor/mcp.json`:

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

</details>

<details>
<summary><b>Claude Desktop</b></summary>

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

</details>

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add codewiki-mcp -- npx -y codewiki-mcp@latest
```

</details>

<details>
<summary><b>Windsurf</b></summary>

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

</details>

<details>
<summary><b>VS Code (Copilot)</b></summary>

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

</details>

<details>
<summary><b>Local development</b></summary>

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

</details>

---

## 💡 Usage

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

---

## 🛠️ MCP Tools

### 🔍 codewiki_search_repos

Search repositories indexed by codewiki.google.

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `query` | string | ✅ | — | Search query |
| `limit` | number | — | 10 | Max results (1–50) |

### 📄 codewiki_fetch_repo

Fetch generated wiki content for a repository.

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `repo` | string | ✅ | — | `owner/repo`, GitHub URL, or natural-language query |
| `mode` | string | — | `"aggregate"` | `"aggregate"` — full markdown; `"pages"` — structured JSON |

### 💬 codewiki_ask_repo

Ask a natural-language question about a repository.

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `repo` | string | ✅ | — | Repository identifier (same formats as fetch) |
| `question` | string | ✅ | — | Question about the repo |
| `history` | array | — | `[]` | Conversation history `[{role, content}]` (max 20) |

---

## 📊 Response Format

<details>
<summary><b>✅ Success — Search</b></summary>

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

</details>

<details>
<summary><b>✅ Success — Fetch (pages mode)</b></summary>

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

</details>

<details>
<summary><b>✅ Success — Ask</b></summary>

```json
{
  "answer": "Fastify uses a plugin-based architecture where...",
  "meta": {
    "totalBytes": 8500,
    "totalElapsedMs": 2300
  }
}
```

</details>

<details>
<summary><b>❌ Error Response</b></summary>

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

Error codes: `VALIDATION`, `RPC_FAIL`, `TIMEOUT`, `NLP_RESOLVE_FAIL`

</details>

---

## ⚙️ How It Works

### Data Flow

```
AI Assistant → MCP protocol → codewiki-mcp → HTTPS → codewiki.google
                                                            ↓
AI Assistant ← MCP protocol ← codewiki-mcp ← JSON  ← Google RPC API
```

### Google Batchexecute RPC

codewiki.google uses Google's internal **batchexecute** RPC format (not REST, not GraphQL). The client:

1. Builds a POST request with `f.req=...` body
2. Sends it to `/_/BoqAngularSdlcAgentsUi/data/batchexecute`
3. Receives a response with XSSI prefix `)]}'\n`
4. Parses `wrb.fr` frames and extracts the typed payload

Each tool maps to an RPC ID:

| Tool | RPC ID |
|------|:------:|
| 🔍 Search | `vyWDAf` |
| 📄 Fetch | `VSX6ub` |
| 💬 Ask | `EgIxfe` |

### 🧠 NLP Repo Resolution

Users can type natural language instead of `owner/repo`:

```
"the fastify web framework"
  → wink-nlp extracts keyword "fastify" (POS tag: NOUN/PROPN)
  → GitHub Search API: GET /search/repositories?q=fastify&sort=stars
  → top result: "fastify/fastify"
  → normalizeRepoInput("fastify/fastify") → URL for codewiki
```

### 🔄 Retry with Exponential Backoff

| Attempt | Delay |
|:-------:|------:|
| 0 | immediate |
| 1 | 250ms |
| 2 | 500ms |
| 3 | 1000ms |

> 4xx errors (client errors) are never retried.

---

## 🖥️ CLI

```
codewiki-mcp [options]

Options:
  --http           Streamable HTTP transport
  --sse            SSE transport
  --port <number>  Port for HTTP/SSE (default: 3000)
  --endpoint <str> URL endpoint (default: /mcp)
  --help, -h       Show help
```

---

## ⚡ Configuration

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

---

## 📁 Project Structure

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

---

## ❓ Troubleshooting

<details>
<summary><b>Permission Denied</b></summary>

```bash
chmod +x ./node_modules/.bin/codewiki-mcp
```

</details>

<details>
<summary><b>Connection Refused (HTTP/SSE)</b></summary>

```bash
# Check if port is in use
lsof -i :3000
```

</details>

<details>
<summary><b>Timeout Errors</b></summary>

For large repositories, increase the timeout:

```bash
CODEWIKI_REQUEST_TIMEOUT=60000 node dist/cli.js
```

</details>

<details>
<summary><b>NLP Resolution Fails</b></summary>

If natural-language input doesn't resolve, use explicit format:

```
# Instead of "the fastify framework"
fastify/fastify
# or
https://github.com/fastify/fastify
```

Set `GITHUB_TOKEN` to avoid GitHub API rate limits for unauthenticated requests.

</details>

---

## 🧑‍💻 Development

```bash
npm run dev          # stdio with tsx
npm run dev:http     # HTTP with tsx
npm run dev:sse      # SSE with tsx
npm run typecheck    # type check
npm run test         # run tests
npm run test:watch   # tests in watch mode
npm run build        # compile to dist/
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
4. Run `npm run typecheck && npm run test` before submitting
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) © codewiki-mcp contributors
