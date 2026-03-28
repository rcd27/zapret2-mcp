# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Описание проекта

Knowledge MCP-сервер для zapret2 (инструмент DPI bypass от bol-van) и blockcheckw (быстрый сканер стратегий от rcd27). Предоставляет LLM-агентам контекстную документацию и экспертные знания через Model Context Protocol. Сервер НЕ выполняет команды — он отдаёт знания, а агент-потребитель выполняет команды самостоятельно.

## Сборка и запуск

```bash
npm install
npm run build    # TypeScript → build/
npm start        # build + запуск сервера
npm run dev      # запуск через MCP Inspector
npm test         # unit-тесты
npm run test:integration  # интеграционные тесты
```

## Архитектура

### Ядро

- `src/index.ts` — точка входа: McpServer, один tool `query-zapret-knowledge`, промпты, StdioTransport
- `src/indexer.ts` — `KnowledgeIndex`: индексация `knowledge/**/*.md`, keyword-based поиск с ранжированием
- `src/prompts.ts` — 4 MCP Prompt workflow-а

### База знаний (`knowledge/`)

Markdown-файлы с frontmatter (title, tags, версии). Индексируются при старте сервера.

```
knowledge/
├── strategies/        # TCP segmentation, fake packets, HTTP, UDP/QUIC, orchestration, DPI types
├── config/           # nfqws2 CLI reference, zapret2 config file
├── workflows/        # Установка, поиск стратегии
├── blockcheckw/      # Overview и команды blockcheckw
├── platforms/        # Поддерживаемые платформы
└── troubleshooting/  # Диагностика проблем
```

### Reference субмодули

```
reference/
├── zapret2/          # git submodule: bol-van/zapret2 (v0.9.4.5)
└── blockcheckw/      # git submodule: rcd27/blockcheckw (v0.8.3)
```

Обновление знаний: обновить субмодуль → пересмотреть knowledge/ → обновить версии в frontmatter.

### MCP Tool (1)

- `query-zapret-knowledge(topic, tokens?)` — keyword-поиск по базе знаний, возвращает релевантные статьи с ранжированием

### MCP Prompts (4)

- `setup-zapret` — пошаговая установка (universal)
- `find-bypass-strategy` — поиск стратегии через blockcheckw
- `troubleshoot` — диагностика проблем
- `strategy-knowledge` — справочник по стратегиям DPI bypass

### Формат knowledge-файлов

```markdown
---
title: Название статьи
zapret2-version: v0.9.4.5
blockcheckw-version: v0.8.3
tags: tag1, tag2, tag3
---

# Содержимое в Markdown
```

### Поиск (KnowledgeIndex)

- Keyword-based с весами: title match (10) > tag exact (8) > tag partial (4) > content occurrences (2 × count, cap 5)
- Токенизация: lowercase, Unicode-aware, минимальная длина 2 символа
- Token limit: приблизительно 4 chars/token, обрезка по суммарному размеру

### Паттерны MCP SDK (@modelcontextprotocol/sdk ^1.6)

- Для интеграционных тестов: `Client` + `StdioClientTransport` из SDK, подключение к `node build/index.js`
- `InMemoryTransport.createLinkedPair()` для unit-тестов промптов

## Зависимости

- `@modelcontextprotocol/sdk: ^1.6.0`
- `zod: ^3.24.0`

## Лицензия

MIT
