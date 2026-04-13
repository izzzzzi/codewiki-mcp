# Codebase Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 issues identified in the codebase audit (spec: `docs/superpowers/specs/2026-04-13-codebase-audit-design.md`)

**Architecture:** Targeted fixes across existing files — no new modules, no structural changes. Each task is independent and can be committed separately.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk ^1.19.0, vitest, zod 4

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/server.ts` | Fix #1 (HTTP session isolation) and #2 (double-start guard) |
| Modify | `src/lib/batchexecute.ts` | Fix #3 (throw on missing rpcId) |
| Modify | `src/lib/codewikiClient.ts` | Fix #15 (RPC ID constants) |
| Modify | `src/tools/searchRepos.ts` | Fix #14 (exclude `raw` from output) |
| Modify | `src/tools/fetchRepo.ts` | Fix #14 (exclude `raw` from output) |
| Modify | `.gitignore` | Fix #9 (ignore token files) |
| Create | `tests/config.test.ts` | Fix #6 (move loadConfig tests) |
| Modify | `tests/errors.test.ts` | Fix #6 (remove loadConfig tests from here) |
| Modify | `tests/batchexecute.test.ts` | Fix #3 (test for missing rpcId throw) |
| Modify | `tests/resolveRepo.test.ts` | Fix #8 (add normalizeRepoInput edge cases) |

---

### Task 1: Fix #9 — Add token files and .mcp.json to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Update .gitignore**

Add these lines to the end of `.gitignore`:

```
.mcp.json
.mcpregistry_*
```

The current `.gitignore` is:

```
node_modules
dist
coverage
.DS_Store
.playwright-mcp/
```

After edit, it should be:

```
node_modules
dist
coverage
.DS_Store
.playwright-mcp/
.mcp.json
.mcpregistry_*
```

- [ ] **Step 2: Verify**

Run: `git status`
Expected: `.mcp.json`, `.mcpregistry_github_token`, `.mcpregistry_registry_token` should no longer appear as untracked files.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "fix: add token files and .mcp.json to .gitignore"
```

---

### Task 2: Fix #15 — Extract RPC IDs to named constants

**Files:**
- Modify: `src/lib/codewikiClient.ts:79, 120, 197`

- [ ] **Step 1: Add RPC ID constants**

At the top of `src/lib/codewikiClient.ts`, after the imports, add:

```typescript
/** RPC IDs for codewiki.google batchexecute endpoints */
const RPC_SEARCH = 'vyWDAf'
const RPC_FETCH = 'VSX6ub'
const RPC_ASK = 'EgIxfe'
```

- [ ] **Step 2: Replace hardcoded strings**

In `searchRepositories` (line 79):
```typescript
// Before:
const { payload, bytes } = await this.callRpc('vyWDAf', [query, limit, query, 0], { sourcePath: '/' })
// After:
const { payload, bytes } = await this.callRpc(RPC_SEARCH, [query, limit, query, 0], { sourcePath: '/' })
```

In `fetchRepository` (line 120):
```typescript
// Before:
const { payload, bytes } = await this.callRpc('VSX6ub', [repo.repoUrl], {
// After:
const { payload, bytes } = await this.callRpc(RPC_FETCH, [repo.repoUrl], {
```

