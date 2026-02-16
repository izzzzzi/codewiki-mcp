# codewiki-mcp

MCP-сервер для [codewiki.google](https://codewiki.google) — поиск, получение wiki-документации и вопросы по любому open-source репозиторию.

[English version](README.md)

## Возможности

- **3 MCP-инструмента**: поиск репозиториев, получение wiki-контента, вопросы с историей диалога
- **Множественные транспорты**: stdio (по умолчанию), Streamable HTTP, SSE
- **NLP-резолвинг репозиториев**: естественный язык → поиск по GitHub → `owner/repo` (через wink-nlp)
- **Retry с exponential backoff**: настраиваемые повторные запросы
- **Структурированные ошибки**: типизированные коды (`VALIDATION`, `RPC_FAIL`, `TIMEOUT`, `NLP_RESOLVE_FAIL`)
- **Метаданные ответов**: размер в байтах и время выполнения в каждом ответе
- **Docker**: multi-stage Alpine-сборка
- **Claude Code skill**: промпт-шаблоны, воркфлоу-цепочки, гайд по обработке ошибок

## Использование

Промпты, которые можно использовать в любом MCP-совместимом клиенте:

```
codewiki fetch как устроен роутинг в Next.js
```

```
codewiki search библиотеки для управления состоянием
```

```
codewiki ask как работает fiber reconciler в React?
```

Получить полную документацию:
```
codewiki fetch vercel/next.js
codewiki fetch https://github.com/fastify/fastify
```

Получить структурированные страницы:
```
codewiki fetch pages tailwindlabs/tailwindcss
```

Задать вопрос:
```
codewiki ask fastify как добавить аутентификацию?
```

## Быстрый старт

### Через npx (без установки)

```bash
npx -y codewiki-mcp@latest
```

### Из исходников

```bash
git clone https://github.com/nicholasxwang/codewiki-mcp.git
cd codewiki-mcp
npm install
npm run build
```

### stdio (по умолчанию)

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

# с переменными окружения
docker run -p 3000:3000 \
  -e CODEWIKI_REQUEST_TIMEOUT=60000 \
  -e CODEWIKI_MAX_RETRIES=5 \
  -e GITHUB_TOKEN=ghp_your_token \
  codewiki-mcp --http
```

## Настройка MCP-клиентов

### Cursor

Добавьте в `.cursor/mcp.json` (или используйте встроенный):

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

Добавьте в `claude_desktop_config.json`:

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

Добавьте в конфигурацию Windsurf MCP:

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

Добавьте в `.vscode/mcp.json`:

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

### Локальная разработка

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

## MCP-инструменты

### codewiki_search_repos

Поиск репозиториев, проиндексированных codewiki.google.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `query` | string | да | — | Поисковый запрос |
| `limit` | number | нет | 10 | Макс. результатов (1–50) |

### codewiki_fetch_repo

Получение сгенерированного wiki-контента для репозитория.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `repo` | string | да | — | `owner/repo`, URL на GitHub или запрос на естественном языке |
| `mode` | string | нет | `"aggregate"` | `"aggregate"` — полный markdown; `"pages"` — структурированный JSON |

### codewiki_ask_repo

Вопрос на естественном языке о репозитории.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `repo` | string | да | — | Идентификатор репозитория (те же форматы, что и fetch) |
| `question` | string | да | — | Вопрос о репозитории |
| `history` | array | нет | `[]` | История диалога `[{role, content}]` (макс. 20) |

## Формат ответов

### Успех — Поиск

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

### Успех — Fetch (режим pages)

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

### Успех — Ask

```json
{
  "answer": "Fastify uses a plugin-based architecture where...",
  "meta": {
    "totalBytes": 8500,
    "totalElapsedMs": 2300
  }
}
```

### Ответ с ошибкой

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

### Прямые API-вызовы (HTTP-транспорт)

```bash
# Запустить сервер
node dist/cli.js --http --port 3000

# Поиск
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

# Получить wiki
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

## Как это работает

### Поток данных

```
Claude Code → MCP протокол → codewiki-mcp → HTTPS → codewiki.google
                                                          ↓
Claude Code ← MCP протокол ← codewiki-mcp ← JSON  ← Google RPC API
```

### Google Batchexecute RPC

codewiki.google использует внутренний Google-формат API — **batchexecute**. Это не REST и не GraphQL, а специфичный RPC-протокол с `wrb.fr`-фреймами. Клиент:

1. Формирует POST-запрос с `f.req=...` телом
2. Отправляет на `/_/BoqAngularSdlcAgentsUi/data/batchexecute`
3. Получает ответ с XSSI-префиксом `)]}'\n`
4. Парсит `wrb.fr`-фреймы и извлекает типизированный payload

Каждый инструмент использует свой RPC ID:
- `vyWDAf` — поиск
- `VSX6ub` — получение wiki
- `EgIxfe` — вопрос-ответ

### NLP-резолвинг репозиториев

Пользователь может написать не только `owner/repo`, но и текст на естественном языке:

```
"the fastify web framework"
  → wink-nlp извлекает ключевое слово "fastify" (POS-тег: NOUN/PROPN)
  → GitHub Search API: GET /search/repositories?q=fastify&sort=stars
  → первый результат: "fastify/fastify"
  → normalizeRepoInput("fastify/fastify") → URL для codewiki
```

### Retry с exponential backoff

При 5xx ошибках или таймаутах клиент автоматически повторяет запрос:

```
Попытка 0: сразу
Попытка 1: через 250мс
Попытка 2: через 500мс
Попытка 3: через 1000мс
```

На 4xx ошибки (клиентские) retry не делается — бессмысленно.

## CLI

```
codewiki-mcp [опции]

Опции:
  --http           Streamable HTTP транспорт
  --sse            SSE транспорт
  --port <число>   Порт для HTTP/SSE (по умолчанию: 3000)
  --endpoint <str> URL-эндпоинт (по умолчанию: /mcp)
  --help, -h       Показать справку
```

## Конфигурация

Переменные окружения:

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `CODEWIKI_BASE_URL` | `https://codewiki.google` | Базовый URL |
| `CODEWIKI_REQUEST_TIMEOUT` | `30000` | Таймаут запроса (мс) |
| `CODEWIKI_MAX_RETRIES` | `3` | Макс. повторов |
| `CODEWIKI_RETRY_DELAY` | `250` | Базовая задержка повтора (мс) |
| `GITHUB_TOKEN` | — | GitHub-токен для NLP-резолвинга |

Можно также создать `.env` файл в корне проекта:

```
CODEWIKI_REQUEST_TIMEOUT=60000
CODEWIKI_MAX_RETRIES=5
GITHUB_TOKEN=ghp_your_token
```

## Разработка

```bash
npm run dev          # stdio через tsx
npm run dev:http     # HTTP через tsx
npm run dev:sse      # SSE через tsx
npm run typecheck    # проверка типов
npm run test         # запуск тестов
npm run test:watch   # тесты в watch-режиме
npm run build        # сборка в dist/
```

## Структура проекта

```
src/
├── cli.ts                  # Точка входа CLI
├── server.ts               # Настройка транспортов (stdio/HTTP/SSE)
├── index.ts                # Библиотечные реэкспорты
├── schemas.ts              # Zod-схемы входных данных
├── lib/
│   ├── codewikiClient.ts   # API-клиент с retry + метаданные
│   ├── batchexecute.ts     # Парсер Google RPC-ответов
│   ├── repo.ts             # Нормализация репо + NLP-резолвинг
│   ├── extractKeyword.ts   # NLP-извлечение ключевых слов (wink-nlp)
│   ├── resolveRepo.ts      # Резолвер через GitHub Search API
│   ├── errors.ts           # CodeWikiError + formatMcpError
│   └── config.ts           # Конфигурация через env
└── tools/
    ├── searchRepos.ts      # codewiki_search_repos
    ├── fetchRepo.ts        # codewiki_fetch_repo
    └── askRepo.ts          # codewiki_ask_repo
```

## Решение проблем

### Permission Denied

```bash
chmod +x ./node_modules/.bin/codewiki-mcp
```

### Connection Refused (HTTP/SSE)

```bash
# Проверить, занят ли порт
lsof -i :3000
```

### Ошибки таймаута

Для больших репозиториев увеличьте таймаут:

```bash
CODEWIKI_REQUEST_TIMEOUT=60000 node dist/cli.js
```

### NLP-резолвинг не работает

Если естественный язык не резолвится, используйте явный формат:

```
# Вместо "фреймворк fastify"
fastify/fastify
# или
https://github.com/fastify/fastify
```

Установите `GITHUB_TOKEN`, чтобы избежать лимитов GitHub API для неаутентифицированных запросов.

## Участие в разработке

Мы приветствуем вклад! Пожалуйста:

1. Форкните репозиторий
2. Создайте feature-ветку (`git checkout -b feat/my-feature`)
3. Используйте [Conventional Commits](https://www.conventionalcommits.org/) для сообщений коммитов
4. Запустите `npm run typecheck && npm run test` перед отправкой
5. Откройте Pull Request

## Лицензия

MIT
