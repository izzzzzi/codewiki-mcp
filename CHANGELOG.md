## [1.1.2](https://github.com/izzzzzi/codewiki-mcp/compare/v1.1.1...v1.1.2) (2026-04-13)


### Bug Fixes

* add graceful session cleanup on shutdown and error handling in HTTP transport ([63bcdb0](https://github.com/izzzzzi/codewiki-mcp/commit/63bcdb0787b813377f51534825f0a5fa5e4ee8ce))
* add token files and .mcp.json to .gitignore ([916e2e4](https://github.com/izzzzzi/codewiki-mcp/commit/916e2e4aff51d4722e2bd4ed79ec7bf12cb32a1a))
* exclude raw API payload from search results MCP response ([c5d98da](https://github.com/izzzzzi/codewiki-mcp/commit/c5d98da258e018f9babdf9fefe4f7703b8d25eae))
* guard against double startServer call to prevent leaked servers ([199517a](https://github.com/izzzzzi/codewiki-mcp/commit/199517a5bc955e1d79a2351eccacd6c18bacdfae))
* HTTP transport now creates per-session McpServer instances ([161cb7f](https://github.com/izzzzzi/codewiki-mcp/commit/161cb7ff24165b2ac0c9f4e3d631eecf12fe9a3f))
* throw error when requested rpcId not found in batchexecute response ([3440975](https://github.com/izzzzzi/codewiki-mcp/commit/3440975c49e35c3684e4a54cf31899a99436ca1a))

## [1.1.1](https://github.com/izzzzzi/codewiki-mcp/compare/v1.1.0...v1.1.1) (2026-03-07)


### Bug Fixes

* trigger patch release for SSE and keyword extraction fixes ([a66ebf9](https://github.com/izzzzzi/codewiki-mcp/commit/a66ebf9d2faa7f450ce6d7ca8cd24aaad48d1631))

# [1.1.0](https://github.com/izzzzzi/codewiki-mcp/compare/v1.0.1...v1.1.0) (2026-02-27)


### Features

* add registry metadata for MCP publication ([e4a35e4](https://github.com/izzzzzi/codewiki-mcp/commit/e4a35e4015f40643f5beefe782335ec0e8c4c845))

## [1.0.1](https://github.com/izzzzzi/codewiki-mcp/compare/v1.0.0...v1.0.1) (2026-02-16)


### Bug Fixes

* **docs:** correct GitHub owner in badge URLs and clone links ([dbcaa48](https://github.com/izzzzzi/codewiki-mcp/commit/dbcaa48a8b3ebc99274fa8919ff1ee10ef89d4ac))

# 1.0.0 (2026-02-16)


### Features

* codewiki-mcp v0.2.0 — full MCP server for codewiki.google ([4f4dec7](https://github.com/izzzzzi/codewiki-mcp/commit/4f4dec74e48821e8fe8193b73341fcad1e61449f))