In `askRepository` (line 197):
```typescript
// Before:
const { payload, bytes } = await this.callRpc('EgIxfe', [messages, [null, repo.repoUrl]], {
// After:
const { payload, bytes } = await this.callRpc(RPC_ASK, [messages, [null, repo.repoUrl]], {
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/client.test.ts`
Expected: All 7 tests pass. (Tests use the string literals in mock responses, not client internals, so they remain valid.)

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/codewikiClient.ts
git commit -m "refactor: extract RPC IDs to named constants"
```

---

### Task 3: Fix #3 — Throw on missing rpcId in extractRpcPayload

**Files:**
- Modify: `src/lib/batchexecute.ts:68-72`
- Modify: `tests/batchexecute.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/batchexecute.test.ts` inside the existing `describe('batchexecute parser', ...)`:

```typescript
it('throws when requested rpcId is not found among frames', () => {
  const line = JSON.stringify([
    ['wrb.fr', 'vyWDAf', JSON.stringify(['data']), null, null, null, 'generic'],
  ])
  const text = `)]}'\n${line}`

  expect(() => extractRpcPayload(text, 'UNKNOWN_ID')).toThrow(
    'RPC ID "UNKNOWN_ID" not found in batchexecute response',
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/batchexecute.test.ts`
Expected: FAIL — currently falls back to `frames[0]` instead of throwing.

- [ ] **Step 3: Fix extractRpcPayload**

In `src/lib/batchexecute.ts`, replace the `extractRpcPayload` function (lines 68-72):

```typescript
// Before:
export function extractRpcPayload(responseText: string, rpcId: string): unknown {
  const frames = extractWrbFrames(responseText)
  const match = frames.find(frame => frame.rpcId === rpcId) ?? frames[0]
  return match.payload
}

// After:
export function extractRpcPayload(responseText: string, rpcId: string): unknown {
  const frames = extractWrbFrames(responseText)
  const match = frames.find(frame => frame.rpcId === rpcId)
  if (!match) {
    const available = frames.map(f => f.rpcId).join(', ')
    throw new Error(`RPC ID "${rpcId}" not found in batchexecute response (available: ${available})`)
  }
  return match.payload
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/batchexecute.test.ts`
Expected: All 4 tests pass (3 existing + 1 new).

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All 45 tests pass. The existing test `'extracts specific RPC payload when multiple frames exist'` still passes because it requests an rpcId that exists in the frames.

- [ ] **Step 6: Commit**

```bash
git add src/lib/batchexecute.ts tests/batchexecute.test.ts
git commit -m "fix: throw error when requested rpcId not found in batchexecute response"
```

---

### Task 4: Fix #14 — Exclude `raw` from MCP tool responses

**Files:**
- Modify: `src/tools/searchRepos.ts:27-31`
- Modify: `src/tools/fetchRepo.ts:42-48`

The `raw` field in search results and wiki sections contains the full undocumented API payload. It's useful for library consumers but inflates MCP responses sent to LLMs. The fix: strip `raw` before serializing in the tool response. The `codewikiClient.ts` API stays unchanged (library consumers keep `raw`).

- [ ] **Step 1: Fix searchRepos.ts**

In `src/tools/searchRepos.ts`, replace the items serialization (lines 25-33):

```typescript
// Before:
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      query,
      count: items.length,
      items,
      meta,
    }, null, 2),
  }],
}

// After:
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
```

- [ ] **Step 2: Fix fetchRepo.ts — pages mode**

In `src/tools/fetchRepo.ts`, the `pages` mode (lines 42-53) already manually picks fields and does NOT include `raw`. No change needed for pages mode.

- [ ] **Step 3: Fix fetchRepo.ts — aggregate mode**

The aggregate mode (lines 55-67) uses `toSectionMarkdown()` which only reads `section.level`, `section.title`, `section.markdown`, `section.summary`. It does NOT serialize `raw`. No change needed for aggregate mode either.

So only `searchRepos.ts` needs the fix — it's the only tool that passes objects with `raw` directly to `JSON.stringify`.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. (No existing tests assert on `raw` in tool output.)

- [ ] **Step 6: Commit**

```bash
git add src/tools/searchRepos.ts
git commit -m "fix: exclude raw API payload from search results MCP response"
```

---

### Task 5: Fix #6 — Move loadConfig tests to config.test.ts

**Files:**
- Create: `tests/config.test.ts`
- Modify: `tests/errors.test.ts:82-122`

- [ ] **Step 1: Create tests/config.test.ts**

Create `tests/config.test.ts` with the loadConfig tests extracted from `tests/errors.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/lib/config.js'

