# Codebase Audit: codewiki-mcp

**Date:** 2026-04-13
**Scope:** Full audit — bugs, architecture, test coverage, code quality
**Approach:** Audit report + immediate fixes for all safely fixable issues

---

## Project Summary

codewiki-mcp is an MCP server providing 3 tools for codewiki.google:
- `codewiki_search_repos` — search indexed repositories
- `codewiki_fetch_repo` — fetch generated wiki content
- `codewiki_ask_repo` — ask natural-language questions about a repo

Stack: TypeScript, @modelcontextprotocol/sdk, wink-nlp, zod 4, vitest.
Transports: stdio, Streamable HTTP, SSE.

---

## Findings

### High Priority

#### #1 — Bug: HTTP transport shares single McpServer across all connections
**File:** `src/server.ts:58-79`
**Problem:** `transport === 'http'` creates one `StreamableHTTPServerTransport` and connects one `McpServer`. All HTTP clients share the same session. The SSE transport correctly uses a factory + per-session Map, but HTTP does not.
**Fix:** Apply the same factory pattern as SSE — create a new McpServer per session. Require `McpServerFactory` for HTTP transport as well, or handle session multiplexing via StreamableHTTPServerTransport's built-in session support.

#### #2 — Bug: Module-level `httpServer` singleton loses reference on repeated calls
**File:** `src/server.ts:42`
**Problem:** `let httpServer: Server | undefined` is module-level state. Calling `startServer` twice overwrites the variable — the first server is leaked (never closed). `stopServer()` only closes the last one.
**Fix:** Guard `startServer` against double-call (throw if already running), or track and close previous server.

#### #9 — Security: Token files not in .gitignore
**Files:** `.mcpregistry_github_token`, `.mcpregistry_registry_token`
**Problem:** These files contain secrets and are currently untracked but not gitignored. Risk of accidental commit.
**Fix:** Add `*.token` or specific filenames to `.gitignore`. Also add `.mcp.json` which contains local config.

### Medium Priority

#### #3 — Edge case: Silent fallback in `extractRpcPayload`
**File:** `src/lib/batchexecute.ts:70`
**Problem:** `frames.find(frame => frame.rpcId === rpcId) ?? frames[0]` — if the requested rpcId is not found, silently returns the first frame. This can mask API changes or bugs.
**Fix:** Throw an error when the requested rpcId is not found among frames, or at minimum log a warning.

#### #4 — Edge case: NLP resolution path lacks githubToken
**File:** `src/lib/repo.ts:71`
**Problem:** `resolveRepoFromGitHub(keyword, config ?? { requestTimeout: 30_000 })` — the fallback config omits `githubToken`, so NLP resolution without a token is limited to 60 req/hour by GitHub API rate limits.
**Fix:** This is a design issue in the `resolveRepoInput` signature. The fallback is only used when `config` is undefined, which happens when calling the function directly (not via MCP tools). Low practical impact since MCP tools always pass config, but the fallback should be documented or made explicit.

#### #6 — Tests: loadConfig tests in wrong file
**File:** `tests/errors.test.ts:82-122`
**Problem:** `describe('loadConfig')` tests are in `errors.test.ts`, not in a dedicated `config.test.ts`. Misleading file organization.
**Fix:** Move loadConfig tests to `tests/config.test.ts`.

#### #7 — Tests: No tests for tools/ and server.ts
**Problem:** The MCP integration layer (`src/tools/*.ts`, `src/server.ts`) has zero test coverage. This is where input is received from LLM clients and responses are formatted.
**Fix:** Add unit tests for each tool registration function and basic server lifecycle tests. Tools can be tested by creating an McpServer, registering the tool, and invoking it with mocked CodeWikiClient.

#### #8 — Tests: Few edge case tests for normalizeRepoInput
**File:** `tests/resolveRepo.test.ts`
**Problem:** Only 2 tests for `normalizeRepoInput` — missing coverage for: trailing slashes, extra path segments (e.g. `github.com/owner/repo/tree/main`), whitespace-only input, single-segment input.
**Fix:** Add edge case tests.

#### #15 — Code quality: Magic strings for RPC IDs
**File:** `src/lib/codewikiClient.ts:79, 120, 197`
**Problem:** `'vyWDAf'`, `'VSX6ub'`, `'EgIxfe'` are hardcoded without explanation.
**Fix:** Extract to named constants with documenting comments.

### Low Priority

#### #5 — Edge case: No response size limit
**File:** `src/lib/codewikiClient.ts:260`
**Problem:** `await response.text()` reads the entire response into memory with no upper bound.
**Fix:** Not fixing now — would require streaming parser changes. Document as known limitation.

#### #10 — Hygiene: dist/ may be committed
**Problem:** `dist/` is in `.gitignore` but exists in the working tree. If previously committed, stale build artifacts may be in git history.
**Fix:** Verify with `git ls-files dist/`. If tracked, remove from git.

#### #11 — CI/CD: Dockerfile doesn't pin Node version
**File:** `Dockerfile:1`
**Problem:** `node:22-alpine` without patch version pinning.
**Fix:** Not fixing — minor risk, and dependabot/renovate can handle base image updates.

#### #12 — Code quality: Duplicated validation pattern in tools
**Files:** `src/tools/searchRepos.ts:12-17`, `fetchRepo.ts:21-26`, `askRepo.ts:12-17`
**Problem:** Same safeParse + error return pattern copy-pasted 3 times.
**Fix:** Not fixing — duplication is minimal (3 occurrences), extracting a helper adds abstraction for little benefit.

#### #13 — Typing: `any` in extractKeyword
**File:** `src/lib/extractKeyword.ts:64`
**Problem:** `(token: any)` — wink-nlp lacks good type exports.
**Fix:** Not fixing — `any` is pragmatic here given the library's type situation.

#### #14 — Code quality: `raw` field inflates MCP responses
**File:** `src/lib/codewikiClient.ts`
**Problem:** Every search result and wiki section includes `raw: unknown` with full API payload. This gets serialized into MCP tool responses, consuming LLM context window tokens.
**Fix:** Exclude `raw` from MCP tool responses (keep it in the client API for programmatic use, but don't serialize it in the tool output).

#### #16 — Code quality: console.error for info messages
**File:** `src/server.ts:75, 125`
**Problem:** `console.error` used for "server listening" messages.
**Fix:** Not fixing — this is correct behavior for MCP servers using stdio (stdout is protocol), and consistent for HTTP/SSE.

---

## Implementation Scope

Issues to fix immediately:
- **#1** — HTTP transport session isolation
- **#2** — Guard against double `startServer` / leaked server
- **#3** — Throw on missing rpcId in extractRpcPayload
- **#6** — Move loadConfig tests to config.test.ts
- **#8** — Add normalizeRepoInput edge case tests
- **#9** — Add token files and .mcp.json to .gitignore
- **#14** — Exclude `raw` from MCP tool responses
- **#15** — Extract RPC IDs to named constants

Issues documented but not fixed:
- **#4** — Fallback config design (low practical impact)
- **#5** — Response size limit (requires architecture change)
- **#7** — Tool/server tests (significant effort, separate task)
- **#10** — dist/ in git (needs verification)
- **#11, #12, #13, #16** — Low priority, acceptable as-is
