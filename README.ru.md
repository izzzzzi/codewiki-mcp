<div align="center">

# 📚 codewiki-mcp

**MCP-сервер для codewiki.google — поиск, документация и вопросы по любому open-source репозиторию**

[![CI](https://github.com/nicholasxwang/codewiki-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nicholasxwang/codewiki-mcp/actions/workflows/ci.yml)
[![Release](https://github.com/nicholasxwang/codewiki-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/nicholasxwang/codewiki-mcp/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/codewiki-mcp.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/codewiki-mcp)
[![npm downloads](https://img.shields.io/npm/dm/codewiki-mcp.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/codewiki-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat&colorA=18181B&colorB=28CF8D)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&colorA=18181B&colorB=3178C6)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-green?style=flat&colorA=18181B&colorB=339933)](https://nodejs.org/)

**🇷🇺 Русский** | [🇬🇧 English](README.md)

<br />

*MCP-сервер, подключающий любого AI-ассистента к [codewiki.google](https://codewiki.google) — сервису генерации wiki-документации для open-source репозиториев.*

</div>

---

## 📖 Обзор

**codewiki-mcp** — это [Model Context Protocol](https://modelcontextprotocol.io/) сервер, который даёт AI-ассистентам доступ к **codewiki.google** — сервису, генерирующему подробную wiki-документацию для любого GitHub-репозитория. Ищите репозитории, получайте полную документацию или задавайте вопросы на естественном языке — всё через MCP.

---

## ✨ Возможности

| Фича | Описание |
|------|----------|
| 🔍 **Поиск репозиториев** | Поиск по индексу codewiki.google |
| 📄 **Получение wiki-документации** | Полный markdown или структурированные страницы |
| 💬 **Вопросы по репозиторию** | Q&A на естественном языке с историей диалога |
| 🧠 **NLP-резолвинг** | Пишите на естественном языке — wink-nlp извлечёт ключевые слова и найдёт `owner/repo` |
| 📡 **Множественные транспорты** | stdio (по умолчанию), Streamable HTTP, SSE |
| 🔄 **Retry с backoff** | Автоматические повторы с exponential backoff при 5xx ошибках |
| 🐳 **Docker** | Multi-stage Alpine-сборка |
| 📊 **Метаданные ответов** | Размер в байтах и время выполнения в каждом ответе |

---

## 🚀 Быстрый старт

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

### Транспорты

```bash
# stdio (по умолчанию)
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

# с переменными окружения
docker run -p 3000:3000 \
  -e CODEWIKI_REQUEST_TIMEOUT=60000 \
  -e CODEWIKI_MAX_RETRIES=5 \
  -e GITHUB_TOKEN=ghp_your_token \
  codewiki-mcp --http
```

---

## 🔧 Настройка MCP-клиентов

<details>
<summary><b>Cursor</b></summary>

Добавьте в `.cursor/mcp.json`:

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

</details>

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add codewiki-mcp -- npx -y codewiki-mcp@latest
```

</details>

<details>
<summary><b>Windsurf</b></summary>

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

</details>

<details>
<summary><b>VS Code (Copilot)</b></summary>

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

</details>

<details>
<summary><b>Локальная разработка</b></summary>

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

## 💡 Использование

Промпты для любого MCP-совместимого клиента:

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

---

## 🛠️ MCP-инструменты

### 🔍 codewiki_search_repos

Поиск репозиториев, проиндексированных codewiki.google.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:------------:|--------------|----------|
| `query` | string | ✅ | — | Поисковый запрос |
| `limit` | number | — | 10 | Макс. результатов (1–50) |

### 📄 codewiki_fetch_repo

Получение сгенерированного wiki-контента для репозитория.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:------------:|--------------|----------|
| `repo` | string | ✅ | — | `owner/repo`, URL на GitHub или запрос на естественном языке |
| `mode` | string | — | `"aggregate"` | `"aggregate"` — полный markdown; `"pages"` — структурированный JSON |

### 💬 codewiki_ask_repo

Вопрос на естественном языке о репозитории.

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:------------:|--------------|----------|
| `repo` | string | ✅ | — | Идентификатор репозитория (те же форматы, что и fetch) |
| `question` | string | ✅ | — | Вопрос о репозитории |
| `history` | array | — | `[]` | История диалога `[{role, content}]` (макс. 20) |

---

## 📊 Формат ответов

<details>
<summary><b>✅ Успех — Поиск</b></summary>

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
<summary><b>✅ Успех — Fetch (режим pages)</b></summary>

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
<summary><b>✅ Успех — Ask</b></summary>

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
<summary><b>❌ Ответ с ошибкой</b></summary>

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

Коды ошибок: `VALIDATION`, `RPC_FAIL`, `TIMEOUT`, `NLP_RESOLVE_FAIL`

</details>

---

## ⚙️ Как это работает

### Поток данных

```
AI-ассистент → MCP протокол → codewiki-mcp → HTTPS → codewiki.google
                                                            ↓
AI-ассистент ← MCP протокол ← codewiki-mcp ← JSON  ← Google RPC API
```

### Google Batchexecute RPC

codewiki.google использует внутренний Google-формат API — **batchexecute**. Это не REST и не GraphQL, а специфичный RPC-протокол с `wrb.fr`-фреймами. Клиент:

1. Формирует POST-запрос с `f.req=...` телом
2. Отправляет на `/_/BoqAngularSdlcAgentsUi/data/batchexecute`
3. Получает ответ с XSSI-префиксом `)]}'\n`
4. Парсит `wrb.fr`-фреймы и извлекает типизированный payload

Каждый инструмент использует свой RPC ID:

| Инструмент | RPC ID |
|------------|:------:|
| 🔍 Поиск | `vyWDAf` |
| 📄 Fetch | `VSX6ub` |
| 💬 Вопрос | `EgIxfe` |

### 🧠 NLP-резолвинг репозиториев

Пользователь может написать не только `owner/repo`, но и текст на естественном языке:

```
"the fastify web framework"
  → wink-nlp извлекает ключевое слово "fastify" (POS-тег: NOUN/PROPN)
  → GitHub Search API: GET /search/repositories?q=fastify&sort=stars
  → первый результат: "fastify/fastify"
  → normalizeRepoInput("fastify/fastify") → URL для codewiki
```

### 🔄 Retry с exponential backoff

| Попытка | Задержка |
|:-------:|---------:|
| 0 | сразу |
| 1 | 250мс |
| 2 | 500мс |
| 3 | 1000мс |

> На 4xx ошибки (клиентские) retry не делается — бессмысленно.

---

## 🖥️ CLI

```
codewiki-mcp [опции]

Опции:
  --http           Streamable HTTP транспорт
  --sse            SSE транспорт
  --port <число>   Порт для HTTP/SSE (по умолчанию: 3000)
  --endpoint <str> URL-эндпоинт (по умолчанию: /mcp)
  --help, -h       Показать справку
```

---

## ⚡ Конфигурация

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

---

## 📁 Структура проекта

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

---

## ❓ Решение проблем

<details>
<summary><b>Permission Denied</b></summary>

```bash
chmod +x ./node_modules/.bin/codewiki-mcp
```

</details>

<details>
<summary><b>Connection Refused (HTTP/SSE)</b></summary>

```bash
# Проверить, занят ли порт
lsof -i :3000
```

</details>

<details>
<summary><b>Ошибки таймаута</b></summary>

Для больших репозиториев увеличьте таймаут:

```bash
CODEWIKI_REQUEST_TIMEOUT=60000 node dist/cli.js
```

</details>

<details>
<summary><b>NLP-резолвинг не работает</b></summary>

Если естественный язык не резолвится, используйте явный формат:

```
# Вместо "фреймворк fastify"
fastify/fastify
# или
https://github.com/fastify/fastify
```

Установите `GITHUB_TOKEN`, чтобы избежать лимитов GitHub API для неаутентифицированных запросов.

</details>

---

## 🧑‍💻 Разработка

```bash
npm run dev          # stdio через tsx
npm run dev:http     # HTTP через tsx
npm run dev:sse      # SSE через tsx
npm run typecheck    # проверка типов
npm run test         # запуск тестов
npm run test:watch   # тесты в watch-режиме
npm run build        # сборка в dist/
```

---

## 🤝 Участие в разработке

Мы приветствуем вклад! Пожалуйста:

1. Форкните репозиторий
2. Создайте feature-ветку (`git checkout -b feat/my-feature`)
3. Используйте [Conventional Commits](https://www.conventionalcommits.org/) для сообщений коммитов
4. Запустите `npm run typecheck && npm run test` перед отправкой
5. Откройте Pull Request

---

## 📄 Лицензия

[MIT](LICENSE) © codewiki-mcp contributors