describe('loadConfig', () => {
  it('returns defaults when no env vars set', () => {
    const config = loadConfig({})
    expect(config.baseUrl).toBe('https://codewiki.google')
    expect(config.requestTimeout).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryDelay).toBe(250)
    expect(config.githubToken).toBeUndefined()
  })

  it('reads env vars when set', () => {
    const config = loadConfig({
      CODEWIKI_BASE_URL: 'https://custom.host',
      CODEWIKI_REQUEST_TIMEOUT: '5000',
      CODEWIKI_MAX_RETRIES: '5',
      CODEWIKI_RETRY_DELAY: '100',
      GITHUB_TOKEN: 'ghp_test123',
    })
    expect(config.baseUrl).toBe('https://custom.host')
    expect(config.requestTimeout).toBe(5000)
    expect(config.maxRetries).toBe(5)
    expect(config.retryDelay).toBe(100)
    expect(config.githubToken).toBe('ghp_test123')
  })

  it('falls back to defaults for invalid numbers', () => {
    const config = loadConfig({
      CODEWIKI_REQUEST_TIMEOUT: 'not-a-number',
      CODEWIKI_MAX_RETRIES: '-1',
      CODEWIKI_RETRY_DELAY: '0',
    })
    expect(config.requestTimeout).toBe(30_000)
    expect(config.maxRetries).toBe(3)
    expect(config.retryDelay).toBe(250)
  })

  it('treats empty GITHUB_TOKEN as undefined', () => {
    const config = loadConfig({ GITHUB_TOKEN: '' })
    expect(config.githubToken).toBeUndefined()
  })
})
```

- [ ] **Step 2: Remove loadConfig tests from errors.test.ts**

In `tests/errors.test.ts`, delete lines 82-122 (the entire `describe('loadConfig', ...)` block) and remove the `loadConfig` import from line 3. The import line changes from:

```typescript
import { loadConfig } from '../src/lib/config.js'
import { CodeWikiError, formatMcpError } from '../src/lib/errors.js'
```

to:

```typescript
import { CodeWikiError, formatMcpError } from '../src/lib/errors.js'
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass. Test count should stay at 44 (same tests, different file).

- [ ] **Step 4: Commit**

```bash
git add tests/config.test.ts tests/errors.test.ts
git commit -m "refactor: move loadConfig tests from errors.test.ts to config.test.ts"
```

---

### Task 6: Fix #8 — Add normalizeRepoInput edge case tests

**Files:**
- Modify: `tests/resolveRepo.test.ts`

- [ ] **Step 1: Add edge case tests**

Add these tests inside the existing `describe('normalizeRepoInput', ...)` block in `tests/resolveRepo.test.ts`:

```typescript
it('handles URL with trailing slash', () => {
  const result = normalizeRepoInput('https://github.com/owner/repo/')
  expect(result.repoPath).toBe('owner/repo')
  expect(result.repoUrl).toBe('https://github.com/owner/repo')
})

it('handles URL with extra path segments', () => {
  const result = normalizeRepoInput('https://github.com/owner/repo/tree/main/src')
  expect(result.repoPath).toBe('owner/repo')
})

it('handles owner/repo with leading slash', () => {
  const result = normalizeRepoInput('/owner/repo')
  expect(result.repoPath).toBe('owner/repo')
})

it('handles owner/repo with trailing slash', () => {
  const result = normalizeRepoInput('owner/repo/')
  expect(result.repoPath).toBe('owner/repo')
})

it('throws on empty string', () => {
  expect(() => normalizeRepoInput('')).toThrow('Repository input is empty')
})

it('throws on whitespace-only string', () => {
  expect(() => normalizeRepoInput('   ')).toThrow('Repository input is empty')
})

it('throws on single-segment input', () => {
  expect(() => normalizeRepoInput('owner')).toThrow('Expected repository in owner/repo format')
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/resolveRepo.test.ts`
Expected: All tests pass (10 existing + 7 new = 17).

- [ ] **Step 3: Commit**

```bash
git add tests/resolveRepo.test.ts
git commit -m "test: add normalizeRepoInput edge case tests"
```

---

### Task 7: Fix #2 — Guard against double startServer

**Files:**
- Modify: `src/server.ts:42-46`

