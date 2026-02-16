---
name: codewiki
description: Research any open-source repository via codewiki.google — search, fetch wiki docs, ask questions
tools: ["codewiki_search_repos", "codewiki_fetch_repo", "codewiki_ask_repo"]
---

# CodeWiki MCP — Skill Guide

## Available Tools

### codewiki_search_repos
Search repositories indexed by codewiki.google.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | Search query (library name, keyword, description) |
| `limit` | number | no | Max results (1-50, default 10) |

**Returns**: JSON with `query`, `count`, `items[]` (each with `fullName`, `url`, `description`, `avatarUrl`, `extraScore`), and `meta` (totalBytes, totalElapsedMs).

### codewiki_fetch_repo
Fetch generated wiki content for a repository.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | yes | Repository identifier: `owner/repo`, full GitHub URL, or natural-language query (NLP resolved) |
| `mode` | string | no | `"aggregate"` (default) — full markdown; `"pages"` — structured JSON per section |

**Returns**:
- **aggregate mode**: Markdown text with preface (repo, commit, canonical URL, response meta)
- **pages mode**: JSON with `repo`, `commit`, `canonicalUrl`, `pages[]` (title, level, anchor, markdown, diagramCount), and `meta`

### codewiki_ask_repo
Ask a natural-language question about a repository.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | yes | Repository identifier (same formats as fetch) |
| `question` | string | yes | Natural-language question about the repo |
| `history` | array | no | Conversation history: `[{role: "user"|"assistant", content: "..."}]` (max 20) |

**Returns**: JSON with `answer` (string) and `meta` (totalBytes, totalElapsedMs).

---

## Prompt Templates

### Study a project's architecture
```
1. codewiki_search_repos(query: "<project name>")
   → find the exact owner/repo
2. codewiki_fetch_repo(repo: "<owner/repo>", mode: "aggregate")
   → read the full wiki to understand architecture
3. codewiki_ask_repo(repo: "<owner/repo>", question: "What are the main architectural patterns and components?")
   → deep-dive into architecture
```

### Find how a feature is implemented
```
codewiki_ask_repo(
  repo: "<owner/repo>",
  question: "How is <feature X> implemented? Show the key modules and data flow."
)
```

### Compare approaches in two repos
```
1. codewiki_fetch_repo(repo: "<owner1/repo1>", mode: "pages")
2. codewiki_fetch_repo(repo: "<owner2/repo2>", mode: "pages")
3. Compare the architectural approaches, patterns, and trade-offs
```

### Quick library overview
```
1. codewiki_search_repos(query: "<library>")
   → confirm the right repo
2. codewiki_fetch_repo(repo: "<owner/repo>", mode: "pages")
   → get structured sections
3. Summarize: purpose, key features, getting started, API surface
```

### Explore a topic across repos
```
1. codewiki_search_repos(query: "<topic>", limit: 5)
   → find top repos for the topic
2. For each interesting repo:
   codewiki_ask_repo(repo: "<repo>", question: "Summarize the approach to <topic>")
3. Synthesize findings across repos
```

---

## Workflow Chains

### Deep Research Chain
**Goal**: Thorough understanding of a project

1. **Search** → `codewiki_search_repos` to find the repo and confirm its full name
2. **Fetch overview** → `codewiki_fetch_repo(mode: "aggregate")` to read the full wiki
3. **Ask specific questions** → `codewiki_ask_repo` for deep-dives into specific areas
4. **Follow up** → Use `history` parameter to maintain context across questions

### Comparison Chain
**Goal**: Compare two or more implementations

1. **Fetch all** → `codewiki_fetch_repo(mode: "pages")` for each repo
2. **Identify patterns** → Extract architectural sections from each
3. **Ask targeted questions** → `codewiki_ask_repo` about specific differences

### Migration Research Chain
**Goal**: Understand a library for migration

1. **Search** → Find source and target libraries
2. **Fetch both** → Get wiki content for both
3. **Ask migration questions** → "What are the key API differences between X and Y?"
4. **Ask compatibility** → "What breaking changes should I watch for?"

---

## Error Handling

| Error Code | Meaning | Action |
|------------|---------|--------|
| `VALIDATION` | Invalid input parameters | Check parameter types and required fields |
| `RPC_FAIL` | CodeWiki API call failed | Retry with different query; check if repo exists on codewiki.google |
| `TIMEOUT` | Request timed out | Try again; for large repos, use `mode: "pages"` to get structured data |
| `NLP_RESOLVE_FAIL` | Could not resolve natural-language input to a repo | Use explicit `owner/repo` format instead |

When you receive an error:
1. Parse the error envelope: `{ error: { code, message, rpcId?, statusCode? } }`
2. If `RPC_FAIL` with `statusCode: 404` → repo not indexed, suggest searching first
3. If `TIMEOUT` → simplify query or try mode: "pages" for fetch
4. If `NLP_RESOLVE_FAIL` → ask user for the exact repo name

---

## Conversation History Tips

The `history` parameter in `codewiki_ask_repo` enables multi-turn conversations:

```json
{
  "repo": "facebook/react",
  "question": "How does the fiber reconciler differ?",
  "history": [
    {"role": "user", "content": "What is the rendering pipeline?"},
    {"role": "assistant", "content": "React's rendering pipeline consists of..."}
  ]
}
```

**Best practices**:
- Keep history under 20 entries for optimal performance
- Include only relevant prior Q&A pairs
- Summarize long assistant responses in history to save tokens
- Start a new conversation (no history) when changing topics

---

## Examples

### Example 1: Quick repo lookup
**User**: "What does the fastify framework do?"
```
codewiki_search_repos(query: "fastify")
→ finds fastify/fastify
codewiki_ask_repo(repo: "fastify/fastify", question: "What is Fastify and what are its key features?")
→ comprehensive answer
```

### Example 2: Architecture deep-dive
**User**: "Explain how Next.js handles server-side rendering"
```
codewiki_fetch_repo(repo: "vercel/next.js", mode: "aggregate")
→ full wiki content
codewiki_ask_repo(repo: "vercel/next.js", question: "How does Next.js implement server-side rendering? Describe the request lifecycle.")
→ detailed SSR explanation
```

### Example 3: Library comparison
**User**: "Compare Express and Fastify"
```
codewiki_fetch_repo(repo: "expressjs/express", mode: "pages")
codewiki_fetch_repo(repo: "fastify/fastify", mode: "pages")
→ compare architectures, middleware patterns, performance approaches
```