- [ ] **Step 1: Add guard to startServer**

In `src/server.ts`, add a guard at the beginning of `startServer` (after line 48, the destructuring):

```typescript
// Before:
export async function startServer(
  mcpOrFactory: McpServer | McpServerFactory,
  options: ServerOptions,
): Promise<void> {
  const { transport, port = 3000, endpoint = '/mcp' } = options

  const getMcp = typeof mcpOrFactory === 'function' ? mcpOrFactory : () => mcpOrFactory

// After:
export async function startServer(
  mcpOrFactory: McpServer | McpServerFactory,
  options: ServerOptions,
): Promise<void> {
  if (httpServer) {
    throw new Error('Server is already running. Call stopServer() before starting a new one.')
  }

  const { transport, port = 3000, endpoint = '/mcp' } = options

  const getMcp = typeof mcpOrFactory === 'function' ? mcpOrFactory : () => mcpOrFactory
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "fix: guard against double startServer call to prevent leaked servers"
```

---

### Task 8: Fix #1 — HTTP transport session isolation

**Files:**
- Modify: `src/server.ts:1-8, 58-79`

This is the most substantial fix. The current HTTP transport creates one `StreamableHTTPServerTransport` and one `McpServer` shared by all clients. Per the MCP SDK's official example (`simpleStreamableHttp.js`), each initialization request should create a new transport+server pair, tracked in a sessions map.

The fix requires:
- Import `isInitializeRequest` from the SDK
- For HTTP: manage a `Map<string, StreamableHTTPServerTransport>` of sessions
- Route requests to existing sessions or create new ones on initialization
- Require `McpServerFactory` for HTTP transport (same as SSE)
- Handle GET (SSE streams) and DELETE (session termination) in addition to POST

- [ ] **Step 1: Add isInitializeRequest import**

In `src/server.ts`, add to the imports (line 1-9):

```typescript
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
```

- [ ] **Step 2: Rewrite the HTTP transport block**

Replace the entire `if (transport === 'http') { ... }` block (lines 58-79) with:

```typescript
if (transport === 'http') {
  if (typeof mcpOrFactory !== 'function') {
    throw new Error(
      'HTTP transport requires a McpServerFactory (a function returning a new McpServer) ' +
      'because each HTTP client needs its own McpServer instance. ' +
      'Pass () => createMcpServer(config) instead of a single McpServer.',
    )
  }

  const sessions = new Map<string, StreamableHTTPServerTransport>()

  httpServer = createServer(async (req, res) => {
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
  })

  await new Promise<void>((resolve) => {
    httpServer!.listen(port, () => {
      console.error(`codewiki-mcp HTTP server listening on http://localhost:${port}${endpoint}`)
      resolve()
    })
  })
  return
}
```

- [ ] **Step 3: Update cli.ts to use factory for HTTP transport**

In `src/cli.ts`, the current code (lines 60-65) only uses a factory for SSE. Change it to use a factory for both HTTP and SSE:

```typescript
// Before:
if (transport === 'sse') {
  await startServer(() => createMcpServer(config), { transport, port, endpoint })
} else {
  const mcp = createMcpServer(config)
  await startServer(mcp, { transport, port, endpoint })
}

// After:
if (transport === 'stdio') {
  const mcp = createMcpServer(config)
  await startServer(mcp, { transport, port, endpoint })
} else {
  await startServer(() => createMcpServer(config), { transport, port, endpoint })
}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 6: Manual smoke test**

Run: `npx tsx src/cli.ts --http --port 3001`
Expected: Prints `codewiki-mcp HTTP server listening on http://localhost:3001/mcp` to stderr.
Kill with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/server.ts src/cli.ts
git commit -m "fix: HTTP transport now creates per-session McpServer instances

Each HTTP initialization request creates its own StreamableHTTPServerTransport
and McpServer, matching the SSE transport behavior. Sessions are tracked in a
Map and cleaned up on close. GET and DELETE methods are now handled for SSE
streaming and session termination per the MCP spec."
```
